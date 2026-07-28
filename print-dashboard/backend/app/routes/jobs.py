#routes/jobs.py
from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import AuditLog, Job
from ..services.jobs import (
    ACTIVE_STATUS,
    add_job_payment,
    create_invoice_for_job,
    normalise_job_status,
    serialize_job,
    update_job_payment,
    update_job_progress,
    validate_job_machine_assignment,
)
from ..services.machines import IncompatibleMachineError
from ..services.invoices import apply_line_items, serialize_invoice, sync_invoice_amount
from ..services.ref_generator import next_job_ref, next_invoice_ref
from ..services.sales import serialize_sale
from ..utils import parse_date
from .common import apply_search, list_response

bp = Blueprint("jobs", __name__)


@bp.get("")
def list_jobs():
    query = Job.query
    status = request.args.get("status")
    if status and status.lower() != "all":
        query = query.filter(Job.status == normalise_job_status(status))
    query = apply_search(query, Job, ["job_ref", "client_name", "title"])
    return jsonify(list_response(query.order_by(Job.created_at.desc()), serialize_job))


@bp.post("")
def create_job():
    data = request.get_json() or {}
    try:
        validate_job_machine_assignment(data.get("machine_id"), data.get("required_capability_id"))
    except IncompatibleMachineError as error:
        return jsonify({"error": str(error)}), 400

    job = Job(
        job_ref=data.get("job_ref") or next_job_ref(),
        machine_id=data.get("machine_id"),
        client_id=data.get("client_id"),
        service_category=data.get("service_category"),
        required_capability_id=data.get("required_capability_id"),
        client_name=data["client_name"],
        title=data["title"],
        status=normalise_job_status(data.get("status", ACTIVE_STATUS)),
        priority=data.get("priority", "medium"),
        pages=data.get("pages", 0),
        copies=data.get("copies", 1),
        progress=data.get("progress", 0),
        completed_count=data.get("completed_count", 0),
        total_count=data.get("total_count", 0),
        due_date=parse_date(data.get("due_date")),
        # Item 7 (Prompt 7): accept assigned_staff_id on create, same pattern
        # as machine_id/client_id above.
        assigned_staff_id=data.get("assigned_staff_id"),
        notes=data.get("notes"),
    )
    invoice = create_invoice_for_job(
        job,
        next_invoice_ref(),
        data.get("line_items"),
        discount_amount=data.get("discount_amount", 0),
        currency=data.get("currency", "MWK"),
        notes=data.get("notes"),
    )
    db.session.add(job)
    db.session.add(invoice)
    db.session.flush()
    db.session.add(AuditLog(action=f"Created job {job.job_ref}", entity_type="job", entity_id=job.id))
    db.session.commit()
    return jsonify(serialize_job(job)), 201


@bp.get("/<int:job_id>")
def get_job(job_id):
    return jsonify(serialize_job(Job.query.get_or_404(job_id)))


@bp.put("/<int:job_id>")
def update_job(job_id):
    job = Job.query.get_or_404(job_id)
    data = request.get_json() or {}

    # Priority 2: validate against whichever machine_id/required_capability_id
    # will be in effect after this update - falling back to the job's current
    # values for whichever side isn't being changed in this request, so e.g.
    # changing only the machine still gets checked against the job's existing
    # required capability.
    effective_machine_id = data.get("machine_id", job.machine_id)
    effective_capability_id = data.get("required_capability_id", job.required_capability_id)
    try:
        validate_job_machine_assignment(effective_machine_id, effective_capability_id)
    except IncompatibleMachineError as error:
        return jsonify({"error": str(error)}), 400

    for field in ["machine_id", "service_category", "required_capability_id", "client_name", "title", "status", "priority", "pages", "copies", "progress", "completed_count", "total_count", "assigned_staff_id", "notes"]:
        if field in data:
            setattr(job, field, normalise_job_status(data[field]) if field == "status" else data[field])
    if "due_date" in data:
        job.due_date = parse_date(data.get("due_date"))
    if job.invoice:
        if "line_items" in data:
            apply_line_items(job.invoice, data.get("line_items") or [])
        if "discount_amount" in data:
            job.invoice.discount_amount = data.get("discount_amount") or 0
        if "currency" in data:
            job.invoice.currency = data.get("currency") or job.invoice.currency
        job.invoice.client_name = job.client_name
        job.invoice.title = job.title
        job.invoice.due_on = job.due_date
        job.invoice.notes = job.notes
        sync_invoice_amount(job.invoice)
    db.session.add(AuditLog(action=f"Updated job {job.job_ref}", entity_type="job", entity_id=job.id))
    db.session.commit()
    return jsonify(serialize_job(job))


@bp.patch("/<int:job_id>/progress")
def patch_job_progress(job_id):
    # Item 4: dedicated progress-counter patch route, separate from the
    # general update_job() route above so a UI can bump completed_count
    # without needing to resend the whole job payload. Completed may exceed
    # total (reprints) - not validated/clamped here, per prompt instruction.
    job = Job.query.get_or_404(job_id)
    data = request.get_json() or {}
    update_job_progress(
        job,
        completed_count=data.get("completed_count"),
        total_count=data.get("total_count"),
    )
    db.session.add(AuditLog(action=f"Updated progress for {job.job_ref}", entity_type="job", entity_id=job.id))
    db.session.commit()
    return jsonify(serialize_job(job))


def _payment_summary(invoice):
    """Item 2: explicit amount-paid-so-far vs total-owed breakdown, surfaced
    directly on payment responses rather than requiring the frontend to dig
    it out of invoice.totals. invoice_totals() already computes this - this
    just names it plainly for the payment-recording call sites.
    """
    if not invoice:
        return {"total": 0, "paid": 0, "balance": 0}
    totals = serialize_invoice(invoice)["totals"]
    return {"total": totals["total"], "paid": totals["paid"], "balance": totals["balance"]}


@bp.post("/<int:job_id>/payments")
def record_job_payment(job_id):
    job = Job.query.get_or_404(job_id)
    payment = add_job_payment(job, request.get_json() or {})
    db.session.add(AuditLog(action=f"Recorded payment {payment.payment_ref} for {job.job_ref}", entity_type="job", entity_id=job.id))
    db.session.commit()
    return jsonify({
        "payment": payment.to_dict(),
        "job": serialize_job(job),
        "invoice": serialize_invoice(job.invoice) if job.invoice else None,
        "payment_summary": _payment_summary(job.invoice),
        # Item 3: linked Sale(s), now kept in sync with this payment. Empty
        # list if this job has no Sale record yet (not every job has one).
        "sales": [serialize_sale(sale) for sale in job.sales],
    }), 201


@bp.put("/<int:job_id>/payments/<int:payment_id>")
def update_job_payment_route(job_id, payment_id):
    job = Job.query.get_or_404(job_id)
    data = request.get_json() or {}
    payment = update_job_payment(job, payment_id, data)
    db.session.add(AuditLog(action=f"Updated payment {payment.payment_ref} for {job.job_ref}", entity_type="job", entity_id=job.id))
    db.session.commit()
    return jsonify({
        "payment": payment.to_dict(),
        "job": serialize_job(job),
        "invoice": serialize_invoice(job.invoice) if job.invoice else None,
        "payment_summary": _payment_summary(job.invoice),
        "sales": [serialize_sale(sale) for sale in job.sales],
    })