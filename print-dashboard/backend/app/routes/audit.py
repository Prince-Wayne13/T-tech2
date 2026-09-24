from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import AuditLog, DebugEvent
from .common import list_response

bp = Blueprint("audit", __name__)
MAX_DEBUG_TEXT = 3000


def _clip(value):
    if value is None:
        return None
    text = value if isinstance(value, str) else str(value)
    if len(text) <= MAX_DEBUG_TEXT:
        return text
    return f"{text[:MAX_DEBUG_TEXT]}... [truncated {len(text) - MAX_DEBUG_TEXT} chars]"


@bp.get("")
def list_audit_logs():
    return jsonify(list_response(AuditLog.query.order_by(AuditLog.created_at.desc())))


@bp.get("/debug")
def list_debug_events():
    query = DebugEvent.query
    level = request.args.get("level")
    if level and level.lower() != "all":
        query = query.filter(DebugEvent.level == level.lower())
    return jsonify(list_response(query.order_by(DebugEvent.created_at.desc())))


@bp.post("/debug")
def create_debug_event():
    data = request.get_json(silent=True) or {}
    event = DebugEvent(
        level=(data.get("level") or "info").lower(),
        source=data.get("source") or "frontend",
        event=data.get("event") or "api",
        method=data.get("method"),
        path=data.get("path"),
        status_code=data.get("status_code"),
        duration_ms=data.get("duration_ms"),
        message=_clip(data.get("message") or "API event"),
        request_body=_clip(data.get("request_body")),
        response_body=_clip(data.get("response_body")),
        error=_clip(data.get("error")),
    )
    db.session.add(event)
    db.session.commit()
    return jsonify(event.to_dict()), 201
