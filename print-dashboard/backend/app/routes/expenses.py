# path: backend/app/routes/expenses.py

from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import AuditLog, Expense
from ..services.expenses import sync_expense_status
from ..utils import parse_date
from .common import apply_search, list_response

bp = Blueprint("expenses", __name__)


def next_expense_ref():
    last = Expense.query.order_by(Expense.id.desc()).first()
    return f"EXP-{((last.id if last else 0) + 1):04d}"


def serialize_expense(expense):
    # Mirrors routes/jobs.py::serialize_job()'s machine_name join pattern —
    # keeps Expense.to_dict() (SerializableMixin) generic and adds the joined
    # field at the route/serializer layer instead. vendor_id is nullable, so
    # vendor-less expenses (utilities, fuel, etc.) return vendor_name: null
    # and the frontend's existing fallback chain handles that case.
    return expense.to_dict() | {
        "vendor_name": expense.vendor.name if expense.vendor else None,
    }


@bp.get("")
def list_expenses():
    query = Expense.query
    status = request.args.get("status")
    if status and status.lower() != "all":
        query = query.filter(Expense.status == status.lower())
    query = apply_search(query, Expense, ["expense_ref", "category", "title", "submitted_by"])
    return jsonify(list_response(query.order_by(Expense.expense_date.desc()), serialize_expense))


@bp.post("")
def create_expense():
    data = request.get_json() or {}
    expense = Expense(
        expense_ref=data.get("expense_ref") or next_expense_ref(),
        vendor_id=data.get("vendor_id"),
        category=data["category"],
        title=data["title"],
        amount=data.get("amount", 0),
        expense_date=parse_date(data["expense_date"]),
        paid_on=parse_date(data.get("paid_on")),
        status=data.get("status", "pending"),
        submitted_by=data.get("submitted_by"),
        notes=data.get("notes"),
    )
    if expense.paid_on:
        sync_expense_status(expense)
    db.session.add(expense)
    db.session.flush()
    db.session.add(AuditLog(action=f"Created expense {expense.expense_ref}", entity_type="expense", entity_id=expense.id))
    db.session.commit()
    return jsonify(serialize_expense(expense)), 201


@bp.put("/<int:expense_id>")
def update_expense(expense_id):
    expense = Expense.query.get_or_404(expense_id)
    data = request.get_json() or {}
    for field in ["vendor_id", "category", "title", "amount", "status", "submitted_by", "notes"]:
        if field in data:
            setattr(expense, field, data[field])
    if "expense_date" in data:
        expense.expense_date = parse_date(data.get("expense_date"))
    if "paid_on" in data:
        expense.paid_on = parse_date(data.get("paid_on"))
        sync_expense_status(expense)
    db.session.add(AuditLog(action=f"Updated expense {expense.expense_ref}", entity_type="expense", entity_id=expense.id))
    db.session.commit()
    return jsonify(serialize_expense(expense))