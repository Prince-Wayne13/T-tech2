from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import AuditLog, Expense
from ..utils import parse_date
from .common import apply_search, list_response

bp = Blueprint("expenses", __name__)


def next_expense_ref():
    last = Expense.query.order_by(Expense.id.desc()).first()
    return f"EXP-{((last.id if last else 0) + 1):04d}"


@bp.get("")
def list_expenses():
    query = Expense.query
    status = request.args.get("status")
    if status and status.lower() != "all":
        query = query.filter(Expense.status == status.lower())
    query = apply_search(query, Expense, ["expense_ref", "category", "title", "submitted_by"])
    return jsonify(list_response(query.order_by(Expense.expense_date.desc())))


@bp.post("")
def create_expense():
    data = request.get_json() or {}
    expense = Expense(
        expense_ref=data.get("expense_ref") or next_expense_ref(),
        category=data["category"],
        title=data["title"],
        amount=data.get("amount", 0),
        expense_date=parse_date(data["expense_date"]),
        status=data.get("status", "pending"),
        submitted_by=data.get("submitted_by"),
        notes=data.get("notes"),
    )
    db.session.add(expense)
    db.session.flush()
    db.session.add(AuditLog(action=f"Created expense {expense.expense_ref}", entity_type="expense", entity_id=expense.id))
    db.session.commit()
    return jsonify(expense.to_dict()), 201
