#services/jobs.py
from datetime import date

from ..models import Invoice, Job, Payment, ProductionMachine
from ..services.invoices import apply_line_items, decimal_money, next_payment_ref, serialize_invoice, sync_invoice_amount
from ..services.machines import assert_machine_compatible
from ..utils import parse_date

# Job fields that stay editable at any status, per prompt item 6
# (Job.notes free text, editable regardless of job/proposal status).
ALWAYS_EDITABLE_JOB_FIELDS = {"notes"}


ACTIVE_STATUS = "in_session"
FINISHED_STATUS = "finished"
CANCELLED_STATUS = "cancelled"


def normalise_job_status(status):
    value = (status or ACTIVE_STATUS).lower()
    if value in {"queued", "printing", "finishing", "ready", "completed", "in session", "in-session"}:
        return FINISHED_STATUS if value in {"ready", "completed"} else ACTIVE_STATUS
    if value in {"finished", "cancelled"}:
        return value
    return value


def job_total(job):
    return decimal_money(job.invoice.amount if job.invoice else 0)


def validate_job_machine_assignment(machine_id, required_capability_id):
    """Priority 2: only compatible machines may be assigned to a Job. If the
    job carries no required_capability_id (legacy jobs, or jobs created
    before this system existed), the check is skipped entirely - this only
    enforces compatibility where the job has actually declared what it
    needs. Raises IncompatibleMachineError (from services.machines) if the
    chosen machine doesn't advertise that capability.
    """
    if not machine_id:
        return
    machine = ProductionMachine.query.get(machine_id)
    if machine is None:
        return
    assert_machine_compatible(machine, required_capability_id)


def serialize_job(job):
    data = job.to_dict()
    data["status"] = normalise_job_status(job.status)
    data["machine_name"] = job.machine.name if job.machine else None
    data["machine_category"] = job.machine.category if job.machine else job.service_category
    data["required_capability_name"] = job.required_capability.name if job.required_capability else None
    # Item 7 (Prompt 7): same null-safe join pattern as machine_name above.
    # This was missing even after Job.assigned_staff_id/assigned_staff were
    # added to the model — Jobs.jsx's mapJob() already reads
    # job.assigned_staff_name expecting the backend to expose it, so without
    # this the field would always resolve to null/undefined on the frontend
    # even once jobs could actually be assigned.
    data["assigned_staff_name"] = job.assigned_staff.name if job.assigned_staff else None
    # Item 6 (backend priority list): client phone for the To-Do List export.
    # Null-safe join, same pattern as machine_name/assigned_staff_name above -
    # jobs created before a Client link existed, or walk-in jobs with no
    # client_id, simply return null rather than raising.
    data["client_phone"] = job.client.phone if job.client else None
    data["payments"] = [payment.to_dict() for payment in job.payments]
    data["invoice"] = serialize_invoice(job.invoice) if job.invoice else None
    data["totals"] = data["invoice"]["totals"] if data["invoice"] else {"total": 0, "paid": 0, "balance": 0}
    return data


def create_invoice_for_job(job, invoice_ref, line_items=None, discount_amount=0, currency="MWK", notes=None):
    invoice = Invoice(
        invoice_ref=invoice_ref,
        job=job,
        client_id=job.client_id,
        client_name=job.client_name,
        title=job.title,
        status="not_paid",
        discount_amount=discount_amount,
        tax_rate=0,
        currency=currency,
        issued_on=date.today(),
        due_on=job.due_date,
        notes=notes if notes is not None else job.notes,
    )
    apply_line_items(invoice, line_items or [{"description": job.title, "quantity": 1, "unit_price": 0, "unit": "item"}])
    sync_invoice_amount(invoice)
    return invoice


def _sync_linked_sale(job):
    """Item 3 (backend priority list): add_job_payment()/update_job_payment()
    already re-sync the Job's Invoice on every payment change, but never
    touched Job.sales - the linked Sale row (services/sales.py) silently
    drifted out of date whenever a payment was recorded or edited after the
    Sale was first created. Sale.amount is derived from the same Invoice
    payment status (see sales.py::derive_sale_amount), so this just calls
    that same sync function for every Sale linked to this job - normally
    exactly one, per create_sale_for_job()'s one-sale-per-job usage, but this
    loops defensively rather than assuming index 0 exists.

    Import is local (not top-of-file) to avoid a circular import: services/sales.py
    imports from services/invoices.py, and jobs.py already imports from
    services/invoices.py too - importing sales.py at module load time here
    risks a partially-initialized module if load order ever shifts. Importing
    inside the function sidesteps that entirely.
    """
    if not job.sales:
        return []
    from ..services.sales import sync_sale_amount
    synced = []
    for sale in job.sales:
        sync_sale_amount(sale)
        synced.append(sale)
    return synced


def add_job_payment(job, payload):
    payment = Payment(
        job=job,
        payment_ref=payload.get("payment_ref") or payload.get("ref") or next_payment_ref(),
        amount=decimal_money(payload.get("amount", 0)),
        method=payload.get("method", "bank_transfer"),
        paid_on=parse_date(payload.get("paid_on") or payload.get("date")) or date.today(),
        received_by=payload.get("received_by"),
        notes=payload.get("notes"),
    )
    job.payments.append(payment)
    if job.invoice:
        sync_invoice_amount(job.invoice)
    _sync_linked_sale(job)
    return payment


def update_job_payment(job, payment_id, data):
    """Fix for "Update payment throws an error" (job-linked ledger side).
    add_job_payment() only ever appended - there was no edit path for a
    payment already recorded against a Job. Mirrors
    services/invoices.py::update_payment()'s field-by-field patch, then
    re-syncs the linked invoice's derived status the same way
    add_job_payment() already does on create.
    """
    payment = next((row for row in job.payments if row.id == payment_id), None)
    if payment is None:
        raise ValueError(f"Payment {payment_id} not found on job {job.job_ref}")

    if "amount" in data:
        payment.amount = decimal_money(data["amount"])
    if "method" in data:
        payment.method = data["method"]
    if "paid_on" in data or "date" in data:
        parsed = parse_date(data.get("paid_on") or data.get("date"))
        payment.paid_on = parsed or payment.paid_on
    if "received_by" in data:
        payment.received_by = data["received_by"]
    if "notes" in data:
        payment.notes = data["notes"]

    if job.invoice:
        sync_invoice_amount(job.invoice)
    _sync_linked_sale(job)
    return payment


def update_job_progress(job, completed_count=None, total_count=None):
    """Item 4: completed_count/total_count patch helper. Completed may exceed
    total (reprints) - deliberately not clamped, no validation error raised
    since this is an expected real-world state, not a bug.
    """
    if completed_count is not None:
        job.completed_count = completed_count
    if total_count is not None:
        job.total_count = total_count
    return job