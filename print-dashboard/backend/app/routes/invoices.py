# path: backend/app/routes/invoices.py

from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import AuditLog, Invoice
from ..services.invoices import apply_line_items, serialize_invoice, sync_invoice_amount
from ..services.ref_generator import next_invoice_ref
from ..utils import parse_date
from .common import apply_search, list_response, require_fields, MissingFieldError

bp = Blueprint("invoices", __name__)


@bp.get("")
def list_invoices():
    query = Invoice.query
    status = request.args.get("status")
    if status and status.lower() != "all":
        query = query.filter(Invoice.status == status.lower())
    query = apply_search(query, Invoice, ["invoice_ref", "client_name", "title"])
    return jsonify(list_response(query.order_by(Invoice.created_at.desc()), serialize_invoice))


@bp.post("")
def create_invoice():
    # Direct (jobless) invoice creation is closed: every invoice must come
    # from a Job (POST /api/jobs or quotation accept), otherwise payments on
    # it would never produce a Sale row and would be invisible on the Sales
    # page while still counting toward Cash Balance.
    return jsonify({"error": "Invoices are created from Jobs/Quotations only"}), 405


@bp.get("/stats")
def invoice_stats():
    invoices = Invoice.query.all()
    serialized = [serialize_invoice(invoice) for invoice in invoices]
    totals = [item["totals"] | {"status": item["status"]} for item in serialized]
    return jsonify(
        {
            "invoice_count": len(invoices),
            "outstanding": sum(item["balance"] for item in totals if item["status"] in {"not_paid", "partial", "sent", "overdue"}),
            "paid": sum(item["paid"] for item in totals),
            "draft": sum(item["total"] for item in totals if item["status"] == "draft"),
            "overdue_count": len([item for item in serialized if item["is_overdue"]]),
        }
    )


@bp.get("/<int:invoice_id>")
def get_invoice(invoice_id):
    return jsonify(serialize_invoice(Invoice.query.get_or_404(invoice_id), include_document=True))


@bp.put("/<int:invoice_id>")
def update_invoice(invoice_id):
    invoice = Invoice.query.get_or_404(invoice_id)
    data = request.get_json() or {}
    try:
        require_fields(
            {k: v for k, v in data.items() if k in ("client_name", "title")},
            [(k, label) for k, label in [("client_name", "Client"), ("title", "Title")] if k in data],
        )
    except MissingFieldError as error:
        return jsonify({"error": str(error)}), 400
    for field in ["client_name", "title", "status", "amount", "discount_amount", "tax_rate", "currency", "purchase_order", "payment_terms", "notes"]:
        if field in data:
            setattr(invoice, field, data[field])
    if "issued_on" in data:
        invoice.issued_on = parse_date(data.get("issued_on"))
    if "due_on" in data:
        invoice.due_on = parse_date(data.get("due_on"))
    if "paid_on" in data:
        invoice.paid_on = parse_date(data.get("paid_on"))
    if "line_items" in data:
        apply_line_items(invoice, data.get("line_items"))
        sync_invoice_amount(invoice)
    # "payments" in the body is intentionally ignored: payments are recorded
    # only via POST/PUT /api/jobs/<job_id>/payments so Sales stays in sync.
    db.session.add(AuditLog(action=f"Updated invoice {invoice.invoice_ref}", entity_type="invoice", entity_id=invoice.id))
    db.session.commit()
    return jsonify(serialize_invoice(invoice, include_document=True))


@bp.get("/<int:invoice_id>/document")
def invoice_document(invoice_id):
    return jsonify(serialize_invoice(Invoice.query.get_or_404(invoice_id), include_document=True)["document"])

