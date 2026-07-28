"""
reports_backup_routes.py

Web addresses for the weekly encrypted reports package (cashflow,
income statement, analytics -- zipped, password-protected, sent to
Drive only). Separate from backup_routes.py, since this is a
completely separate system with its own weekly timing rule.

    POST /api/reports-backup/send-now
        Sends the reports package right now, "whichever happens
        first" rule -- works whether or not a week has actually
        passed yet. Blocked (409) if one is already in progress.

    GET /api/reports-backup/status
        Returns whether a send is currently due, blocked (inactive),
        or was just sent, plus when the last one went out and when
        the next one is due.
"""

from __future__ import annotations

from flask import Blueprint, current_app, jsonify

bp = Blueprint("reports_backup", __name__)


def _get_scheduler():
    scheduler = current_app.config.get("REPORTS_SCHEDULER")
    if scheduler is None:
        raise RuntimeError(
            "REPORTS_SCHEDULER not found in app.config. "
            "lifecycle.py's bootstrap_app() must set this before these routes are used."
        )
    return scheduler


@bp.route("/send-now", methods=["POST"])
def send_now():
    scheduler = _get_scheduler()

    if scheduler._lock.locked():
        return jsonify({
            "ok": False,
            "message": "A reports send is already in progress. Please wait for it to finish.",
        }), 409

    result = scheduler.send_now(reason="manual button")

    return jsonify({
        "ok": result.ok,
        "message": result.message,
        "dest_path": result.dest_path,
        "timestamp": result.timestamp.isoformat(),
    }), (200 if result.ok else 500)


@bp.route("/status", methods=["GET"])
def status():
    scheduler = _get_scheduler()
    return jsonify(scheduler.get_status())
