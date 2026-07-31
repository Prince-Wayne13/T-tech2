"""
restore_inspector.py

First slice of the restore engine: read-only discovery and preview of
existing backups. Deliberately does NOT touch the live database or
write anything -- it only lists what's sitting in the shared backup
folder and reports what's inside a chosen backup zip, so this can be
tested safely before any merge/swap-into-place logic exists.

Reuses backup_scheduler.py's already-tested building blocks directly
(detect_sync_folder, verify_backup_zip, BACKUP_SUBFOLDER) rather than
re-implementing folder/zip handling, so this stays consistent with how
backups are actually written.

Two entry points:
  list_available_backups(sync_fallback_dir) -> list[BackupEntry]
      Scans TTechStudio-Backups/<device_id>/ for every device folder
      found under the detected sync root, and every zip inside each.

  preview_backup(zip_path) -> BackupPreview
      Verifies the zip (same two-layer check backup_scheduler.py uses
      before trusting a backup), then opens the embedded app.db
      read-only and reports a row count per table plus the most recent
      updated_at seen across all TimestampMixin tables -- enough to
      answer "what's actually in this backup" without restoring it.
"""

from __future__ import annotations

import os
import sqlite3
import tempfile
import zipfile
from dataclasses import dataclass, field
from datetime import datetime

from .backup_scheduler import (
    BACKUP_SUBFOLDER,
    detect_sync_folder,
    verify_backup_zip,
)

# Tables that carry device_id + updated_at (see ensure_device_ownership_schema
# in schema_migrations.py for the authoritative list) -- used here only to
# report "most recent activity in this backup", not to restore anything.
TIMESTAMPED_TABLES = [
    "clients", "vendors", "capabilities", "production_machines",
    "pricing_items", "materials", "material_transactions", "jobs",
    "invoices", "invoice_line_items", "payments", "proposals",
    "proposal_line_items", "expense_categories", "expenses",
    "advances", "export_jobs", "staff", "sales", "petty_cash_entries",
]


@dataclass
class BackupEntry:
    device_id: str
    filename: str
    full_path: str
    size_bytes: int
    modified_at: str  # ISO timestamp, from the file's mtime on disk

    def to_dict(self) -> dict:
        return {
            "device_id": self.device_id,
            "filename": self.filename,
            "full_path": self.full_path,
            "size_bytes": self.size_bytes,
            "modified_at": self.modified_at,
        }


@dataclass
class BackupPreview:
    ok: bool
    message: str
    zip_path: str
    table_counts: dict = field(default_factory=dict)
    most_recent_updated_at: str | None = None

    def to_dict(self) -> dict:
        return {
            "ok": self.ok,
            "message": self.message,
            "zip_path": self.zip_path,
            "table_counts": self.table_counts,
            "most_recent_updated_at": self.most_recent_updated_at,
        }


def list_available_backups(sync_fallback_dir: str, latest_only: bool = True) -> list[BackupEntry]:
    """Scans every device subfolder under TTechStudio-Backups/ for zip
    files. Returns an empty list (not an error) if the backup folder
    doesn't exist yet -- e.g. brand-new install, no backup has run yet.

    latest_only (decision #3, 2026-07-31): when True (the default), only
    the single newest backup per device is returned -- previously every
    backup ever made showed up, so a device that had been backing up for
    weeks cluttered the list with dozens of old entries for the same
    machine. Pass False to get the full history (e.g. for a future
    "restore from an older point" feature).
    """
    sync_root, _is_real = detect_sync_folder(sync_fallback_dir)
    backups_root = os.path.join(sync_root, BACKUP_SUBFOLDER)

    entries: list[BackupEntry] = []
    if not os.path.isdir(backups_root):
        return entries

    for device_id in sorted(os.listdir(backups_root)):
        device_dir = os.path.join(backups_root, device_id)
        if not os.path.isdir(device_dir):
            continue
        for filename in sorted(os.listdir(device_dir)):
            if not filename.lower().endswith(".zip"):
                continue
            full_path = os.path.join(device_dir, filename)
            stat = os.stat(full_path)
            entries.append(
                BackupEntry(
                    device_id=device_id,
                    filename=filename,
                    full_path=full_path,
                    size_bytes=stat.st_size,
                    modified_at=datetime.fromtimestamp(stat.st_mtime).isoformat(),
                )
            )

    # Newest first across all devices, so the frontend's default view
    # is "what changed most recently, from any machine".
    entries.sort(key=lambda e: e.modified_at, reverse=True)

    if latest_only:
        seen_devices = set()
        deduped = []
        for entry in entries:
            if entry.device_id in seen_devices:
                continue
            seen_devices.add(entry.device_id)
            deduped.append(entry)
        entries = deduped

    return entries


def preview_backup(zip_path: str, expected_db_name: str = "app.db") -> BackupPreview:
    """Verifies the zip, then opens the embedded database read-only
    (via a temporary extraction, never the original file) and reports
    a row count per table plus the most recent updated_at found across
    every TimestampMixin table. Never raises -- any failure comes back
    as ok=False with a message, matching verify_backup_zip's own
    never-raise contract.
    """
    ok, message = verify_backup_zip(zip_path, expected_db_name=expected_db_name)
    if not ok:
        return BackupPreview(ok=False, message=message, zip_path=zip_path)

    try:
        with zipfile.ZipFile(zip_path, "r") as zf:
            with tempfile.TemporaryDirectory() as tmpdir:
                zf.extractall(tmpdir)
                db_path = os.path.join(tmpdir, expected_db_name)

                conn = sqlite3.connect(db_path)
                conn.row_factory = sqlite3.Row
                try:
                    table_counts = {}
                    most_recent: str | None = None

                    existing_tables = {
                        row[0]
                        for row in conn.execute(
                            "SELECT name FROM sqlite_master WHERE type='table'"
                        ).fetchall()
                    }

                    for table in TIMESTAMPED_TABLES:
                        if table not in existing_tables:
                            continue
                        count = conn.execute(
                            f"SELECT COUNT(*) FROM {table}"
                        ).fetchone()[0]
                        table_counts[table] = count

                        columns = {
                            row[1]
                            for row in conn.execute(f"PRAGMA table_info({table})").fetchall()
                        }
                        if "updated_at" in columns and count > 0:
                            row_max = conn.execute(
                                f"SELECT MAX(updated_at) FROM {table}"
                            ).fetchone()[0]
                            if row_max and (most_recent is None or row_max > most_recent):
                                most_recent = row_max

                    return BackupPreview(
                        ok=True,
                        message="Backup verified and read successfully.",
                        zip_path=zip_path,
                        table_counts=table_counts,
                        most_recent_updated_at=most_recent,
                    )
                finally:
                    conn.close()
    except (zipfile.BadZipFile, OSError, sqlite3.DatabaseError) as e:
        return BackupPreview(
            ok=False,
            message=f"Could not read backup contents: {e}",
            zip_path=zip_path,
        )