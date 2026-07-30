"""
backup_scheduler.py

Fixed-time backup scheduler for T-Tech Studio.

Ports the proven, already-tested logic from:
  - ttech-feature-tests/backup_local/test_local_backup.py
    (safe SQLite snapshot via backup API, zip, two-layer verification:
     zip integrity + PRAGMA integrity_check, size sanity check)
  - ttech-feature-tests/backup_drive/test_drive_backup.py
    (auto-detect a synced cloud folder on disk, copy verified zip into
     it -- no Drive/OneDrive API involved, their own sync client does
     the uploading)

New in this pass, per explicit user decisions:
  - Fixed backup times: 09:00, 11:00, 15:00, 18:00 (testing config,
    easy to change -- see BACKUP_TIMES below). NOT a rolling 24h timer.
  - A slot missed while the app is closed is logged, not retried.
  - 3 consecutive failures/misses raises a flagged log entry.
  - Manual "Backup Now" trigger, independent of the schedule, that
    runs the exact same verified cycle on demand.
  - Logs are copied to the SAME Drive root as backups, but into a
    SEPARATE subfolder (TTechStudio-Logs/), never mixed with the
    database backup zips (TTechStudio-Backups/).

This module has no Flask/pywebview dependency -- it's a plain background
scheduler thread so it can be started from main.py and also invoked
directly (manual button) without needing the web layer running.
"""

from __future__ import annotations

import glob
import logging
import os
import shutil
import sqlite3
import tempfile
import threading
import time
import zipfile
from dataclasses import dataclass, field
from datetime import datetime, date, time as dtime

logger = logging.getLogger("ttech.backup")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

# Fixed daily backup times (24h clock). Testing config per user request
# -- set close together (00:35 / 00:45 / 00:55) so you can watch backups
# actually fire during a normal testing session without waiting hours.
# Change back to the real daily times (e.g. 09:00 / 11:00 / 15:00 / 18:00)
# before the office install.
BACKUP_TIMES = [
    dtime(0, 35),
    dtime(0, 45),
    dtime(0, 55),
]

BACKUP_SUBFOLDER = "TTechStudio-Backups"
LOGS_SUBFOLDER = "TTechStudio-Logs"

CONSECUTIVE_FAILURE_ALERT_THRESHOLD = 3

# Candidate synced-cloud-folder locations, in priority order. Different
# laptops set these up differently -- Google Drive can mount as its own
# drive letter (commonly G:, chosen during setup) OR as a folder under
# the signed-in Windows user's own folder, and OneDrive's folder name
# often includes the company name for a work account rather than
# plain "OneDrive". This list tries the most likely spots in order and
# uses whichever one is actually found on THIS computer -- nothing
# here assumes a specific laptop.
REAL_CANDIDATE_PATHS = [
    r"H:\My Drive",
    r"H:\\",
    r"G:\My Drive",  # added for testing - Google Drive shows up as G: on the other machine
    r"G:\\",
    os.path.expanduser("~/My Drive"),
    os.path.expanduser("~/Google Drive"),
    os.path.expanduser("~/GoogleDrive"),
    os.path.expanduser("~/OneDrive"),
    os.path.expanduser("~/OneDrive - " + os.environ.get("USERDOMAIN", "")) if os.environ.get("USERDOMAIN") else None,
    os.path.expanduser("~/Dropbox"),
]
REAL_CANDIDATE_PATHS = [p for p in REAL_CANDIDATE_PATHS if p]  # drop the OneDrive-company entry when there's no domain to build it from


@dataclass
class BackupResult:
    ok: bool
    message: str
    zip_path: str | None = None
    dest_path: str | None = None
    log_copy_path: str | None = None
    timestamp: datetime = field(default_factory=datetime.now)


# ---------------------------------------------------------------------------
# Sync folder detection (ported from test_drive_backup.py, unchanged logic)
# ---------------------------------------------------------------------------

def detect_sync_folder(fallback_dir: str) -> tuple[str, bool]:
    """
    Returns (path, is_real). is_real tells you whether this is an actual
    detected cloud folder or a local fallback (e.g. no Drive/OneDrive/
    Dropbox signed in on this machine).
    """
    for path in REAL_CANDIDATE_PATHS:
        if os.path.isdir(path):
            return path, True

    os.makedirs(fallback_dir, exist_ok=True)
    return fallback_dir, False


def check_disk_space(path: str, minimum_mb: int = 100) -> bool:
    usage = shutil.disk_usage(path)
    free_mb = usage.free / (1024 * 1024)
    return free_mb >= minimum_mb


# ---------------------------------------------------------------------------
# Local backup + two-layer verification (ported from test_local_backup.py)
# ---------------------------------------------------------------------------

def safe_sqlite_snapshot(source_path: str, dest_path: str) -> None:
    """
    Uses SQLite's own backup API instead of a raw file copy, so a
    mid-write moment can't corrupt the snapshot.
    """
    src = sqlite3.connect(source_path)
    dst = sqlite3.connect(dest_path)
    with dst:
        src.backup(dst)
    src.close()
    dst.close()


def verify_backup_zip(zip_path: str, expected_db_name: str = "app.db") -> tuple[bool, str]:
    """
    Two-layer verification: zip integrity, then PRAGMA integrity_check.
    Never raises -- a torn/corrupted/non-zip file is a FAILED verification
    result, not a crash. (Caught by testing: a raw-bytes "corrupted zip"
    input originally raised zipfile.BadZipFile uncaught.)
    """
    try:
        with zipfile.ZipFile(zip_path, "r") as zf:
            bad_file = zf.testzip()
            if bad_file is not None:
                return False, f"Zip integrity check failed on member: {bad_file}"

            with tempfile.TemporaryDirectory() as tmpdir:
                zf.extractall(tmpdir)
                extracted_db = os.path.join(tmpdir, expected_db_name)

                if not os.path.exists(extracted_db):
                    return False, f"{expected_db_name} not found inside backup zip"

                conn = sqlite3.connect(extracted_db)
                try:
                    result = conn.execute("PRAGMA integrity_check").fetchone()
                    conn.close()
                    if result[0] != "ok":
                        return False, f"SQLite integrity_check failed: {result[0]}"
                except sqlite3.DatabaseError as e:
                    conn.close()
                    return False, f"Could not open extracted database: {e}"

    except zipfile.BadZipFile:
        return False, "Backup file is not a valid zip (corrupted or truncated)"
    except OSError as e:
        return False, f"Could not read backup zip: {e}"

    return True, "Zip OK, SQLite integrity_check OK"


def size_is_reasonable(zip_path: str, previous_sizes: list[int]) -> bool:
    size = os.path.getsize(zip_path)
    if not previous_sizes:
        return True
    avg = sum(previous_sizes) / len(previous_sizes)
    return size >= avg * 0.1


def copy_into_subfolder(src_path: str, sync_root: str, subfolder: str, device_subfolder: str | None = None) -> str:
    """Copies src_path into sync_root/subfolder/, or sync_root/subfolder/
    device_subfolder/ when device_subfolder is given -- e.g.
    TTechStudio-Backups/OFFICE-PC-4F32/TTechStudio-backup-....zip, so
    each device's own backups land in their own clearly-separated
    folder rather than one shared pile every machine writes into."""
    dest_dir = os.path.join(sync_root, subfolder)
    if device_subfolder:
        dest_dir = os.path.join(dest_dir, device_subfolder)
    os.makedirs(dest_dir, exist_ok=True)
    dest_path = os.path.join(dest_dir, os.path.basename(src_path))
    shutil.copy2(src_path, dest_path)
    return dest_path


# ---------------------------------------------------------------------------
# Scheduler
# ---------------------------------------------------------------------------

class BackupScheduler:
    """
    Fixed-time backup scheduler. Runs in a background thread started
    from main.py. Also exposes run_backup_now() for the manual button,
    which runs the identical cycle outside the schedule.
    """

    def __init__(
        self,
        source_db_path: str,
        local_backup_dir: str,
        log_file_path: str | None,
        sync_fallback_dir: str,
        device_id: str | None = None,
        on_result=None,
        check_interval_seconds: int = 30,
    ):
        self.source_db_path = source_db_path
        self.local_backup_dir = local_backup_dir
        self.log_file_path = log_file_path
        self.sync_fallback_dir = sync_fallback_dir
        # Cross-device backup/restore: which physical machine this
        # scheduler instance is running on. Used to write this device's
        # backups into their OWN subfolder inside the shared synced
        # backup folder (TTechStudio-Backups/<device_id>/...) instead of
        # one flat folder every device dumps into -- restore logic reads
        # every device's subfolder separately rather than guessing which
        # zip in a mixed pile came from which machine. None is accepted
        # (falls back to the old flat-folder behavior) only for backward
        # compatibility with any caller not yet passing a device id --
        # main.py's real startup sequence always passes one.
        self.device_id = device_id
        self.on_result = on_result  # optional callback(BackupResult) -- e.g. notify.py
        self.check_interval_seconds = check_interval_seconds

        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None
        self._lock = threading.Lock()  # prevents manual + scheduled overlap

        self._last_run_date: date | None = None
        self._fired_slots_today: set[dtime] = set()
        self._consecutive_failures = 0

    # -- public control -----------------------------------------------

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        logger.info("Backup scheduler started. Slots: %s", [t.strftime("%H:%M") for t in BACKUP_TIMES])

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=5)

    def run_backup_now(self, reason: str = "manual") -> BackupResult:
        """Manual trigger -- e.g. the 'Backup Now' button. Same verified
        cycle as a scheduled run, just invoked on demand."""
        with self._lock:
            logger.info("Backup starting (%s)", reason)
            result = self._execute_backup_cycle()
            self._handle_result(result)
            return result

    # -- internal loop --------------------------------------------------

    def _run_loop(self) -> None:
        while not self._stop_event.is_set():
            now = datetime.now()
            today = now.date()

            if today != self._last_run_date:
                if self._last_run_date is not None:
                    # A real new day compared to a day we were already
                    # tracking: any of yesterday's slots that never
                    # fired (app was closed) get logged as missed, not
                    # retried. Compute this BEFORE clearing the set.
                    missed = [t for t in BACKUP_TIMES if t not in self._fired_slots_today]
                    for t in missed:
                        self._log_missed_slot(t)
                    self._fired_slots_today = set()
                else:
                    # This is the very first day this scheduler has
                    # run (app just started). Any slot whose time has
                    # already passed today was missed while the app
                    # wasn't running yet -- log it as missed, don't
                    # fire it late. Only slots still ahead today stay
                    # eligible to fire normally below.
                    self._fired_slots_today = set()
                    already_passed = [t for t in BACKUP_TIMES if now.time() >= t]
                    for t in already_passed:
                        self._log_missed_slot(t)
                        self._fired_slots_today.add(t)

                self._last_run_date = today

            for slot in BACKUP_TIMES:
                if slot in self._fired_slots_today:
                    continue
                if now.time() >= slot:
                    self._fired_slots_today.add(slot)
                    with self._lock:
                        logger.info("Backup starting (scheduled slot: %s)", slot.strftime("%H:%M"))
                        result = self._execute_backup_cycle()
                        self._handle_result(result)

            self._stop_event.wait(self.check_interval_seconds)

    def _log_missed_slot(self, slot: dtime) -> None:
        logger.warning("Backup slot missed (app was not running): %s", slot.strftime("%H:%M"))
        self._consecutive_failures += 1
        self._raise_alert_if_needed()

    def _handle_result(self, result: BackupResult) -> None:
        if result.ok:
            self._consecutive_failures = 0
        else:
            self._consecutive_failures += 1
            self._raise_alert_if_needed()

        if self.on_result:
            try:
                self.on_result(result)
            except Exception:
                logger.exception("on_result callback raised while handling backup result")

    def _raise_alert_if_needed(self) -> None:
        if self._consecutive_failures >= CONSECUTIVE_FAILURE_ALERT_THRESHOLD:
            logger.error(
                "FLAGGED: %d consecutive backup failures/misses -- needs attention",
                self._consecutive_failures,
            )

    # -- the actual cycle -------------------------------------------------

    def _execute_backup_cycle(self) -> BackupResult:
        try:
            os.makedirs(self.local_backup_dir, exist_ok=True)

            if not os.path.exists(self.source_db_path):
                msg = f"Source database not found at {self.source_db_path}"
                logger.error(msg)
                return BackupResult(ok=False, message=msg)

            timestamp = datetime.now().strftime("%Y-%m-%d-%H%M")
            snapshot_path = os.path.join(self.local_backup_dir, f"app-{timestamp}.db")
            zip_path = os.path.join(self.local_backup_dir, f"TTechStudio-backup-{timestamp}.zip")

            safe_sqlite_snapshot(self.source_db_path, snapshot_path)

            with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
                zf.write(snapshot_path, arcname="app.db")
            os.remove(snapshot_path)

            ok, message = verify_backup_zip(zip_path)

            existing_zips = [
                os.path.join(self.local_backup_dir, f)
                for f in os.listdir(self.local_backup_dir)
                if f.endswith(".zip") and f != os.path.basename(zip_path)
            ]
            previous_sizes = [os.path.getsize(p) for p in existing_zips]
            size_ok = size_is_reasonable(zip_path, previous_sizes)

            if not (ok and size_ok):
                reason = message if not ok else "backup size looks abnormally small vs. recent backups"
                logger.warning("Backup FAILED at verification step: %s", reason)
                return BackupResult(ok=False, message=reason, zip_path=zip_path)

            logger.info("Backup zip created: %s", os.path.basename(zip_path))
            logger.info("Backup verified: zip OK, sqlite integrity_check OK, size within expected range")

            # Copy DB backup + log file to sync folder -- SEPARATE subfolders.
            sync_folder, is_real = detect_sync_folder(self.sync_fallback_dir)

            if not check_disk_space(sync_folder):
                msg = "Not enough disk space at sync destination -- skipping copy step this cycle"
                logger.warning(msg)
                return BackupResult(ok=False, message=msg, zip_path=zip_path)

            dest_path = copy_into_subfolder(zip_path, sync_folder, BACKUP_SUBFOLDER, device_subfolder=self.device_id)
            logger.info("Backup copied to synced folder: %s", dest_path)

            log_copy_path = None
            if self.log_file_path and os.path.exists(self.log_file_path):
                log_copy_path = copy_into_subfolder(self.log_file_path, sync_folder, LOGS_SUBFOLDER, device_subfolder=self.device_id)
                logger.info("Log file copied to synced folder: %s", log_copy_path)

            logger.info("Backup complete")
            return BackupResult(
                ok=True,
                message="Backup complete",
                zip_path=zip_path,
                dest_path=dest_path,
                log_copy_path=log_copy_path,
            )

        except Exception as e:
            logger.exception("Unexpected error during backup cycle")
            return BackupResult(ok=False, message=f"Unexpected error: {e}")