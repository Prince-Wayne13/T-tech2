# path: backend/app/services/expenses.py

from ..models import ExpenseCategory


def is_vendor_related_category(category_name):
    """Item 3: category-level vendor-linking check. Expense.category stays a
    free-text string (see models.py ExpenseCategory docstring for why), so
    this looks up the matching ExpenseCategory row by name rather than
    requiring every Expense to carry category_id. Unknown/unseeded category
    names default to False (not vendor-related) rather than raising, since
    Expense.category has always accepted arbitrary strings and this must not
    become a new source of 500s on existing data.
    """
    if not category_name:
        return False
    row = ExpenseCategory.query.filter(ExpenseCategory.name == category_name).first()
    return bool(row and row.vendor_related)


def sync_expense_status(expense):
    """Mirrors sync_invoice_amount()'s auto-flip pattern: once an expense has a
    paid_on date recorded, it flips to 'paid'. Simpler than the invoice version
    because Expense has no line-item/payment sub-table to sum — a single `amount`
    field and a `paid_on` date are the whole state, so "balance hits zero"
    collapses to "paid_on is set".
    """
    if expense.paid_on and expense.status != "paid":
        expense.status = "paid"