# path: backend/app/routes/sales.py

from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import AuditLog, Job, Sale
from ..services.sales import create_sale_for_job, serialize_sale, sync_sale_amount
from .common import apply_search, list_response

bp = Blueprint("sales", __name__)


@bp.get("")
def list_sales():
    query = Sale.query
    query = apply_search(query, Sale, ["sale_ref", "description"])
    return jsonify(list_response(query.order_by(Sale.created_at.desc()), serialize_sale))


@bp.post("")
def create_sale():
    # Item 7: every Sale must reference an existing Job - no standalone
    # entries. job_id is required; there is no path that creates a Sale
    # without one.
    data = request.get_json() or {}
    job_id = data.get("job_id")
    if not job_id:
        return jsonify({"error": "job_id is required"}), 400
    job = Job.query.get_or_404(job_id)
    sale = create_sale_for_job(job, description=data.get("description"), notes=data.get("notes"))
    db.session.add(sale)
    db.session.flush()
    db.session.add(AuditLog(action=f"Created sale {sale.sale_ref} for {job.job_ref}", entity_type="sale", entity_id=sale.id))
    db.session.commit()
    return jsonify(serialize_sale(sale)), 201


@bp.get("/<int:sale_id>")
def get_sale(sale_id):
    sale = Sale.query.get_or_404(sale_id)
    # Amount is derived, not stored-and-trusted blindly - re-sync on read in
    # case the linked job's invoice/payment status changed since creation.
    sync_sale_amount(sale)
    db.session.commit()
    return jsonify(serialize_sale(sale))


@bp.put("/<int:sale_id>")
def update_sale(sale_id):
    sale = Sale.query.get_or_404(sale_id)
    data = request.get_json() or {}
    for field in ["description", "notes"]:
        if field in data:
            setattr(sale, field, data[field])
    # amount is deliberately not accepted from the request body here - it is
    # always re-derived from the linked job, never manually set.
    sync_sale_amount(sale)
    db.session.add(AuditLog(action=f"Updated sale {sale.sale_ref}", entity_type="sale", entity_id=sale.id))
    db.session.commit()
    return jsonify(serialize_sale(sale))