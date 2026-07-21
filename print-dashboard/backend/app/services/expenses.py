# path: backend/app/services/expenses.py

def sync_expense_status(expense):
    """Mirrors sync_invoice_amount()'s auto-flip pattern: once an expense has a
    paid_on date recorded, it flips to 'paid'. Simpler than the invoice version
    because Expense has no line-item/payment sub-table to sum — a single `amount`
    field and a `paid_on` date are the whole state, so "balance hits zero"
    collapses to "paid_on is set".
    """
    if expense.paid_on and expense.status != "paid":
        expense.status = "paid"