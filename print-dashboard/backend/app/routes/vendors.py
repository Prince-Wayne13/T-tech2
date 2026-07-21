# path: backend/app/routes/vendors.py

from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import AuditLog, Vendor
from .common import apply_search, list_response

bp = Blueprint("vendors", __name__)


@bp.get("")
def list_vendors():
    query = Vendor.query
    status = request.args.get("status")
    if status and status.lower() != "all":
        query = query.filter(Vendor.status == status.lower())
    query = apply_search(query, Vendor, ["name", "category", "email", "phone"])
    return jsonify(list_response(query.order_by(Vendor.name.asc())))


@bp.post("")
def create_vendor():
    data = request.get_json() or {}
    vendor = Vendor(
        name=data["name"],
        category=data.get("category"),
        phone=data.get("phone") or data.get("contact"),
        email=data.get("email"),
        status=data.get("status", "current"),
    )
    db.session.add(vendor)
    db.session.flush()
    db.session.add(AuditLog(action=f"Created vendor {vendor.name}", entity_type="vendor", entity_id=vendor.id))
    db.session.commit()
    return jsonify(vendor.to_dict()), 201


@bp.put("/<int:vendor_id>")
def update_vendor(vendor_id):
    vendor = Vendor.query.get_or_404(vendor_id)
    data = request.get_json() or {}
    for field in ["name", "category", "phone", "email", "status"]:
        if field in data:
            setattr(vendor, field, data[field])
    db.session.add(AuditLog(action=f"Updated vendor {vendor.name}", entity_type="vendor", entity_id=vendor.id))
    db.session.commit()
    return jsonify(vendor.to_dict())