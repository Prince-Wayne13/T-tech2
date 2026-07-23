# path: backend/app/routes/petty_cash.py

from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import AuditLog, PettyCash
from ..services.petty_cash import petty_cash_balance, record_petty_cash_entry, serialize_petty_cash_entry
from .common import apply_search, list_response

bp = Blueprint("petty_cash", __name__)


@bp.get("")
def list_petty_cash():
    query = PettyCash.query
    entry_type = request.args.get("entry_type")
    if entry_type and entry_type.lower() != "all":
        query = query.filter(PettyCash.entry_type == entry_type.lower())
    query = apply_search(query, PettyCash, ["entry_ref", "notes"])
    return jsonify(list_response(query.order_by(PettyCash.created_at.desc()), serialize_petty_cash_entry))


@bp.get("/balance")
def get_balance():
    return jsonify({"balance": float(petty_cash_balance())})


@bp.post("")
def create_petty_cash_entry():
    data = request.get_json() or {}
    entry_type = (data.get("entry_type") or "").lower()
    try:
        entry = record_petty_cash_entry(
            entry_type=entry_type,
            amount=data.get("amount", 0),
            staff_id=data.get("staff_id"),
            notes=data.get("notes"),
            category=data.get("category"),
            title=data.get("title"),
            submitted_by=data.get("submitted_by"),
            expense_date=data.get("expense_date"),
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    db.session.add(AuditLog(
        action=f"Recorded petty cash entry {entry.entry_ref} ({entry.entry_type})",
        entity_type="petty_cash",
        entity_id=entry.id,
    ))
    db.session.commit()
    return jsonify(serialize_petty_cash_entry(entry) | {"balance": float(petty_cash_balance())}), 201