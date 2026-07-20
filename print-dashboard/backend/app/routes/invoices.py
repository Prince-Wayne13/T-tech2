from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import AuditLog, Invoice
from ..services.invoices import apply_line_items, apply_payments, serialize_invoice, sync_invoice_amount
from ..utils import parse_date
from .common import apply_search, list_response

bp = Blueprint("invoices", __name__)


def next_invoice_ref():
    last = Invoice.query.order_by(Invoice.id.desc()).first()
    return f"INV-{((last.id if last else 0) + 1):04d}"


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
    data = request.get_json() or {}
    invoice = Invoice(
        invoice_ref=data.get("invoice_ref") or next_invoice_ref(),
        client_id=data.get("client_id"),
        client_name=data["client_name"],
        title=data["title"],
        amount=data.get("amount", 0),
        discount_amount=data.get("discount_amount", 0),
        tax_rate=data.get("tax_rate", 0),
        currency=data.get("currency", "MWK"),
        status=data.get("status", "draft"),
        issued_on=parse_date(data.get("issued_on")),
        due_on=parse_date(data.get("due_on")),
        paid_on=parse_date(data.get("paid_on")),
        purchase_order=data.get("purchase_order"),
        payment_terms=data.get("payment_terms", "Due on receipt"),
        notes=data.get("notes"),
    )
    apply_line_items(invoice, data.get("line_items"))
    apply_payments(invoice, data.get("payments"))
    sync_invoice_amount(invoice)
    db.session.add(invoice)
    db.session.flush()
    db.session.add(AuditLog(action=f"Created invoice {invoice.invoice_ref}", entity_type="invoice", entity_id=invoice.id))
    db.session.commit()
    return jsonify(serialize_invoice(invoice, include_document=True)), 201


@bp.get("/stats")
def invoice_stats():
    invoices = Invoice.query.all()
    totals = [serialize_invoice(invoice)["totals"] | {"status": invoice.status} for invoice in invoices]
    return jsonify(
        {
            "invoice_count": len(invoices),
            "outstanding": sum(item["balance"] for item in totals if item["status"] in {"sent", "overdue"}),
            "paid": sum(item["paid"] for item in totals),
            "draft": sum(item["total"] for item in totals if item["status"] == "draft"),
            "overdue_count": len([invoice for invoice in invoices if serialize_invoice(invoice)["is_overdue"]]),
        }
    )


@bp.get("/<int:invoice_id>")
def get_invoice(invoice_id):
    return jsonify(serialize_invoice(Invoice.query.get_or_404(invoice_id), include_document=True))


@bp.put("/<int:invoice_id>")
def update_invoice(invoice_id):
    invoice = Invoice.query.get_or_404(invoice_id)
    data = request.get_json() or {}
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
    if "payments" in data:
        apply_payments(invoice, data.get("payments"))
        sync_invoice_amount(invoice)
    db.session.add(AuditLog(action=f"Updated invoice {invoice.invoice_ref}", entity_type="invoice", entity_id=invoice.id))
    db.session.commit()
    return jsonify(serialize_invoice(invoice, include_document=True))


@bp.get("/<int:invoice_id>/document")
def invoice_document(invoice_id):
    return jsonify(serialize_invoice(Invoice.query.get_or_404(invoice_id), include_document=True)["document"])
