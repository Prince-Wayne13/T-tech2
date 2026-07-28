# path: backend/app/services/device_context.py
"""
device_context.py

Auto-stamps app.device_identity's device_id onto every database row's
device_id column, application-wide, via a single SQLAlchemy
before_flush event listener -- NOT by editing next_*_ref()/create_*()
in 20 separate service/route files by hand, which would be one missed
call site away from silently under-stamping some table.

Usage (called once from main.py at startup, after device identity is
confirmed to exist -- see main.py's startup sequence):

    from app.services.device_context import set_current_device_id, install_device_stamping

    set_current_device_id(identity.device_id)
    install_device_stamping()

set_current_device_id() is also what the CURRENT_DEVICE_ID module-level
value reads from -- kept as a plain module global (not Flask's `g`,
which only lives for one request) because backup_scheduler's background
thread writes to the database too (well, it doesn't write rows, but the
same pattern is used for anything else running outside a request
context), and because main.py needs to set this once, before Flask's
app context machinery is even relevant, from the desktop shell/CLI
layer.
"""

from __future__ import annotations

from sqlalchemy import event

from ..extensions import db

CURRENT_DEVICE_ID: str | None = None


def set_current_device_id(device_id: str) -> None:
    """Called once at startup once this machine's device identity is
    known. Must be called before install_device_stamping() actually
    stamps anything meaningful -- rows created before this is called
    (there shouldn't be any in normal startup order, but just in case)
    get device_id=None rather than crashing, same as any pre-existing
    row from before this feature existed."""
    global CURRENT_DEVICE_ID
    CURRENT_DEVICE_ID = device_id


def _stamp_new_and_dirty_objects(session, flush_context, instances):
    """before_flush handler: for every object about to be
    inserted OR updated in this flush, set device_id to the current
    machine's ID -- but only if that object actually HAS a device_id
    column (checked via hasattr, since AuditLog intentionally does not
    inherit TimestampMixin/device_id -- audit rows already carry their
    own `actor` field for who/what, and stamping a machine-only device_id
    onto them would be a second, redundant identity concept for the
    same log entry).

    Signature matches SQLAlchemy's documented before_flush event
    contract exactly: (session, flush_context, instances) -- the second
    and third arguments are unused here (instances is only populated
    when flush() is called with an explicit object list, which this
    codebase never does), but must still be accepted or SQLAlchemy's
    dispatch raises a TypeError on every flush.
    """
    if CURRENT_DEVICE_ID is None:
        return

    for obj in list(session.new) + list(session.dirty):
        if hasattr(obj, "device_id"):
            obj.device_id = CURRENT_DEVICE_ID


def install_device_stamping() -> None:
    """Registers the before_flush listener on the shared SQLAlchemy
    session. Idempotent-safe to call more than once -- SQLAlchemy's
    event system silently no-ops re-registering the identical
    (target, identifier, fn) triple, so an accidental double-call from
    a future refactor won't double-stamp or error."""
    event.listen(db.session, "before_flush", _stamp_new_and_dirty_objects)
