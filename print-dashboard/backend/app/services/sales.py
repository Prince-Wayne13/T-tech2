# path: backend/app/services/sales.py

from decimal import Decimal
from uuid import uuid4

from ..models import Sale
from .invoices import decimal_money, invoice_totals


def next_sale_ref():
    return f"SALE-{uuid4().hex[:8].upper()}"


def derive_sale_amount(job):
    """Item 7: Sale.amount is never manually entered - it is derived from the
    linked Job's Invoice payment status. Fully paid -> the invoice total.
    Partially paid -> the amount actually paid so far (not the full total,
    since the sale hasn't fully materialized as cash yet). No invoice, or an
    invoice with nothing paid -> 0. This mirrors invoice_totals()'s own
    paid/total split rather than introducing a second definition of "paid".
    """
    if not job or not job.invoice:
        return Decimal("0.00")
    totals = invoice_totals(job.invoice)
    paid = decimal_money(totals["paid"])
    total = decimal_money(totals["total"])
    if paid <= 0:
        return Decimal("0.00")
    if paid < total:
        return paid
    return total


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
        payment_status = "full"
    data["payment_status"] = payment_status
    return data