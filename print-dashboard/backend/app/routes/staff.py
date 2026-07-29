# path: backend/app/routes/staff.py

from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import AuditLog, Staff
from .common import apply_search, list_response

bp = Blueprint("staff", __name__)


@bp.get("")
def list_staff():
    query = Staff.query
    active = request.args.get("active")
    if active is not None:
        query = query.filter(Staff.active == (active.lower() in {"1", "true", "yes"}))
    query = apply_search(query, Staff, ["name", "role"])
    return jsonify(list_response(query.order_by(Staff.name.asc())))


@bp.post("")
def create_staff():
    from ..services.ref_generator import next_staff_ref

    data = request.get_json() or {}
    staff = Staff(
        staff_ref=next_staff_ref(),
        name=data["name"],
        role=data.get("role"),
        active=data.get("active", True),
        notes=data.get("notes"),
    )
    db.session.add(staff)
    db.session.flush()
    db.session.add(AuditLog(action=f"Added staff member {staff.name}", entity_type="staff", entity_id=staff.id))
    db.session.commit()
    return jsonify(staff.to_dict()), 201


@bp.put("/<int:staff_id>")
def update_staff(staff_id):
    staff = Staff.query.get_or_404(staff_id)
    data = request.get_json() or {}
    for field in ["name", "role", "active", "notes"]:
        if field in data:
            setattr(staff, field, data[field])
    db.session.add(AuditLog(action=f"Updated staff member {staff.name}", entity_type="staff", entity_id=staff.id))
    db.session.commit()
    return jsonify(staff.to_dict())