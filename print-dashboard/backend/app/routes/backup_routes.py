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

from flask import Blueprint, current_app, jsonify

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
