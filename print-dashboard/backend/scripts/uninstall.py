"""
uninstall.py

A single, explicit "remove everything" command for T-Tech Studio,
covering both auto-start methods this project can end up using:

  - If installed via the Inno Setup installer (installer.iss) with the
    "start automatically when I log in" box ticked: that's a Registry
    Run-key entry, and Inno Setup's own generated uninstaller already
    removes it correctly by itself. Running the normal Windows
    "Uninstall T-Tech Studio" (from the Start Menu or Windows Settings
    > Apps) is enough on its own for that case.

  - If auto-start was instead set up by hand via
    scripts\\register_autostart.py (a Windows Scheduled Task, a
    separate mechanism the Inno Setup uninstaller has no knowledge
    of): that task would be left behind after a plain uninstall,
    silently trying to reopen an app that no longer exists. This
    script explicitly removes that scheduled task too.

This script deliberately does NOT delete the real business database
or the local backup files (C:\\ProgramData\\TTechStudio) -- normal
uninstalling is meant to remove the PROGRAM, not the business's data,
the same principle installer.iss follows. See --wipe-data below if a
full, permanent wipe is genuinely wanted (e.g. decommissioning a
machine entirely).

Usage:
    python scripts\\uninstall.py
        Removes the TTechStudioAutoStart scheduled task (if it
        exists) and tells you how to finish uninstalling the program
        itself via Windows.

    python scripts\\uninstall.py --wipe-data
        Does the above, AND permanently deletes the database, backups,
        and logs at C:\\ProgramData\\TTechStudio. Asks for typed
        confirmation first. There is no undo for this.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

TASK_NAME = "TTechStudioAutoStart"


def remove_scheduled_task() -> None:
    result = subprocess.run(
        ["schtasks", "/Query", "/TN", TASK_NAME],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        print(f"No '{TASK_NAME}' scheduled task found (nothing to remove here).")
        return

    print(f"Found '{TASK_NAME}' scheduled task. Removing it...")
    delete_result = subprocess.run(
        ["schtasks", "/Delete", "/TN", TASK_NAME, "/F"],
        capture_output=True, text=True,
    )
    if delete_result.returncode == 0:
        print("Scheduled task removed.")
    else:
        print("Could not remove the scheduled task automatically.")
        print(delete_result.stderr.strip() or delete_result.stdout.strip())
        print(f"You can remove it by hand: open Task Scheduler, find '{TASK_NAME}', and delete it.")


def wipe_data() -> None:
    import os
    data_dir = Path(os.environ.get("PROGRAMDATA", r"C:\ProgramData")) / "TTechStudio"

    if not data_dir.exists():
        print(f"No data folder found at {data_dir} (nothing to wipe).")
        return

    print()
    print("=" * 70)
    print("WARNING: this permanently deletes the real business database,")
    print("all local backup copies, and all log files at:")
    print(f"    {data_dir}")
    print("This does NOT touch anything already sent to Google Drive/")
    print("OneDrive/Dropbox -- only the copies stored on THIS computer.")
    print("There is no undo for this step.")
    print("=" * 70)
    confirmation = input("Type WIPE (in capitals) to confirm, or anything else to cancel: ")

    if confirmation != "WIPE":
        print("Cancelled. Nothing was deleted.")
        return

    shutil.rmtree(data_dir)
    print(f"Deleted {data_dir}")


def main() -> None:
    print("T-Tech Studio -- uninstall helper")
    print()

    remove_scheduled_task()

    if "--wipe-data" in sys.argv:
        wipe_data()

    print()
    print("Next step to finish removing the program itself:")
    print("  Windows Settings > Apps > installed apps > T-Tech Studio > Uninstall")
    print("  (or: Start Menu > T-Tech Studio > Uninstall T-Tech Studio)")
    print()
    if "--wipe-data" not in sys.argv:
        print("Note: the business database, backups, and logs at")
        print("C:\\ProgramData\\TTechStudio have been left in place.")
        print("Run this script again with --wipe-data to permanently remove those too.")


if __name__ == "__main__":
    main()
