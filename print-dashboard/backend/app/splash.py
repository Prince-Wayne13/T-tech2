"""
splash.py

Shows a tiny window the instant the app is double-clicked, before
anything slow (Flask, the database) has started. Without this, there
would be a blank pause after double-clicking, which looks like the app
didn't respond.

This uses Tkinter, which comes built into Python already -- nothing
extra to install for this part. It is intentionally as simple as
possible, since its only job is to appear fast.

Usage from main.py:

    splash = show_splash("T-Tech Studio", "Starting...")
    # ... do the slow startup work here (Flask, database, etc.) ...
    splash.close()
"""

from __future__ import annotations

import logging
import threading
import tkinter as tk

logger = logging.getLogger("ttech.splash")


class Splash:
    def __init__(self, title: str, message: str):
        self._closed = threading.Event()
        self._ready = threading.Event()
        self._root: tk.Tk | None = None
        self._thread = threading.Thread(
            target=self._run, args=(title, message), daemon=True
        )
        self._thread.start()
        # Wait briefly for the window to actually exist before returning,
        # so callers can rely on it being visible right away.
        self._ready.wait(timeout=2.0)

    def close(self) -> None:
        self._closed.set()

    # -- internal --------------------------------------------------------

    def _run(self, title: str, message: str) -> None:
        try:
            root = tk.Tk()
            self._root = root
            root.title(title)
            root.overrideredirect(True)  # no window border/titlebar, looks like a splash
            root.attributes("-topmost", True)

            width, height = 360, 160
            screen_w = root.winfo_screenwidth()
            screen_h = root.winfo_screenheight()
            x = (screen_w - width) // 2
            y = (screen_h - height) // 2
            root.geometry(f"{width}x{height}+{x}+{y}")

            frame = tk.Frame(root, bg="#1b1f27")
            frame.pack(fill="both", expand=True)

            tk.Label(
                frame, text=title, fg="white", bg="#1b1f27",
                font=("Segoe UI", 16, "bold"),
            ).pack(pady=(30, 8))

            tk.Label(
                frame, text=message, fg="#b8bcc4", bg="#1b1f27",
                font=("Segoe UI", 10),
            ).pack()

            self._ready.set()
            self._poll_for_close()
            root.mainloop()
        except Exception:
            # A splash screen failing to draw must never stop the real
            # app from starting -- log it and move on.
            logger.exception("Splash screen failed to display")
            self._ready.set()

    def _poll_for_close(self) -> None:
        if self._root is None:
            return
        if self._closed.is_set():
            try:
                self._root.destroy()
            except tk.TclError:
                pass
            return
        self._root.after(100, self._poll_for_close)


def show_splash(title: str = "T-Tech Studio", message: str = "Starting...") -> Splash:
    return Splash(title, message)
