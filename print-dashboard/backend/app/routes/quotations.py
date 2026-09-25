#route/quotations.py
from datetime import date

from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import AuditLog, Invoice, Job, Quotation
from ..services.jobs import ACTIVE_STATUS, create_invoice_for_job, serialize_job
from ..services.invoices import serialize_invoice
from ..services.quotations import apply_quotation_line_items, serialize_quotation
from ..services.ref_generator import next_quotation_ref, next_invoice_ref, next_job_ref
from ..utils import parse_date
from .common import apply_search, list_response, require_fields, MissingFieldError

bp = Blueprint("quotations", __name__)


@bp.get("")
def list_quotations():
    query = Quotation.query
    status = request.args.get("status")
    if status and status.lower() != "all":
        query = query.filter(Quotation.status == status.lower())
    query = apply_search(query, Quotation, ["quotation_ref", "client_name", "title"])
    return jsonify(list_response(query.order_by(Quotation.created_at.desc()), serialize_quotation))


@bp.post("")
def create_quotation():
    data = request.get_json() or {}
    try:
        require_fields(data, [("client_name", "Client"), ("title", "Title")])
    except MissingFieldError as error:
        return jsonify({"error": str(error)}), 400
    quotation = Quotation(
        quotation_ref=data.get("quotation_ref") or next_quotation_ref(),
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
        # The real date this quotation actually happened. Defaults to today
        # so ordinary same-day entry needs no extra step, but a late entry
        # (e.g. typing in a 1 August quotation on 24 September) can send its
        # own work_date and have that be the date that sticks on the
        # printed document -- created_at still separately records today
        # as the actual entry time, for the internal log.
        work_date=parse_date(data.get("work_date")) or date.today(),
    )
    apply_quotation_line_items(quotation, data.get("line_items"))
    db.session.add(quotation)
    db.session.flush()
    db.session.add(AuditLog(action=f"Created quotation {quotation.quotation_ref}", entity_type="quotation", entity_id=quotation.id))
    db.session.commit()
    return jsonify(serialize_quotation(quotation)), 201


@bp.get("/<int:quotation_id>")
def get_quotation(quotation_id):
    return jsonify(serialize_quotation(Quotation.query.get_or_404(quotation_id)))


@bp.put("/<int:quotation_id>")
def update_quotation(quotation_id):
    quotation = Quotation.query.get_or_404(quotation_id)
    data = request.get_json() or {}
    try:
        require_fields(
            {k: v for k, v in data.items() if k in ("client_name", "title")},
            [(k, label) for k, label in [("client_name", "Client"), ("title", "Title")] if k in data],
        )
    except MissingFieldError as error:
        return jsonify({"error": str(error)}), 400
    for field in ["client_id", "client_name", "title", "status", "discount_amount", "currency", "contact", "priority", "assigned_staff_id", "machine_id", "required_capability_id", "prepared_by", "notes"]:
        if field in data:
            setattr(quotation, field, data[field])
    if "work_date" in data:
        # Lets a late/backdated entry be corrected afterwards, same as
        # Job.work_date's own edit path in routes/jobs.py.
        quotation.work_date = parse_date(data.get("work_date")) or quotation.work_date
    if "valid_until" in data:
        quotation.valid_until = parse_date(data.get("valid_until"))
        # Fix: keep the derived Job's due_date in sync with the Quotation's
        # own due-date field. Previously, once a Quotation was accepted and
        # converted to a Job, editing the Quotation's valid_until afterwards
        # (still allowed at any status, per prompt item 6) had no effect on
        # the Job the business actually schedules against - the two dates
        # silently diverged. Job.due_date is now re-derived here at the
        # source whenever the Quotation's date changes and a Job already
        # exists from it, rather than patched independently in the frontend.
        if quotation.converted_invoice and quotation.converted_invoice.job:
            quotation.converted_invoice.job.due_date = quotation.valid_until
    if "line_items" in data:
        apply_quotation_line_items(quotation, data.get("line_items"))
    db.session.add(AuditLog(action=f"Updated quotation {quotation.quotation_ref}", entity_type="quotation", entity_id=quotation.id))
    db.session.commit()
    return jsonify(serialize_quotation(quotation))


@bp.post("/<int:quotation_id>/accept")
def accept_quotation(quotation_id):
    quotation = Quotation.query.get_or_404(quotation_id)
    if quotation.status == "accepted" and quotation.converted_invoice_id:
        return jsonify({"error": "Quotation already converted"}), 400

    job = Job(
        job_ref=next_job_ref(),
        client_id=quotation.client_id,
        client_name=quotation.client_name,
        title=quotation.title,
        status=ACTIVE_STATUS,
        priority=quotation.priority or "medium",
        progress=10,
        total_count=len(quotation.line_items),
        # Fix: due_date was never carried over from the Quotation on job
        # creation, so create_invoice_for_job() (which correctly reads
        # job.due_date to set the derived Invoice's due_on) always received
        # None here. valid_until is the Quotation's only date field, so it's
        # the source of truth for the Job's initial due_date.
        due_date=quotation.valid_until,
        assigned_staff_id=quotation.assigned_staff_id,
        # Build decision #5: same carry-over pattern already used for
        # assigned_staff_id above -- machine_id and
        # required_capability_id were captured on the Quotation but
        # would otherwise never reach the Job created here.
        machine_id=quotation.machine_id,
        required_capability_id=quotation.required_capability_id,
        notes=quotation.notes,
        # Carry the quotation's real date forward to the job it becomes --
        # without this, converting a backdated quotation (e.g. one really
        # made on 1 August) into a job would silently reset to today, the
        # exact bug being fixed here, just one step later in the chain.
        work_date=quotation.work_date,
    )
    invoice = create_invoice_for_job(
        job,
        next_invoice_ref(),
        [
            {
                "description": item.description,
                "quantity": float(item.quantity or 1),
                "unit": item.unit or "item",
                "unit_price": float(
                    item.unit_price
                    or ((item.amount or 0) / (item.quantity or 1) if (item.amount or 0) > 0 else 0)
                ),
                # Same carry-over, at the per-line-item level -- build
                # decision #5's "one job can need several machines"
                # (InvoiceLineItem already supports this per-line).
                "pricing_item_id": item.pricing_item_id,
                "machine_id": item.machine_id,
            }
            for item in quotation.line_items
        ],
        discount_amount=quotation.discount_amount,
        currency=quotation.currency,
        notes=quotation.notes,
        work_date=quotation.work_date,
    )
    db.session.add(job)
    db.session.add(invoice)
    db.session.flush()

    quotation.status = "accepted"
    quotation.converted_invoice_id = invoice.id
    db.session.add(AuditLog(
        action=f"Converted quotation {quotation.quotation_ref} to job {job.job_ref} and invoice {invoice.invoice_ref}",
        entity_type="quotation",
        entity_id=quotation.id,
    ))
    db.session.commit()

    return jsonify({"job": serialize_job(job), "invoice": serialize_invoice(invoice, include_document=True)}), 201
