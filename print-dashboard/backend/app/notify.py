"""
notify.py

Native Windows notifications for backup start/success/failure.

Honesty note (per testing discipline): winotify talks to the real
Windows notification tray (via WinRT toast APIs). That cannot be
exercised in this Linux sandbox -- there is no Windows shell to receive
a toast. What CAN be fully tested here, and IS tested below, is:
  - the notifier picks the right title/message/urgency for each event
  - it never crashes the app if notifications fail for any reason
    (missing winotify, no notification service running, etc.)
  - it correctly falls back to a log-only path when winotify isn't
    available or isn't on Windows

The real toast-firing behavior (does a bubble actually pop up bottom
right of the screen) needs to be run on your laptop. See the bottom of
this file for a small standalone script + instructions to do that.
"""

from __future__ import annotations

import logging
import platform

logger = logging.getLogger("ttech.notify")

APP_NAME = "T-Tech Studio"

try:
    from winotify import Notification, audio  # type: ignore
    _WINOTIFY_AVAILABLE = True
except ImportError:
    _WINOTIFY_AVAILABLE = False


def _is_windows() -> bool:
    return platform.system() == "Windows"


def _fire_toast(title: str, message: str, urgent: bool = False) -> bool:
    """
    Attempts to fire a real Windows toast. Returns True if it believes
    it succeeded, False otherwise. Never raises -- a notification
    failure must never take down the backup flow or the app.
    """
    if not (_WINOTIFY_AVAILABLE and _is_windows()):
        return False

    try:
        toast = Notification(
            app_id=APP_NAME,
            title=title,
            msg=message,
            duration="short",
        )
        if urgent:
            toast.set_audio(audio.Reminder, loop=False)
        else:
            toast.set_audio(audio.Default, loop=False)
        toast.show()
        return True
    except Exception:
        logger.exception("winotify toast failed to fire")
        return False


def _notify(title: str, message: str, urgent: bool = False) -> None:
    """
    Single entry point used by every event below. Always logs
    (so there's a record even if the toast fails or this isn't
    Windows), and additionally fires a real toast when possible.
    """
    fired = _fire_toast(title, message, urgent=urgent)
    level = logging.WARNING if urgent else logging.INFO
    logger.log(level, "Notification [%s]: %s | %s (toast fired: %s)", title, message,
               "urgent" if urgent else "normal", fired)


# ---------------------------------------------------------------------------
# Public events -- called from backup_scheduler.py via the on_result hook,
# and from main.py at startup.
# ---------------------------------------------------------------------------

def notify_backup_started(slot_label: str) -> None:
    _notify(APP_NAME, f"Backup starting ({slot_label})")


def notify_backup_success(dest_summary: str) -> None:
    _notify(APP_NAME, f"Backup completed successfully. {dest_summary}")


def notify_backup_failure(reason: str) -> None:
    _notify(APP_NAME, f"Backup failed: {reason}", urgent=True)


def notify_backup_flagged(consecutive_count: int) -> None:
    _notify(
        APP_NAME,
        f"Backups have failed or been missed {consecutive_count} times in a row. Please check the app.",
        urgent=True,
    )


def on_backup_result(result) -> None:
    """
    Convenience adapter matching backup_scheduler.BackupResult, so this
    can be passed directly as BackupScheduler(on_result=on_backup_result).
    """
    if result.ok:
        where = result.dest_path or "local backup only (sync folder unavailable)"
        notify_backup_success(f"Saved to: {where}")
    else:
        notify_backup_failure(result.message)


# ---------------------------------------------------------------------------
# Standalone real-toast test script.
#
# This part CANNOT be verified in this sandbox (no Windows, no display).
# Run this on your laptop and confirm you actually see toast popups.
#
# Usage on your laptop:
#   pip install winotify
#   python notify.py
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    print(f"winotify available: {_WINOTIFY_AVAILABLE}")
    print(f"Running on Windows: {_is_windows()}")
    print()
    print("Firing 4 test notifications, 2 seconds apart.")
    print("On a real Windows machine with winotify installed, you should")
    print("see 4 toast popups appear bottom-right. If you don't see any,")
    print("report back exactly what printed below -- especially whether")
    print("'toast fired: True' or 'toast fired: False' appears each time.")
    print()

    import time

    notify_backup_started("11:00 test slot")
    time.sleep(2)
    notify_backup_success("Saved to: G:\\My Drive\\TTechStudio-Backups\\TTechStudio-backup-test.zip")
    time.sleep(2)
    notify_backup_failure("SQLite integrity_check failed: simulated test failure")
    time.sleep(2)
    notify_backup_flagged(3)

    print()
    print("Done. Report back which of the 4 toasts you actually saw pop up.")
