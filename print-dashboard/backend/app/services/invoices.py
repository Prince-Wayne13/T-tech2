# path: backend/app/services/invoices.py

from datetime import date
from decimal import Decimal
from uuid import uuid4

from flask import current_app

from ..models import Invoice, InvoiceLineItem, Payment
from ..utils import parse_date


def decimal_money(value):
    if value is None:
        return Decimal("0.00")
    return Decimal(str(value)).quantize(Decimal("0.01"))


def next_payment_ref():
    return f"PAY-{uuid4().hex[:8].upper()}"


def invoice_totals(invoice):
    subtotal = sum((item.line_total() for item in invoice.line_items), Decimal("0.00"))
    if not invoice.line_items:
        subtotal = decimal_money(invoice.amount)

    discount = decimal_money(invoice.discount_amount)
    taxable = max(subtotal - discount, Decimal("0.00"))
    # Item 16: tax removed from the invoice flow. Invoice.tax_rate column is
    # left in place (no migration) but is no longer read here; tax is always
    # treated as 0.
    tax = Decimal("0.00")
    total = taxable + tax
    payment_rows = invoice.job.payments if invoice.job else invoice.payments
    paid = sum((payment.amount or Decimal("0.00") for payment in payment_rows), Decimal("0.00"))
    balance = max(total - paid, Decimal("0.00"))

    return {
        "subtotal": float(subtotal),
        "discount": float(discount),
        "tax": float(tax),
        "total": float(total),
        "paid": float(paid),
        "balance": float(balance),
    }


def invoice_status_from_totals(totals):
    paid = Decimal(str(totals["paid"]))
    total = Decimal(str(totals["total"]))
    if paid <= 0:
        return "not_paid"
    if paid < total:
        return "partial"
    return "paid"


def serialize_invoice(invoice, include_document=False):
    data = invoice.to_dict()
    data["line_items"] = [item.to_dict() for item in invoice.line_items]
    payment_rows = invoice.job.payments if invoice.job else invoice.payments
    data["payments"] = [payment.to_dict() for payment in payment_rows]
    data["totals"] = invoice_totals(invoice)
    if invoice.job_id:
        # A cancelled invoice (set when its linked job is cancelled - see
        # routes/jobs.py::update_job()) keeps that status as-is. Every other
        # job-linked invoice still gets its status derived live from
        # paid/total, same as before.
        if invoice.status != "cancelled":
            data["status"] = invoice_status_from_totals(data["totals"])
        data["job_ref"] = invoice.job.job_ref if invoice.job else None
    data["is_overdue"] = bool(
        invoice.due_on
        and invoice.due_on < date.today()
        and data["status"] not in {"paid", "cancelled"}
    )
    # Proposal->Invoice link: invoice.source_proposal is the SQLAlchemy backref from
    # Proposal.converted_invoice_id. Requires uselist=False on BOTH sides of the
    # relationship (see models.py) to resolve to a single Proposal or None here —
    # a string-form backref alone left this list-typed and crashed in production;
    # see dev-log.md for the incident and fix.
    data["source_proposal_ref"] = invoice.source_proposal.proposal_ref if invoice.source_proposal else None

    if include_document:
        data["company"] = current_app.config["COMPANY_PROFILE"]
        data["document"] = build_invoice_document(invoice)

    return data


def apply_line_items(invoice, line_items):
    invoice.line_items.clear()
    for index, item in enumerate(line_items or [], start=1):
        invoice.line_items.append(
            InvoiceLineItem(
                position=item.get("position", index),
                description=item["description"],
                product_type=item.get("product_type"),
                machine_id=item.get("machine_id"),
                pricing_item_id=item.get("pricing_item_id"),
                quantity=decimal_money(item.get("quantity", 1)),
                unit=item.get("unit", "item"),
                unit_price=decimal_money(item.get("unit_price", item.get("rate", 0))),
                production_notes=item.get("production_notes"),
            )
        )


def apply_payments(invoice, payments):
    invoice.payments.clear()
    for payment in payments or []:
        invoice.payments.append(
            Payment(
                payment_ref=payment.get("payment_ref") or next_payment_ref(),
                amount=decimal_money(payment.get("amount", 0)),
                method=payment.get("method", "bank_transfer"),
                paid_on=parse_date(payment.get("paid_on")) or date.today(),
                received_by=payment.get("received_by"),
                notes=payment.get("notes"),
            )
        )


def update_payment(invoice, payment_id, data):
    """Fix for "Update payment throws an error": no route or service function
    for editing an existing Payment ever existed anywhere in the codebase -
    only append-only apply_payments()/add_job_payment() (create). Any
    frontend call to update a single payment had nothing to hit.

    Direct-invoice-payments path (Invoice.payments, job_id is null).
    Job-linked invoices use update_job_payment() in services/jobs.py
    instead, since their ledger lives on Job.payments, not Invoice.payments.
    """
    payment = next((row for row in invoice.payments if row.id == payment_id), None)
    if payment is None:
        raise ValueError(f"Payment {payment_id} not found on invoice {invoice.invoice_ref}")

    if "amount" in data:
        payment.amount = decimal_money(data["amount"])
    if "method" in data:
        payment.method = data["method"]
    if "paid_on" in data:
        payment.paid_on = parse_date(data["paid_on"]) or payment.paid_on
    if "received_by" in data:
        payment.received_by = data["received_by"]
    if "notes" in data:
        payment.notes = data["notes"]

    sync_invoice_amount(invoice)
    return payment


def sync_invoice_amount(invoice):
    invoice.amount = decimal_money(invoice_totals(invoice)["total"])
    totals = invoice_totals(invoice)
    if invoice.job_id:
        invoice.status = invoice_status_from_totals(totals)
    elif totals["balance"] == 0 and invoice.amount > 0:
        invoice.status = "paid"


def build_invoice_document(invoice):
    profile = current_app.config["COMPANY_PROFILE"]
    totals = invoice_totals(invoice)
    return {
        "title": f"Invoice {invoice.invoice_ref}",
        "header": {
            "company_name": profile["name"],
            "company_contact": profile["contact"],
            "invoice_ref": invoice.invoice_ref,
            "status": invoice.status,
            "currency": invoice.currency,
        },
        "billing": {
            "client_name": invoice.client_name,
            "purchase_order": invoice.purchase_order,
            "issued_on": invoice.issued_on.isoformat() if invoice.issued_on else None,
            "due_on": invoice.due_on.isoformat() if invoice.due_on else None,
            "payment_terms": invoice.payment_terms,
        },
        "production_summary": [
            {
                "description": item.description,
                "product_type": item.product_type,
                "machine": item.machine.name if item.machine else None,
                "quantity": float(item.quantity),
                "unit": item.unit,
                "unit_price": float(item.unit_price),
                "line_total": float(item.line_total()),
                "production_notes": item.production_notes,
            }
            for item in invoice.line_items
        ],
        "totals": totals,
        "footer": {
            "notes": invoice.notes,
            "banking": profile["banking"],
            "quality_note": "Artwork, sizing, substrate and finishing details are confirmed before production.",
        },
    }