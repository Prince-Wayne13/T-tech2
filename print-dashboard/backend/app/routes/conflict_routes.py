"""
conflict_routes.py

API surface for the sync conflict review feature: listing pending
conflicts (for the notification bar), and resolving one via approve,
skip, or permanent dismiss.

Registered at /api/sync-conflicts in app/routes/__init__.py.
"""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from ..models import SyncConflict

bp = Blueprint("sync_conflicts", __name__)


@bp.route("", methods=["GET"])
def list_conflicts():
    """Lists conflicts. Defaults to pending only (what the notification
    bar shows); pass ?status=all to see resolved/skipped/dismissed too.
    """
    status_filter = request.args.get("status", "pending")
    query = SyncConflict.query
    if status_filter != "all":
        query = query.filter_by(status=status_filter)
    conflicts = query.order_by(SyncConflict.created_at.desc()).all()
    return jsonify({
        "conflicts": [c.to_dict() for c in conflicts],
        "count": len(conflicts),
    })


@bp.route("/<int:conflict_id>", methods=["GET"])
def get_conflict(conflict_id):
    conflict = SyncConflict.query.get(conflict_id)
    if conflict is None:
        return jsonify({"ok": False, "message": f"No conflict found with id={conflict_id}."}), 404
    return jsonify(conflict.to_dict())


@bp.route("/<int:conflict_id>/resolve", methods=["POST"])
def resolve(conflict_id):
    """Body: {"action": "approve" | "skip"}."""
    from ..merge_apply import resolve_conflict

    body = request.get_json(silent=True) or {}
    action = body.get("action")
    if action not in ("approve", "skip"):
        return jsonify({"ok": False, "message": "Body must include \"action\": \"approve\" or \"skip\"."}), 400

    result = resolve_conflict(conflict_id, action)
    return jsonify(result), (200 if result.get("ok") else 400)


@bp.route("/<int:conflict_id>/dismiss", methods=["POST"])
def dismiss(conflict_id):
    """Permanent dismiss -- distinct from skip. Never resurfaces after this."""
    from ..merge_apply import permanently_dismiss_conflict

    result = permanently_dismiss_conflict(conflict_id)
    return jsonify(result), (200 if result.get("ok") else 400)