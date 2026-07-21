# path: backend/app/routes/proposals.py

from datetime import date

from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import AuditLog, Invoice, Proposal
from ..services.invoices import apply_line_items, serialize_invoice, sync_invoice_amount
from ..services.proposals import apply_proposal_line_items, serialize_proposal
from ..utils import parse_date
from .common import apply_search, list_response

bp = Blueprint("proposals", __name__)


def next_proposal_ref():
    last = Proposal.query.order_by(Proposal.id.desc()).first()
    return f"PROP-{((last.id if last else 0) + 1):04d}"


def next_invoice_ref():
    last = Invoice.query.order_by(Invoice.id.desc()).first()
    return f"INV-{((last.id if last else 0) + 1):04d}"


@bp.get("")
def list_proposals():
    query = Proposal.query
    status = request.args.get("status")
    if status and status.lower() != "all":
        query = query.filter(Proposal.status == status.lower())
    query = apply_search(query, Proposal, ["proposal_ref", "client_name", "title"])
    return jsonify(list_response(query.order_by(Proposal.created_at.desc()), serialize_proposal))


@bp.post("")
def create_proposal():
    data = request.get_json() or {}
    proposal = Proposal(
        proposal_ref=data.get("proposal_ref") or next_proposal_ref(),
        client_id=data.get("client_id"),
        client_name=data["client_name"],
        title=data["title"],
        status=data.get("status", "draft"),
        discount_amount=data.get("discount_amount", 0),
        currency=data.get("currency", "MWK"),
        valid_until=parse_date(data.get("valid_until")),
        contact=data.get("contact"),
        notes=data.get("notes"),
    )
    apply_proposal_line_items(proposal, data.get("line_items"))
    db.session.add(proposal)
    db.session.flush()
    db.session.add(AuditLog(action=f"Created proposal {proposal.proposal_ref}", entity_type="proposal", entity_id=proposal.id))
    db.session.commit()
    return jsonify(serialize_proposal(proposal)), 201


@bp.get("/<int:proposal_id>")
def get_proposal(proposal_id):
    return jsonify(serialize_proposal(Proposal.query.get_or_404(proposal_id)))


@bp.put("/<int:proposal_id>")
def update_proposal(proposal_id):
    proposal = Proposal.query.get_or_404(proposal_id)
    data = request.get_json() or {}
    for field in ["client_name", "title", "status", "discount_amount", "currency", "contact", "notes"]:
        if field in data:
            setattr(proposal, field, data[field])
    if "valid_until" in data:
        proposal.valid_until = parse_date(data.get("valid_until"))
    if "line_items" in data:
        apply_proposal_line_items(proposal, data.get("line_items"))
    db.session.add(AuditLog(action=f"Updated proposal {proposal.proposal_ref}", entity_type="proposal", entity_id=proposal.id))
    db.session.commit()
    return jsonify(serialize_proposal(proposal))


@bp.post("/<int:proposal_id>/accept")
def accept_proposal(proposal_id):
    proposal = Proposal.query.get_or_404(proposal_id)
    if proposal.status == "accepted" and proposal.converted_invoice_id:
        return jsonify({"error": "Proposal already converted"}), 400

    invoice = Invoice(
        invoice_ref=next_invoice_ref(),
        client_id=proposal.client_id,
        client_name=proposal.client_name,
        title=proposal.title,
        status="draft",
        discount_amount=proposal.discount_amount,
        tax_rate=0,
        currency=proposal.currency,
        issued_on=date.today(),
        notes=proposal.notes,
    )
    # Map ProposalLineItem {description, amount} -> InvoiceLineItem {description, quantity=1, unit_price=amount}.
    # This is a deliberate one-time transformation at conversion time, not a stored
    # mismatch — see dev-log.md for why Proposal uses its own line item shape.
    apply_line_items(invoice, [
        {"description": item.description, "quantity": 1, "unit_price": float(item.amount)}
        for item in proposal.line_items
    ])
    sync_invoice_amount(invoice)

    db.session.add(invoice)
    db.session.flush()

    proposal.status = "accepted"
    proposal.converted_invoice_id = invoice.id

    db.session.add(AuditLog(
        action=f"Converted proposal {proposal.proposal_ref} to invoice {invoice.invoice_ref}",
        entity_type="proposal",
        entity_id=proposal.id,
    ))
    db.session.commit()

    return jsonify(serialize_invoice(invoice, include_document=True)), 201