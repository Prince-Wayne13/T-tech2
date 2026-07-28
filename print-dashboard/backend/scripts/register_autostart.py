"""
register_autostart.py

Registers a Windows Scheduled Task so T-Tech Studio opens by itself
after the PC restarts and someone (or auto-login) reaches the desktop
-- no one has to double-click the icon after a reboot.

Usage (from an ordinary Command Prompt, not necessarily as
Administrator -- creating a task for the current user does not
require elevated rights):

    python scripts\\register_autostart.py "C:\\full\\path\\to\\dist\\TTechStudio.exe"

What this does, in plain terms:
  - Creates a Scheduled Task named TTechStudioAutoStart.
  - Tells Windows: "the next time this specific user logs into this
    PC, run this .exe."
  - Does NOT turn on auto-login itself -- that is a separate, one-time
    Windows setting (Part 6 of the build plan), done only once,
    directly on the office PC, when ready. This script only makes
    sure the app is what greets whoever reaches the desktop.

Safe to run again later (e.g. after moving the .exe) -- it replaces
the existing task rather than creating a duplicate.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

TASK_NAME = "TTechStudioAutoStart"


def register(exe_path: str) -> None:
    exe = Path(exe_path).resolve()

    if not exe.is_file():
        print(f"Error: could not find a file at {exe}")
        print("Double-check the path you passed in, and that Step 4 (building the .exe) is done.")
        sys.exit(1)

    # /SC ONLOGON  -> run when a user logs on
    # /RL LIMITED  -> run with the normal (non-administrator) rights of
    #                 whoever is logged in, which is all this app needs
    # /F           -> replace the task if one by this name already exists,
    #                 so re-running this script is always safe
    command = [
        "schtasks", "/Create",
        "/TN", TASK_NAME,
        "/TR", f'"{exe}"',
        "/SC", "ONLOGON",
        "/RL", "LIMITED",
        "/F",
    ]

    result = subprocess.run(command, capture_output=True, text=True)

    if result.returncode == 0:
        print(f"Success: '{TASK_NAME}' scheduled task created.")
        print(f"It will run: {exe}")
        print("The next time this Windows account logs in, T-Tech Studio will open on its own.")
        print("You can see it in Task Scheduler (search 'Task Scheduler' in the Start Menu).")
    else:
        print("Something went wrong creating the scheduled task.")
        print(result.stderr.strip() or result.stdout.strip())
        sys.exit(1)


def main() -> None:
    if len(sys.argv) != 2:
        print('Usage: python scripts\\register_autostart.py "C:\\full\\path\\to\\dist\\TTechStudio.exe"')
        sys.exit(1)

    register(sys.argv[1])


if __name__ == "__main__":
    main()
