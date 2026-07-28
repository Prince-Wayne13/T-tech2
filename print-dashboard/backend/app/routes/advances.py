from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import Advance, AuditLog
from ..services.ref_generator import next_advance_ref
from ..utils import parse_date
from .common import apply_search, list_response

bp = Blueprint("advances", __name__)


@bp.get("")
def list_advances():
    query = Advance.query
    status = request.args.get("status")
    if status and status.lower() != "all":
        query = query.filter(Advance.status == status.lower())
    query = apply_search(query, Advance, ["advance_ref", "recipient", "notes"])
    return jsonify(list_response(query.order_by(Advance.created_at.desc())))


@bp.post("")
def create_advance():
    data = request.get_json() or {}
    advance = Advance(
        advance_ref=data.get("advance_ref") or next_advance_ref(),
        recipient=data["recipient"],
        amount=data.get("amount", 0),
        status=data.get("status", "open"),
        issued_on=parse_date(data.get("issued_on")),
        settled_on=parse_date(data.get("settled_on")),
        notes=data.get("notes"),
    )
    db.session.add(advance)
    db.session.flush()
    db.session.add(AuditLog(action=f"Created advance {advance.advance_ref}", entity_type="advance", entity_id=advance.id))
    db.session.commit()
    return jsonify(advance.to_dict()), 201