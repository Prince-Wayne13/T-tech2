"""
build_exe.py

Builds TTechStudio.exe from this project, doing everything by hand
that the earlier one-line pyinstaller command left out or got wrong:

  - Actually bundles the built on-screen app (print-dashboard/dist),
    not just the Python code. Without this, the packaged .exe would
    open to a blank/404 page, since app/__init__.py's
    _resolve_frontend_dist_dir() would have nothing to find.
  - Uses --windowed so no black console window flashes open behind
    the app window on every launch.
  - Uses --onedir (a folder), not --onefile (a single squashed file).
    --onefile re-extracts itself into a fresh temporary folder every
    single time the app starts, which is slower and, more importantly,
    means sys._MEIPASS is a NEW temporary path every launch -- fragile
    for an app that runs continuously in the background with
    schedulers. --onedir starts faster and is what the official
    installer step (make_installer.py) expects to find.
  - Bundles the icon if a real one has been placed at
    backend/assets/app.ico (see assets/README.md); otherwise builds
    with Windows' generic default icon rather than failing.

Usage (from the backend folder, with the virtual environment active
and requirements.txt already installed):

    python scripts\\build_exe.py

Output ends up at: backend\\dist\\TTechStudio\\TTechStudio.exe
(a whole folder, not a single file -- that folder is what
make_installer.py packages up in the next step.)
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
FRONTEND_DIST = PROJECT_ROOT / "dist"
ICON_PATH = BACKEND_DIR / "assets" / "app.ico"


def _check_frontend_built() -> None:
    if not FRONTEND_DIST.is_dir() or not (FRONTEND_DIST / "index.html").exists():
        print("ERROR: The on-screen app hasn't been built yet.")
        print(f"Expected to find: {FRONTEND_DIST / 'index.html'}")
        print()
        print("Run this first, from the print-dashboard folder:")
        print("    npm install")
        print("    npm run build")
        sys.exit(1)


def _clean_previous_build() -> None:
    for folder_name in ("build", "dist"):
        folder = BACKEND_DIR / folder_name
        if folder.exists():
            print(f"Removing previous {folder_name}\\ folder...")
            shutil.rmtree(folder)


def build() -> None:
    _check_frontend_built()
    _clean_previous_build()

    has_icon = ICON_PATH.exists()
    if not has_icon:
        print(f"Note: no icon found at {ICON_PATH}")
        print("Building with Windows' default icon. See assets/README.md to add a real one later.")

    # --add-data "SOURCE;DEST_INSIDE_BUNDLE" (Windows uses ; as the
    # separator; macOS/Linux would use : instead, but this project
    # only targets Windows for the packaged app).
    #
    # DEST_INSIDE_BUNDLE is "dist" (not "print-dashboard/dist" or
    # similar) because app/__init__.py's _resolve_frontend_dist_dir()
    # looks for Path(sys._MEIPASS) / "dist" specifically -- these two
    # must match exactly, or the packaged app opens to a 404 page.
    args = [
        sys.executable, "-m", "PyInstaller",
        "main.py",
        "--name=TTechStudio",
        "--onedir",
        "--windowed",
        "--clean",
        "--noconfirm",
        f"--add-data={FRONTEND_DIST}{';'}dist",
        "--add-data=app;app",
    ]
    if has_icon:
        args.append(f"--icon={ICON_PATH}")

    print("Running PyInstaller...")
    print(" ".join(args))
    result = subprocess.run(args, cwd=BACKEND_DIR)

    if result.returncode != 0:
        print("\nBuild failed. See the PyInstaller output above for the actual error.")
        sys.exit(result.returncode)

    exe_path = BACKEND_DIR / "dist" / "TTechStudio" / "TTechStudio.exe"
    print()
    print("Build finished.")
    print(f"App folder: {BACKEND_DIR / 'dist' / 'TTechStudio'}")
    print(f"Run it directly with: {exe_path}")
    print()
    print("Next step: python scripts\\make_installer.py")


if __name__ == "__main__":
    build()
