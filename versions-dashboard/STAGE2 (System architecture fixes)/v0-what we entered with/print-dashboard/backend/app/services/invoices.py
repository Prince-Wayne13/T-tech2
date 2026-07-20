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
    tax = (taxable * Decimal(str(invoice.tax_rate or 0))).quantize(Decimal("0.01"))
    total = taxable + tax
    paid = sum((payment.amount or Decimal("0.00") for payment in invoice.payments), Decimal("0.00"))
    balance = max(total - paid, Decimal("0.00"))

    return {
        "subtotal": float(subtotal),
        "discount": float(discount),
        "tax": float(tax),
        "total": float(total),
        "paid": float(paid),
        "balance": float(balance),
    }


def serialize_invoice(invoice, include_document=False):
    data = invoice.to_dict()
    data["line_items"] = [item.to_dict() for item in invoice.line_items]
    data["payments"] = [payment.to_dict() for payment in invoice.payments]
    data["totals"] = invoice_totals(invoice)
    data["is_overdue"] = bool(
        invoice.due_on
        and invoice.due_on < date.today()
        and invoice.status not in {"paid", "cancelled"}
    )

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


def sync_invoice_amount(invoice):
    invoice.amount = decimal_money(invoice_totals(invoice)["total"])
    if invoice_totals(invoice)["balance"] == 0 and invoice.amount > 0:
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
