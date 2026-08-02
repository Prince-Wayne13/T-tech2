"""
reports_backup.py

Builds a weekly package of the business reports (cashflow, income
statement, and the other analytics already shown in the app), turns
them into real PDF files via report_pdf.py (reportlab), zips them into
a single password-protected file, and sends that zip to the detected
cloud-sync folder (Google Drive / OneDrive / Dropbox) ONLY -- it is
never kept as a local copy, unlike the regular database backup.

Status tracking, in plain terms:
  - "inactive"  -- a report was already sent this week; not due yet.
  - "sent"      -- the state right after a send just happened.
  - due again   -- once 7 full days have passed since the last send,
                   the weekly automatic run OR the manual button
                   (whichever happens first) will send the next one.

This mirrors the backup_scheduler.py pattern (a lock so manual and
scheduled runs can't overlap, a background thread, a result object)
but is a separate, independent system from the database backup --
reports have their own weekly timing and their own destination rule
(Drive-only, encrypted, no local copy).
"""

from __future__ import annotations

import json
import logging
import os
import tempfile
import threading
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path

import pyzipper

logger = logging.getLogger("ttech.reports_backup")

REPORTS_SUBFOLDER = "TTechStudio-Reports"
WEEK = timedelta(days=7)

# Fixed password for the encrypted reports zip, per explicit instruction.
# Anyone opening this zip later (e.g. in 7-Zip or WinRAR) will be asked
# for this password.
ZIP_PASSWORD = b"talu1310"


@dataclass
class ReportsSendResult:
    ok: bool
    message: str
    dest_path: str | None = None
    timestamp: datetime = field(default_factory=datetime.now)


def build_report_pdf_files(tmp_dir: Path) -> list[Path]:
    """
    Pulls the real analytics already used elsewhere in the app (same
    functions the on-screen Reports page calls) and writes each one out
    as its own HTML file inside tmp_dir. Returns the list of file paths
    written, ready to be zipped.
    """
    from .report_pdf import build_analytics_pdf, build_cashflow_pdf, build_income_statement_pdf
    from .services.reports import (
        build_dashboard_summary,
        build_financial_report,
        build_job_throughput,
        build_quantity_produced,
    )

    financials = build_financial_report()
    dashboard = build_dashboard_summary()
    quantity_produced = build_quantity_produced()
    job_throughput = build_job_throughput()

    files_written = []

    path = tmp_dir / "income-statement.pdf"
    build_income_statement_pdf(financials, path)
    files_written.append(path)

    path = tmp_dir / "cashflow.pdf"
    build_cashflow_pdf(financials, dashboard, path)
    files_written.append(path)

    path = tmp_dir / "analytics.pdf"
    build_analytics_pdf(dashboard, financials, quantity_produced, job_throughput, path)
    files_written.append(path)

    return files_written


def zip_and_encrypt(pdf_files: list[Path], zip_path: Path) -> None:
    """
    Zips the given PDF files into a single password-protected archive
    using real AES-256 encryption (not the old, weak ZipCrypto that
    plain `zipfile` only supports). Opening it later (7-Zip, WinRAR,
    etc.) will ask for the password.
    """
    with pyzipper.AESZipFile(
        zip_path, "w", compression=pyzipper.ZIP_DEFLATED, encryption=pyzipper.WZ_AES
    ) as zf:
        zf.setpassword(ZIP_PASSWORD)
        for pdf_file in pdf_files:
            zf.write(pdf_file, arcname=pdf_file.name)


class WeeklyReportsScheduler:
    """
    Weekly, Drive-only, encrypted reports package. Independent of
    BackupScheduler (separate timing rule, separate destination rule),
    but follows the same shape: a lock so manual + automatic runs
    can't overlap, a status file so the "last sent" date survives an
    app restart, and a background thread that checks periodically.
    """

    def __init__(self, sync_fallback_dir: str, status_file_path: str, flask_app=None, on_result=None, check_interval_seconds: int = 60):
        self.sync_fallback_dir = sync_fallback_dir
        self.status_file_path = Path(status_file_path)
        self.flask_app = flask_app  # needed so the background thread can open its own app context before touching the database
        self.on_result = on_result
        self.check_interval_seconds = check_interval_seconds

        self._lock = threading.Lock()
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None

    # -- status persistence -------------------------------------------

    def _read_status(self) -> dict:
        if not self.status_file_path.exists():
            return {"status": "inactive", "last_sent": None}
        try:
            return json.loads(self.status_file_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            logger.warning("Could not read reports status file, treating as never sent")
            return {"status": "inactive", "last_sent": None}

    def _write_status(self, status: str, last_sent: datetime | None) -> None:
        self.status_file_path.parent.mkdir(parents=True, exist_ok=True)
        self.status_file_path.write_text(
            json.dumps({
                "status": status,
                "last_sent": last_sent.isoformat() if last_sent else None,
            }),
            encoding="utf-8",
        )

    def get_status(self) -> dict:
        """
        Returns the current state plus whether a send is due right now,
        for the manual button / status endpoint to check. Status is
        "inactive" (already sent this week, blocked), "sent" (a send
        just completed and hasn't rolled over into a new week check
        yet), or "due" (7 days have passed, ready for the next send).
        """
        state = self._read_status()
        last_sent_str = state.get("last_sent")

        if not last_sent_str:
            return {"status": "due", "last_sent": None, "next_due": None}

        last_sent = datetime.fromisoformat(last_sent_str)
        next_due = last_sent + WEEK
        is_due = datetime.now() >= next_due

        return {
            "status": "due" if is_due else state.get("status", "inactive"),
            "last_sent": last_sent_str,
            "next_due": next_due.isoformat(),
        }

    # -- public control -----------------------------------------------

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        logger.info("Weekly reports scheduler started")

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=5)

    def send_now(self, reason: str = "manual") -> ReportsSendResult:
        """
        Sends the weekly reports package right now, regardless of
        whether the automatic weekly check has fired yet -- the
        "whichever happens first" rule. Guarded by the same lock as
        the automatic path so the two can never run at once.
        """
        with self._lock:
            logger.info("Reports package starting (%s)", reason)
            result = self._execute_reports_cycle()
            if result.ok:
                self._write_status("sent", result.timestamp)
            if self.on_result:
                try:
                    self.on_result(result)
                except Exception:
                    logger.exception("on_result callback raised while handling reports result")
            return result

    # -- internal loop --------------------------------------------------

    def _run_loop(self) -> None:
        while not self._stop_event.is_set():
            status = self.get_status()
            if status["status"] == "due":
                with self._lock:
                    logger.info("Reports package starting (weekly automatic)")
                    result = self._execute_reports_cycle()
                    if result.ok:
                        self._write_status("sent", result.timestamp)
                    if self.on_result:
                        try:
                            self.on_result(result)
                        except Exception:
                            logger.exception("on_result callback raised while handling reports result")
            self._stop_event.wait(self.check_interval_seconds)

    # -- the actual cycle -------------------------------------------------

    def _execute_reports_cycle(self) -> ReportsSendResult:
        if self.flask_app is not None:
            with self.flask_app.app_context():
                return self._execute_reports_cycle_inner()
        return self._execute_reports_cycle_inner()

    def _execute_reports_cycle_inner(self) -> ReportsSendResult:
        try:
            from .backup_scheduler import check_disk_space, detect_sync_folder

            with tempfile.TemporaryDirectory() as tmp:
                tmp_dir = Path(tmp)
                pdf_files = build_report_pdf_files(tmp_dir)

                timestamp = datetime.now().strftime("%Y-%m-%d-%H%M")
                zip_path = tmp_dir / f"TTechStudio-Reports-{timestamp}.zip"
                zip_and_encrypt(pdf_files, zip_path)

                sync_folder, is_real = detect_sync_folder(self.sync_fallback_dir)

                if not check_disk_space(sync_folder):
                    msg = "Not enough disk space at the Drive destination -- reports send skipped this cycle"
                    logger.warning(msg)
                    return ReportsSendResult(ok=False, message=msg)

                dest_dir = os.path.join(sync_folder, REPORTS_SUBFOLDER)
                os.makedirs(dest_dir, exist_ok=True)
                dest_path = os.path.join(dest_dir, zip_path.name)

                # Copy straight into the Drive folder -- there is
                # deliberately no local copy kept anywhere else, per
                # explicit instruction that this goes to Drive only.
                import shutil
                shutil.copy2(zip_path, dest_path)

                logger.info("Encrypted weekly reports package sent to Drive: %s", dest_path)
                return ReportsSendResult(ok=True, message="Reports package sent", dest_path=dest_path)

        except Exception as e:
            logger.exception("Unexpected error building/sending weekly reports package")
            return ReportsSendResult(ok=False, message=f"Unexpected error: {e}")
