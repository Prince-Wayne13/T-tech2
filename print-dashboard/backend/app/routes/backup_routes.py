"""
backup_routes.py

Flask blueprint exposing the manual "Backup Now" button as an API
endpoint, so the React frontend can trigger backup_scheduler's
run_backup_now() on demand.

This blueprint is wired in through app/routes/__init__.py, the same
way every other blueprint in this project is registered:

    from .backup_routes import bp as backup_bp
    app.register_blueprint(backup_bp, url_prefix="/api/backup")

The blueprint expects a single BackupScheduler instance to already be
attached to the Flask app config as app.config["BACKUP_SCHEDULER"],
set up once in main.py at startup (alongside starting its background
thread). This file does NOT create the scheduler itself -- it only
reaches into app.config for the one that main.py already built,
so there's exactly one scheduler instance for the whole app.

Endpoint:
    POST /api/backup/run-now
        Triggers an immediate backup cycle (same verified logic as a
        scheduled run). Blocks until the cycle finishes -- the cycle
        itself is fast (seconds, not minutes) for typical DB sizes,
        so a simple synchronous request/response is fine. Returns the
        BackupResult as JSON.

    GET /api/backup/status
        Returns basic scheduler state: configured backup times,
        current consecutive-failure count, and whether a backup is
        currently running (so the frontend can disable/grey out the
        button while one is in progress rather than letting the user
        queue up duplicate clicks).
"""

from __future__ import annotations

import os

from flask import Blueprint, current_app, jsonify, request

bp = Blueprint("backup", __name__)


def _get_scheduler():
    scheduler = current_app.config.get("BACKUP_SCHEDULER")
    if scheduler is None:
        raise RuntimeError(
            "BACKUP_SCHEDULER not found in app.config. "
            "main.py must set app.config['BACKUP_SCHEDULER'] = scheduler "
            "before this blueprint's routes are used."
        )
    return scheduler


@bp.route("/run-now", methods=["POST"])
def run_now():
    scheduler = _get_scheduler()

    # If a backup (scheduled or manual) is already in progress, don't
    # queue a silent duplicate -- tell the frontend so it can show
    # "a backup is already running" instead of a confusing double-run.
    if scheduler._lock.locked():
        return jsonify({
            "ok": False,
            "message": "A backup is already in progress. Please wait for it to finish.",
        }), 409

    result = scheduler.run_backup_now(reason="manual button")

    return jsonify({
        "ok": result.ok,
        "message": result.message,
        "zip_path": result.zip_path,
        "dest_path": result.dest_path,
        "log_copy_path": result.log_copy_path,
        "timestamp": result.timestamp.isoformat(),
    }), (200 if result.ok else 500)


@bp.route("/status", methods=["GET"])
def status():
    scheduler = _get_scheduler()

    try:
        from ..backup_scheduler import BACKUP_TIMES
    except ImportError:
        # Falls back to absolute import if this module isn't loaded as
        # part of the `app` package (e.g. standalone test harnesses).
        # In the real app (registered via routes/__init__.py's
        # register_blueprints()), the relative import above will always
        # succeed.
        from backup_scheduler import BACKUP_TIMES

    return jsonify({
        "backup_times": [t.strftime("%H:%M") for t in BACKUP_TIMES],
        "consecutive_failures": scheduler._consecutive_failures,
        "backup_in_progress": scheduler._lock.locked(),
    })


@bp.route("/available", methods=["GET"])
def available():
    """Lists every backup found across every device's subfolder under
    the shared synced backup folder. Read-only -- does not touch the
    live database. First slice of the restore engine: discovery before
    any merge/swap-into-place logic exists.
    """
    from ..restore_inspector import list_available_backups

    scheduler = _get_scheduler()
    entries = list_available_backups(scheduler.sync_fallback_dir)

    return jsonify({
        "backups": [entry.to_dict() for entry in entries],
        "count": len(entries),
    })


@bp.route("/preview", methods=["GET"])
def preview():
    """Verifies and inspects a single backup zip (row counts per table,
    most recent updated_at) without restoring it. Takes the same
    full_path returned by /available's entries, passed as a query
    param, e.g. /api/backup/preview?path=<full_path>.
    """
    from ..restore_inspector import preview_backup

    zip_path = request.args.get("path")
    if not zip_path:
        return jsonify({"ok": False, "message": "Missing required 'path' query parameter."}), 400

    if not zip_path.lower().endswith(".zip") or not os.path.isfile(zip_path):
        return jsonify({"ok": False, "message": "File not found or not a .zip file."}), 404

    result = preview_backup(zip_path)
    return jsonify(result.to_dict()), (200 if result.ok else 422)


@bp.route("/merge-preview", methods=["GET"])
def merge_preview():
    """Read-only dry run comparing two backup zips and reporting what a
    merge WOULD do -- adds nothing, changes nothing, writes nothing.
    Takes two full_path values (from /available's entries):

        /api/backup/merge-preview?path_a=<...>&path_b=<...>

    path_a is conventionally "this device's" backup and path_b the
    other device's, but the comparison itself is symmetric -- either
    side can legitimately win a given row depending on which is newer.

    See app/merge_preview.py's module docstring for which tables are
    covered so far and why (ref-keyed vs name-keyed vs the still-open
    weak-key case for staff) -- not all 20 device_id tables are
    reasoned through yet, so tables outside that list simply won't
    appear in the report.
    """
    from ..merge_preview import preview_merge

    path_a = request.args.get("path_a")
    path_b = request.args.get("path_b")
    if not path_a or not path_b:
        return jsonify({
            "ok": False,
            "message": "Both 'path_a' and 'path_b' query parameters are required.",
        }), 400

    for label, path in (("path_a", path_a), ("path_b", path_b)):
        if not path.lower().endswith(".zip") or not os.path.isfile(path):
            return jsonify({
                "ok": False,
                "message": f"{label}: file not found or not a .zip file.",
            }), 404

    try:
        result = preview_merge(path_a, path_b)
    except Exception as e:  # noqa: BLE001 -- surfaced to the caller, not swallowed
        return jsonify({"ok": False, "message": f"Could not compare backups: {e}"}), 422

    return jsonify({"ok": True, **result})


@bp.route("/merge-apply", methods=["POST"])
def merge_apply_route():
    """Actually applies a merge against another device's backup, for the
    FK-clean table subset only (see app/merge_apply.py's module docstring
    for exactly which tables and why). Always compares against a fresh
    snapshot of the LIVE database, not any backup zip, so repeated calls
    are safe/idempotent.

    Body: {"path_b": "<full_path from /available>", "dry_run": true}

    dry_run defaults to true -- callers must explicitly send
    {"dry_run": false} to actually persist changes. This mirrors
    merge_apply()'s own default for the same reason: a write this
    consequential should never happen by omission.
    """
    from ..merge_apply import apply_merge

    body = request.get_json(silent=True) or {}
    path_b = body.get("path_b")
    dry_run = body.get("dry_run", True)

    if not path_b:
        return jsonify({"ok": False, "message": "Missing required 'path_b' in request body."}), 400
    if not path_b.lower().endswith(".zip") or not os.path.isfile(path_b):
        return jsonify({"ok": False, "message": "path_b: file not found or not a .zip file."}), 404

    try:
        result = apply_merge(None, path_b, dry_run_only=dry_run)
    except Exception as e:  # noqa: BLE001 -- surfaced to the caller, not swallowed
        return jsonify({"ok": False, "message": f"Merge apply failed: {e}"}), 500

    return jsonify(result), (200 if result["ok"] else 422)
