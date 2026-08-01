#route/proposals.py
from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import AuditLog, Invoice, Job, Proposal
from ..services.jobs import ACTIVE_STATUS, create_invoice_for_job, serialize_job
from ..services.invoices import serialize_invoice
from ..services.proposals import apply_proposal_line_items, serialize_proposal
from ..services.ref_generator import next_proposal_ref, next_invoice_ref, next_job_ref
from ..utils import parse_date
from .common import apply_search, list_response

bp = Blueprint("proposals", __name__)


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
        priority=data.get("priority", "medium"),
        assigned_staff_id=data.get("assigned_staff_id"),
        # Build decision #5: mirrors Job's own machine_id/
        # required_capability_id exactly.
        machine_id=data.get("machine_id"),
        required_capability_id=data.get("required_capability_id"),
        prepared_by=data.get("prepared_by"),
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
    for field in ["client_name", "title", "status", "discount_amount", "currency", "contact", "priority", "assigned_staff_id", "machine_id", "required_capability_id", "prepared_by", "notes"]:
        if field in data:
            setattr(proposal, field, data[field])
    if "valid_until" in data:
        proposal.valid_until = parse_date(data.get("valid_until"))
        # Fix: keep the derived Job's due_date in sync with the Proposal's
        # own due-date field. Previously, once a Proposal was accepted and
        # converted to a Job, editing the Proposal's valid_until afterwards
        # (still allowed at any status, per prompt item 6) had no effect on
        # the Job the business actually schedules against - the two dates
        # silently diverged. Job.due_date is now re-derived here at the
        # source whenever the Proposal's date changes and a Job already
        # exists from it, rather than patched independently in the frontend.
        if proposal.converted_invoice and proposal.converted_invoice.job:
            proposal.converted_invoice.job.due_date = proposal.valid_until
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

    job = Job(
        job_ref=next_job_ref(),
        client_id=proposal.client_id,
        client_name=proposal.client_name,
        title=proposal.title,
        status=ACTIVE_STATUS,
        priority=proposal.priority or "medium",
        progress=10,
        total_count=len(proposal.line_items),
        # Fix: due_date was never carried over from the Proposal on job
        # creation, so create_invoice_for_job() (which correctly reads
        # job.due_date to set the derived Invoice's due_on) always received
        # None here. valid_until is the Proposal's only date field, so it's
        # the source of truth for the Job's initial due_date.
        due_date=proposal.valid_until,
        assigned_staff_id=proposal.assigned_staff_id,
        # Build decision #5: same carry-over pattern already used for
        # assigned_staff_id above -- machine_id and
        # required_capability_id were captured on the Proposal but
        # would otherwise never reach the Job created here.
        machine_id=proposal.machine_id,
        required_capability_id=proposal.required_capability_id,
        notes=proposal.notes,
    )
    invoice = create_invoice_for_job(
        job,
        next_invoice_ref(),
        [
            {
                "description": item.description,
                "quantity": float(item.quantity or 1),
                "unit": item.unit or "item",
                "unit_price": float(item.unit_price or item.amount or 0),
                # Same carry-over, at the per-line-item level -- build
                # decision #5's "one job can need several machines"
                # (InvoiceLineItem already supports this per-line).
                "pricing_item_id": item.pricing_item_id,
                "machine_id": item.machine_id,
            }
            for item in proposal.line_items
        ],
        discount_amount=proposal.discount_amount,
        currency=proposal.currency,
        notes=proposal.notes,
    )
    db.session.add(job)
    db.session.add(invoice)
    db.session.flush()

    proposal.status = "accepted"
    proposal.converted_invoice_id = invoice.id
    db.session.add(AuditLog(
        action=f"Converted proposal {proposal.proposal_ref} to job {job.job_ref} and invoice {invoice.invoice_ref}",
        entity_type="proposal",
        entity_id=proposal.id,
    ))
    db.session.commit()

    return jsonify({"job": serialize_job(job), "invoice": serialize_invoice(invoice, include_document=True)}), 201