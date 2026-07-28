"""
device_prompt.py

Shown exactly once per machine: the first time T-Tech Studio ever
starts up on it, before any device identity exists yet (see
device_identity.py / lifecycle.bootstrap_app()'s two-call pattern).

Asks the person to name this computer (e.g. "Office PC", "Wayne's
Laptop") -- this name becomes the device's permanent identity for
cross-device backup/restore, so every record this machine creates can
be told apart from records created on other machines.

Uses Tkinter, same as splash.py, for the same reason: it's built into
Python already, and this needs to work BEFORE Flask/the database/
pywebview have started -- there is no web page to show this in yet at
this point in startup.

Usage from main.py:

    from app.device_prompt import prompt_for_device_name
    name = prompt_for_device_name()
    if name is None:
        # person closed the dialog without entering a name -- see
        # prompt_for_device_name()'s docstring for how main.py should
        # handle this (retry, not silently continue unnamed)
        ...
"""

from __future__ import annotations

import logging
import tkinter as tk
from tkinter import messagebox

logger = logging.getLogger("ttech.device_prompt")


def prompt_for_device_name() -> str | None:
    """
    Blocks until the person types a name and clicks "Continue", or
    closes the window. Returns the typed name (stripped, guaranteed
    non-empty), or None if the person closed the dialog without
    entering one.

    Deliberately does NOT allow submitting an empty name -- an empty/
    whitespace-only device name would produce a confusing device_id
    like "DEVICE-3F2A" with no human-readable part at all (see
    device_identity.py's _slugify() fallback), which defeats the whole
    point of naming devices for a non-technical person reading a
    restore/conflict screen later. Clicking Continue with nothing typed
    just re-shows a small inline warning instead of closing the dialog.
    """
    result: dict = {"name": None}

    root = tk.Tk()
    root.title("T-Tech Studio - Setup")
    root.attributes("-topmost", True)

    width, height = 420, 220
    screen_w = root.winfo_screenwidth()
    screen_h = root.winfo_screenheight()
    x = (screen_w - width) // 2
    y = (screen_h - height) // 2
    root.geometry(f"{width}x{height}+{x}+{y}")
    root.resizable(False, False)

    frame = tk.Frame(root, bg="#1b1f27", padx=24, pady=24)
    frame.pack(fill="both", expand=True)

    tk.Label(
        frame, text="Name this computer", fg="white", bg="#1b1f27",
        font=("Segoe UI", 14, "bold"),
    ).pack(anchor="w")

    tk.Label(
        frame,
        text="This only appears once. It helps tell records made on\n"
             "this computer apart from records made on others, when\n"
             "backups from multiple computers are combined.",
        fg="#b8bcc4", bg="#1b1f27", font=("Segoe UI", 9),
        justify="left",
    ).pack(anchor="w", pady=(6, 14))

    entry_var = tk.StringVar()
    entry = tk.Entry(frame, textvariable=entry_var, font=("Segoe UI", 11), width=30)
    entry.pack(fill="x")
    entry.insert(0, "e.g. Office PC")
    entry.config(fg="#888888")

    def _clear_placeholder(_event=None):
        if entry_var.get() == "e.g. Office PC":
            entry_var.set("")
            entry.config(fg="black")

    entry.bind("<FocusIn>", _clear_placeholder)
    entry.focus_set()

    warning_label = tk.Label(frame, text="", fg="#e05252", bg="#1b1f27", font=("Segoe UI", 8))
    warning_label.pack(anchor="w", pady=(4, 0))

    def _submit(_event=None):
        typed = entry_var.get().strip()
        if not typed or typed == "e.g. Office PC":
            warning_label.config(text="Please enter a name for this computer.")
            return
        result["name"] = typed
        root.destroy()

    entry.bind("<Return>", _submit)

    button = tk.Button(
        frame, text="Continue", command=_submit,
        bg="#2e5395", fg="white", relief="flat", font=("Segoe UI", 10, "bold"),
        padx=16, pady=6, activebackground="#1F3864", activeforeground="white",
    )
    button.pack(anchor="e", pady=(16, 0))

    root.mainloop()

    if result["name"] is None:
        logger.warning("Device naming prompt closed without a name being entered")
    else:
        logger.info("Device name entered: %s", result["name"])

    return result["name"]
