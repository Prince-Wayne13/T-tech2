from datetime import date

from ..models import Invoice, Job, Payment
from ..services.invoices import apply_line_items, decimal_money, next_payment_ref, serialize_invoice, sync_invoice_amount
from ..utils import parse_date


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


def serialize_job(job):
    data = job.to_dict()
    data["status"] = normalise_job_status(job.status)
    data["machine_name"] = job.machine.name if job.machine else None
    data["machine_category"] = job.machine.category if job.machine else job.service_category
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
    return payment
