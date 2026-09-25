# path: backend/app/services/sales.py

from decimal import Decimal
from uuid import uuid4

from ..models import Sale
from .invoices import decimal_money, invoice_totals


def next_sale_ref():
    return f"SALE-{uuid4().hex[:8].upper()}"


def derive_sale_amount(job):
    """Sale.amount = the sum of the real Payment rows recorded against this
    Job. Nothing else.

    It deliberately does NOT look at the invoice. The old version required
    job.invoice to exist, then capped the result at the invoice's calculated
    total. That made the Sale depend on the order the accountant worked in:
    if a payment was recorded before the invoice was finished (or the invoice
    price was still wrong / zero), the Sale showed 0 even though cash had
    really been collected, and it stayed wrong until someone revisited the
    invoice. Cash Balance already sums real payments, so the Sale now uses
    the same source and the two can no longer disagree.

    No payments -> 0. The invoice total is still exposed separately by
    serialize_sale() as "invoice_total" so the UI can show Booked Value and
    Still Owed next to this collected amount.
    """
    if not job:
        return Decimal("0.00")
    return sum(
        (decimal_money(payment.amount) for payment in job.payments),
        Decimal("0.00"),
    )


def sync_sale_amount(sale):
    sale.amount = derive_sale_amount(sale.job)
    return sale


def create_sale_for_job(job, description=None, notes=None, sale_ref=None):
    sale = Sale(
        sale_ref=sale_ref or next_sale_ref(),
        job=job,
        description=description,
        notes=notes,
    )
    sync_sale_amount(sale)
    return sale


def serialize_sale(sale):
    data = sale.to_dict()
    data["client_name"] = sale.client_name
    data["job_ref"] = sale.job.job_ref if sale.job else None
    # Prompt 6 (Sales page): expose the linked invoice's total alongside the
    # derived Sale.amount so the frontend can classify full/partial/unpaid
    # without re-deriving payment math client-side. Mirrors the same
    # paid/total split invoice_totals() already computes.
    invoice_total = None
    if sale.job and sale.job.invoice:
        invoice_total = float(invoice_totals(sale.job.invoice)["total"])
    data["invoice_total"] = invoice_total
    amount = float(sale.amount or 0)
    if amount <= 0:
        payment_status = "unpaid"
    elif invoice_total and amount < invoice_total:
        payment_status = "partial"
    else:
        # Cash was really collected. If the invoice total is missing or still
        # 0 (invoice not finished yet) there is nothing to be "partial"
        # against, so this reads as paid rather than being hidden as unpaid.
        payment_status = "full"
    data["payment_status"] = payment_status
    return data