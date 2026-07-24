# path: backend/app/routes/vendors.py

from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import AuditLog, Vendor
from ..services.vendors import serialize_vendor, vendor_balance_summaries, vendor_balance_summary
from .common import apply_search, list_response

bp = Blueprint("vendors", __name__)


@bp.get("")
def list_vendors():
    query = Vendor.query
    status = request.args.get("status")
    if status and status.lower() != "all":
        query = query.filter(Vendor.status == status.lower())
    query = apply_search(query, Vendor, ["name", "category", "email", "phone"])
    paginated = list_response(query.order_by(Vendor.name.asc()))
    # Item 1: batch-derive paid/owed for every vendor on this page in one
    # query, rather than N+1'ing vendor_balance_summary() per row.
    vendor_ids = [item["id"] for item in paginated["items"]]
    summaries = vendor_balance_summaries(vendor_ids)
    vendors_by_id = {vendor.id: vendor for vendor in Vendor.query.filter(Vendor.id.in_(vendor_ids)).all()} if vendor_ids else {}
    paginated["items"] = [
        serialize_vendor(vendors_by_id[item["id"]], summaries.get(item["id"]))
        for item in paginated["items"]
    ]
    return jsonify(paginated)


@bp.get("/<int:vendor_id>")
def get_vendor(vendor_id):
    vendor = Vendor.query.get_or_404(vendor_id)
    return jsonify(serialize_vendor(vendor))


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
    return jsonify(serialize_vendor(vendor)), 201


@bp.put("/<int:vendor_id>")
def update_vendor(vendor_id):
    vendor = Vendor.query.get_or_404(vendor_id)
    data = request.get_json() or {}
    for field in ["name", "category", "phone", "email", "status"]:
        if field in data:
            setattr(vendor, field, data[field])
    db.session.add(AuditLog(action=f"Updated vendor {vendor.name}", entity_type="vendor", entity_id=vendor.id))
    db.session.commit()
    return jsonify(serialize_vendor(vendor))


@bp.get("/<int:vendor_id>/ledger")
def vendor_ledger(vendor_id):
    """Item 1: explicit "what have we paid / what do we owe" breakdown for
    one vendor, plus the underlying expense rows so the frontend can list
    them without a second endpoint.
    """
    vendor = Vendor.query.get_or_404(vendor_id)
    from ..models import Expense
    expenses = (
        Expense.query.filter(Expense.vendor_id == vendor_id)
        .order_by(Expense.expense_date.desc())
        .all()
    )
    summary = vendor_balance_summary(vendor_id)
    return jsonify({
        "vendor": serialize_vendor(vendor, summary),
        "summary": {
            "paid": float(summary["paid"]),
            "owed": float(summary["owed"]),
            "total": float(summary["total"]),
        },
        "expenses": [
            expense.to_dict() | {"is_paid": expense.status in {"approved", "reimbursed", "paid"} and bool(expense.paid_on)}
            for expense in expenses
        ],
    })