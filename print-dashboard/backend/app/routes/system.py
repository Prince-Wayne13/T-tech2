"""
system.py

Two small, plain-language status endpoints for the frontend's
Settings screen. These describe backup and update state in words a
non-technical person can read directly, rather than raw numbers.
"""

from __future__ import annotations

from flask import Blueprint, current_app, jsonify

bp = Blueprint("system", __name__)


@bp.route("/backup-status", methods=["GET"])
def backup_status():
    scheduler = current_app.config.get("BACKUP_SCHEDULER")

    if scheduler is None:
        return jsonify({
            "status": "Backup system is not running.",
            "detail": "This only happens if the app was started in a way that skipped normal startup.",
        }), 200

    failures = scheduler._consecutive_failures
    in_progress = scheduler._lock.locked()

    if in_progress:
        status = "A backup is running right now."
    elif failures == 0:
        status = "Backups are running normally."
    elif failures < 3:
        status = f"The last {failures} backup(s) had a problem. Still watching."
    else:
        status = f"Backups have failed or been missed {failures} times in a row. This needs attention."

    return jsonify({
        "status": status,
        "consecutive_failures": failures,
        "backup_in_progress": in_progress,
        "flagged": failures >= 3,
    })


@bp.route("/update-status", methods=["GET"])
def update_status():
    # Placeholder for now -- this app does not yet check for or apply
    # updates automatically. Reporting this plainly rather than
    # guessing avoids implying a feature that doesn't exist yet.
    return jsonify({
        "status": "Automatic update checking is not set up yet.",
        "current_version": "development build",
    })


@bp.route("/device-identity", methods=["GET"])
def device_identity_status():
    """Exposes this machine's own device_id/device_name (set once at
    first-run, see device_identity.py) so the frontend's sync screen can
    tell "this device's own backup" apart from every other device's
    entry in /api/backup/available, instead of guessing.
    """
    identity = current_app.config.get("DEVICE_IDENTITY")
    if identity is None:
        return jsonify({"device_id": None, "device_name": None})
    return jsonify({"device_id": identity.device_id, "device_name": identity.device_name})
