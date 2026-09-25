# path: backend/app/services/quotations.py

from datetime import date
from decimal import Decimal

from ..models import Quotation, QuotationLineItem
from ..utils import parse_date


def decimal_money(value):
    if value is None:
        return Decimal("0.00")
    return Decimal(str(value)).quantize(Decimal("0.01"))


def quotation_totals(quotation):
    subtotal = sum((item.amount or Decimal("0.00") for item in quotation.line_items), Decimal("0.00"))
    discount = decimal_money(quotation.discount_amount)
    total = max(subtotal - discount, Decimal("0.00"))
    return {
        "subtotal": float(subtotal),
        "discount": float(discount),
        "total": float(total),
    }


def serialize_quotation(quotation, include_document=False):
    data = quotation.to_dict()
    data["line_items"] = [item.to_dict() for item in quotation.line_items]
    data["totals"] = quotation_totals(quotation)
    data["assigned_staff_name"] = quotation.assigned_staff.name if quotation.assigned_staff else None
    data["is_expired"] = bool(
        quotation.valid_until
        and quotation.valid_until < date.today()
        and quotation.status not in {"accepted", "declined"}
    )

    if include_document:
        data["document"] = build_quotation_document(quotation)

    return data


def apply_quotation_line_items(quotation, line_items):
    quotation.line_items.clear()
    for index, item in enumerate(line_items or [], start=1):
        quantity = decimal_money(item.get("quantity", item.get("qty", 1)))
        unit_price = decimal_money(item.get("unit_price", item.get("rate", 0)))
        amount = decimal_money(item.get("amount", quantity * unit_price))
        quotation.line_items.append(
            QuotationLineItem(
                position=item.get("position", index),
                # Accepts both `description` (backend-native naming, matches
                # InvoiceLineItem's convention) and `desc` (what the current
                # NewQuotationModal frontend form actually sends), so the frontend
                # doesn't need a simultaneous rewrite for this to work.
                description=item.get("description") or item.get("desc", ""),
                quantity=quantity,
                unit=item.get("unit", "item"),
                unit_price=unit_price,
                amount=amount,
                # Same dual-naming approach as description/desc above --
                # accepts pricing_item_id/machine_id (backend-native,
                # matches InvoiceLineItem) from what Quotations.jsx sends
                # (build decision #5).
                pricing_item_id=item.get("pricing_item_id"),
                machine_id=item.get("machine_id"),
            )
        )


def build_quotation_document(quotation):
    totals = quotation_totals(quotation)
    return {
        "title": f"Quotation {quotation.quotation_ref}",
        "header": {
            "quotation_ref": quotation.quotation_ref,
            "status": quotation.status,
            "currency": quotation.currency,
        },
        "billing": {
            "client_name": quotation.client_name,
            "contact": quotation.contact,
            "created_at": quotation.created_at.isoformat() if quotation.created_at else None,
            "valid_until": quotation.valid_until.isoformat() if quotation.valid_until else None,
        },
        "line_items": [
            {
                "description": item.description,
                "quantity": float(item.quantity),
                "unit": item.unit,
                "unit_price": float(item.unit_price),
                "amount": float(item.amount),
            }
            for item in quotation.line_items
        ],
        "totals": totals,
        "footer": {
            "notes": quotation.notes,
        },
    }
