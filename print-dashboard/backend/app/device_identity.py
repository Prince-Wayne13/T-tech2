# path: backend/app/device_identity.py
"""
device_identity.py

Cross-device backup/restore needs to know which physical machine wrote
each record. This module owns that one small fact: a persistent device
ID for THIS computer, created once (via a first-run name prompt) and
then reused forever.

Deliberately NOT stored in the SQLite database itself -- the whole
point of this file is to identify the device independently of whatever
database happens to be loaded on it at a given moment (including right
after a restore has swapped the database out from under it). Stored as
a small JSON file in the same per-machine data folder lifecycle.py
already uses (C:\\ProgramData\\TTechStudio), so it survives an app
reinstall the same way the database does.

File format (device_identity.json):
    {
        "device_id": "OFFICE-PC-3F2A",
        "device_name": "Office PC",
        "created_at": "2026-07-28T10:15:00"
    }

device_id vs device_name:
  - device_name is what the person typed at the first-run prompt
    (e.g. "Office PC", "Wayne's Laptop") -- human-friendly, shown in
    the UI, NOT guaranteed unique if someone types the same name twice
    on two machines.
  - device_id is device_name plus a short random suffix, generated
    once and then fixed forever -- THIS is the value actually stamped
    onto every database record (see models.py's DeviceOwnedMixin) and
    used as the per-device backup subfolder name, specifically so two
    machines named identically by mistake still can't collide.
"""

from __future__ import annotations

import json
import re
import secrets
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


@dataclass
class DeviceIdentity:
    device_id: str
    device_name: str
    created_at: str


def _slugify(name: str) -> str:
    """Turns a free-typed device name into a safe folder-name/ref-prefix
    fragment: uppercase, letters/digits/hyphens only, collapsed."""
    slug = re.sub(r"[^A-Za-z0-9]+", "-", name.strip()).strip("-").upper()
    return slug or "DEVICE"


def _generate_device_id(device_name: str) -> str:
    slug = _slugify(device_name)[:20]  # keep ref prefixes/folder names reasonably short
    suffix = secrets.token_hex(2).upper()  # 4 hex chars, e.g. "3F2A" -- collision-safe enough for a handful of office machines
    return f"{slug}-{suffix}"


def _identity_file_path(data_dir: Path) -> Path:
    return data_dir / "device_identity.json"


def load_device_identity(data_dir: Path) -> DeviceIdentity | None:
    """Returns the existing identity for this machine, or None if this
    is a fresh install that hasn't been named yet."""
    path = _identity_file_path(data_dir)
    if not path.exists():
        return None
    try:
        raw = json.loads(path.read_text())
        return DeviceIdentity(**raw)
    except (json.JSONDecodeError, TypeError, KeyError):
        # Corrupted/unreadable identity file. Treated as "not set yet"
        # rather than crashing app startup -- the first-run prompt will
        # fire again and overwrite it with a fresh valid one.
        return None


def create_device_identity(data_dir: Path, device_name: str) -> DeviceIdentity:
    """Called once, from the first-run naming prompt. Overwrites any
    existing identity file -- callers should check load_device_identity()
    first and only call this when it returned None, so a machine already
    named doesn't silently get renamed/re-IDed by a stray call."""
    identity = DeviceIdentity(
        device_id=_generate_device_id(device_name),
        device_name=device_name.strip(),
        created_at=datetime.utcnow().isoformat(),
    )
    data_dir.mkdir(parents=True, exist_ok=True)
    _identity_file_path(data_dir).write_text(
        json.dumps(identity.__dict__, indent=2)
    )
    return identity


def get_or_require_device_identity(data_dir: Path) -> DeviceIdentity | None:
    """Convenience wrapper for main.py's startup sequence: returns the
    existing identity, or None to signal 'show the first-run prompt now'.
    Does NOT create one itself -- naming a device is a deliberate,
    user-visible action (typed into the splash/first-run screen), not
    something that should happen silently with an auto-generated name."""
    return load_device_identity(data_dir)
