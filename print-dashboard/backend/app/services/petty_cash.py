# path: backend/app/services/petty_cash.py

from datetime import date
from decimal import Decimal
from uuid import uuid4

from ..extensions import db
from ..models import Expense, PettyCash
from .invoices import decimal_money

PETTY_CASH_CATEGORY = "Petty Cash"


def next_entry_ref():
    return f"PC-{uuid4().hex[:8].upper()}"


def next_expense_ref():
    last = Expense.query.order_by(Expense.id.desc()).first()
    return f"EXP-{((last.id if last else 0) + 1):04d}"


def petty_cash_balance():
    """Running balance: top_up increases it, staff_expense decreases it,
    sales_cash_used does not touch it at all (per item 8's explicit spec -
    that cash was already logged as a Sale, this entry just records how the
    already-collected cash was spent, it isn't new money moving through the
    petty cash tin).
    """
    total = Decimal("0.00")
    for entry in PettyCash.query.all():
        amount = decimal_money(entry.amount)
        if entry.entry_type == "top_up":
            total += amount
        elif entry.entry_type == "staff_expense":
            total -= amount
        # sales_cash_used: balance unaffected, by design.
    return total


def record_petty_cash_entry(entry_type, amount, staff_id=None, notes=None, category=None, title=None, submitted_by=None, expense_date=None):
    if entry_type not in PettyCash.ENTRY_TYPES:
        raise ValueError(f"Unknown petty cash entry_type: {entry_type}")

    amount = decimal_money(amount)
    entry = PettyCash(
        entry_ref=next_entry_ref(),
        entry_type=entry_type,
        amount=amount,
        staff_id=staff_id,
        notes=notes,
    )

    if entry_type in {"top_up", "sales_cash_used"}:
        expense_title = title
        if not expense_title:
            expense_title = "Petty cash top-up" if entry_type == "top_up" else "Sales cash used (Petty Cash)"
        expense = Expense(
            expense_ref=next_expense_ref(),
            category=PETTY_CASH_CATEGORY,
            title=expense_title,
            amount=amount,
            expense_date=expense_date or date.today(),
            paid_on=expense_date or date.today(),
            status="approved",
            submitted_by=submitted_by,
            notes=notes,
        )
        db.session.add(expense)
        db.session.flush()
        entry.linked_expense_id = expense.id

    db.session.add(entry)
    db.session.flush()
    return entry


def serialize_petty_cash_entry(entry):
    data = entry.to_dict()
    data["staff_name"] = entry.staff.name if entry.staff else None
    data["linked_expense_ref"] = entry.linked_expense.expense_ref if entry.linked_expense else None
    return data
