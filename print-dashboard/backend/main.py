"""
main.py

The one file that starts the whole desktop app. This is what gets
turned into TTechStudio.exe in Step 4 of the build plan.

Order of events, matching Part 1 of the build plan:
  1. Show the instant splash, before anything slow happens.
  2. Check the single-instance lock. If another copy is already
     running, this copy asks it to come to the front and quits.
  3. Run the real startup work (logging, database, backup scheduler)
     via lifecycle.bootstrap_app().
  4. Swap the splash for the real app window (pywebview), pointed at
     the Flask server this same process is running.
  5. On window close, stop the backup scheduler cleanly and exit --
     there is no background tray mode; closing the window fully quits,
     matching the plan's decision on this.
"""

from __future__ import annotations

import logging
import threading

from app import lifecycle
from app.device_prompt import prompt_for_device_name
from app.single_instance import SingleInstanceGuard
from app.splash import show_splash

logger = logging.getLogger("ttech.main")

HOST = "127.0.0.1"  # never reachable from other devices on the network

# The built frontend (see src/api/client.js) is hardcoded to call
# http://localhost:5000/api for every request -- that value gets baked
# into the built files at `npm run build` time, so this process MUST
# use port 5000 for the on-screen app to actually work. A random free
# port only gets used as a last-resort fallback, and in that case the
# frontend would need rebuilding with a matching VITE_API_BASE_URL to
# match -- so treat hitting the fallback as something to fix, not a
# normal case.
PREFERRED_PORT = 5000


def _run_flask(flask_app, port: int) -> None:
    # threaded=True lets the manual "Backup Now" button be handled
    # while other requests are in flight, and use_reloader=False is
    # required -- the reloader spawns a second process, which would
    # both duplicate the backup scheduler and confuse the
    # single-instance lock.
    flask_app.run(host=HOST, port=port, debug=False, use_reloader=False, threaded=True)


def _find_free_port() -> int:
    import socket

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind((HOST, 0))
        return s.getsockname()[1]


def _pick_port() -> int:
    import socket

    # Try the port the frontend is actually built to expect first.
    probe = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        probe.bind((HOST, PREFERRED_PORT))
        probe.close()
        return PREFERRED_PORT
    except OSError:
        probe.close()
        fallback = _find_free_port()
        logger.warning(
            "Port %d was already in use, so the backend is starting on port %d instead. "
            "The on-screen app expects port %d (baked in at build time), so features that "
            "load or save data will fail until whatever else is using port %d is closed, "
            "then the app is restarted.",
            PREFERRED_PORT, fallback, PREFERRED_PORT, PREFERRED_PORT,
        )
        return fallback


def main() -> None:
    # Cross-device backup/restore (this pass): this machine needs a
    # permanent device identity before anything else happens. Checked
    # BEFORE the splash/single-instance guard below, and deliberately
    # NOT behind the splash screen -- a text-entry dialog appearing
    # underneath/behind a topmost splash would be confusing, so on a
    # true first run the naming prompt IS the first thing the person
    # sees, replacing the splash for that one-time moment. Every
    # subsequent launch skips this block entirely (device_identity.json
    # already exists) and goes straight to the normal splash-first flow.
    existing_identity = lifecycle.get_existing_device_identity()
    device_name = None
    if existing_identity is None:
        device_name = prompt_for_device_name()
        if device_name is None:
            # Person closed the naming dialog without entering anything.
            # Startup cannot continue without a device identity (every
            # ref generated and every row written depends on it -- see
            # ref_generator.py / device_context.py) -- rather than
            # silently continuing unnamed, the app quits here so the
            # person can just double-click it again to retry, the same
            # familiar "try again" pattern as any other app that needs
            # one piece of required setup info before it can run.
            logger.warning("No device name provided -- exiting so the app can be relaunched to retry")
            return

    splash = show_splash("T-Tech Studio", "Starting...")

    window_ref: dict = {}

    def bring_existing_window_to_front() -> None:
        # Called on the FIRST copy when a SECOND launch attempt is
        # detected. pywebview's window object supports restore()/
        # a plain focus request through its API.
        window = window_ref.get("window")
        if window is not None:
            try:
                window.restore()
            except Exception:
                logger.exception("Failed to bring existing window to the front")

    guard = SingleInstanceGuard(on_focus_request=bring_existing_window_to_front)
    if not guard.acquire():
        # Another copy is already running and has been notified.
        # This copy has no more work to do.
        splash.close()
        return

    try:
        flask_app, scheduler, reports_scheduler, _log_path, identity = lifecycle.bootstrap_app(
            "production", device_name=device_name
        )
        if flask_app is None:
            # bootstrap_app() itself found no identity AND wasn't given
            # a name either -- shouldn't be reachable given the prompt
            # above already guarantees one of the two, but handled
            # explicitly rather than letting a None flask_app crash
            # further down with a confusing error.
            logger.error("Startup aborted: no device identity available")
            splash.close()
            return
    except Exception:
        logger.exception("Startup failed")
        splash.close()
        raise

    port = _pick_port()
    server_thread = threading.Thread(
        target=_run_flask, args=(flask_app, port), daemon=True
    )
    server_thread.start()

    import webview  # imported here so a failed lifecycle bootstrap above never leaves a stray splash window

    # pywebview blocks all file downloads by default (this setting
    # defaults to False). Without this, every "Download PDF" button in
    # the app -- invoices, proposals, exports, reports -- silently does
    # nothing: the click handler runs, the PDF is generated in memory
    # correctly, but pywebview's embedded browser refuses to hand the
    # resulting file off to Windows' normal save-file behavior. This is
    # why downloads work fine when testing the same built frontend in a
    # real browser tab (Chrome/Edge don't block this) but appeared
    # completely broken only in the packaged desktop app.
    webview.settings["ALLOW_DOWNLOADS"] = True

    window = webview.create_window(
        "T-Tech Studio",
        url=f"http://{HOST}:{port}/",
        width=1280,
        height=800,
        min_size=(1024, 700),
    )
    window_ref["window"] = window

    splash.close()

    def on_closed():
        lifecycle.shutdown_app(scheduler, reports_scheduler)
        guard.release()

    window.events.closed += on_closed

    webview.start()


if __name__ == "__main__":
    main()