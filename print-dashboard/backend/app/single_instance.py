"""
single_instance.py

Stops a second copy of the app from opening if it's double-clicked
again while it's already running. Instead of doing nothing (which
looks broken to someone who isn't technical), it tells the first,
already-open copy to bring its window to the front.

How this works, in plain terms:
  - The very first copy that starts opens a small local "listening
    post" on the user's own computer (not reachable from the internet
    or any other device -- it only listens to itself).
  - Any copy that starts after that tries to talk to that listening
    post first. If it succeeds, that means a copy is already running,
    so this second copy sends it one short message ("come to the
    front") and then closes itself immediately.
  - If nothing answers, this is the first copy, so it keeps that
    listening post open for as long as the app runs, and it also sets
    up a way to react when a "come to the front" message arrives later.

Nothing here talks to anything outside the user's own computer.
"""

from __future__ import annotations

import logging
import socket
import threading

logger = logging.getLogger("ttech.single_instance")

# A fixed local-only "address" the app uses to check if a copy is
# already running. 127.0.0.1 never leaves this computer.
_HOST = "127.0.0.1"
_PORT = 51837  # arbitrary, unlikely to clash with anything else
_FOCUS_MESSAGE = b"FOCUS"


class SingleInstanceGuard:
    """
    Call acquire() once at startup.

    Returns True  -> this is the only copy running; keep going as normal.
    Returns False -> another copy is already running and has been told
                     to come to the front; this copy should close itself
                     right away without starting Flask/the window/etc.
    """

    def __init__(self, on_focus_request=None):
        # on_focus_request: called (with no arguments) whenever a later
        # copy tries to open and is told "already running". This is
        # where main.py hooks in "bring the window to the front".
        self.on_focus_request = on_focus_request
        self._server_socket: socket.socket | None = None
        self._listener_thread: threading.Thread | None = None

    def acquire(self) -> bool:
        # Step 1: see if another copy is already listening.
        if self._another_copy_is_running():
            logger.info("Another copy is already running. Asking it to come to the front.")
            self._tell_existing_copy_to_focus()
            return False

        # Step 2: no one answered, so this is the first copy. Start
        # listening ourselves so any later copy can find us.
        self._start_listening()
        logger.info("Single-instance lock acquired. This is the only running copy.")
        return True

    def release(self) -> None:
        if self._server_socket is not None:
            try:
                self._server_socket.close()
            except OSError:
                pass
            self._server_socket = None

    # -- internal steps -----------------------------------------------

    def _another_copy_is_running(self) -> bool:
        probe = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        probe.settimeout(0.5)
        try:
            probe.connect((_HOST, _PORT))
            return True
        except OSError:
            return False
        finally:
            probe.close()

    def _tell_existing_copy_to_focus(self) -> None:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                sock.settimeout(1.0)
                sock.connect((_HOST, _PORT))
                sock.sendall(_FOCUS_MESSAGE)
        except OSError:
            # If this fails for any reason, the safest fallback is to
            # simply not open a second copy. The user can reopen from
            # the taskbar/shortcut themselves.
            logger.warning("Could not reach the already-running copy to ask it to focus.")

    def _start_listening(self) -> None:
        self._server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self._server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self._server_socket.bind((_HOST, _PORT))
        self._server_socket.listen(5)

        self._listener_thread = threading.Thread(
            target=self._listen_loop, daemon=True
        )
        self._listener_thread.start()

    def _listen_loop(self) -> None:
        while True:
            try:
                conn, _ = self._server_socket.accept()
            except OSError:
                # Socket was closed (app shutting down) -- stop the loop.
                return

            try:
                data = conn.recv(64)
                if data == _FOCUS_MESSAGE:
                    logger.info("Received a 'come to the front' request from a second launch attempt.")
                    if self.on_focus_request:
                        try:
                            self.on_focus_request()
                        except Exception:
                            logger.exception("on_focus_request callback raised while handling focus request")
            finally:
                conn.close()
