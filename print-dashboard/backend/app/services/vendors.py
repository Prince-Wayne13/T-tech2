# path: backend/app/services/vendors.py

from decimal import Decimal

from ..models import Expense

# Item 1: Vendor.balance is a dead column (see dev-log.md: "Vendor.balance was
# removed" note in seed.py) - it is never written to by any route and always
# reads 0/whatever seed data set once. "Did we pay them back / how much do we
# owe / what have we paid" must instead be derived live from Expense rows
# linked via Expense.vendor_id, the same FK build_vendor_report() already
# uses in services/analytics.py.
#
# Definition of owed vs paid, mirrored from build_vendor_report()'s
# countable_statuses concept but split two ways instead of one:
#   - "paid"       : Expense.status in {"approved", "reimbursed", "paid"}
#                    and Expense.paid_on is set - money that has actually left
#                    the business for this vendor.
#   - "owed"       : Expense.status == "pending" (not yet paid out at all) OR
#                    an approved/reimbursed/paid-status expense that somehow
#                    has no paid_on recorded yet (defensive - treated as still
#                    owed, since no cash movement is confirmed for it).
# This does not overlap: every vendor-linked expense counts toward exactly one
# bucket, so paid + owed always reconstructs total vendor spend booked so far.

PAID_STATUSES = {"approved", "reimbursed", "paid"}


def vendor_balance_summary(vendor_id):
    """Returns {'paid': Decimal, 'owed': Decimal, 'total': Decimal} for one vendor."""
    expenses = Expense.query.filter(Expense.vendor_id == vendor_id).all()
    paid = Decimal("0.00")
    owed = Decimal("0.00")
    for expense in expenses:
        amount = Decimal(str(expense.amount or 0))
        if expense.status in PAID_STATUSES and expense.paid_on:
            paid += amount
        else:
            owed += amount
    return {"paid": paid, "owed": owed, "total": paid + owed}


def vendor_balance_summaries(vendor_ids):
    """Batch version - one query instead of N, for the vendor list route."""
    if not vendor_ids:
        return {}
    expenses = Expense.query.filter(Expense.vendor_id.in_(vendor_ids)).all()
    summaries = {vid: {"paid": Decimal("0.00"), "owed": Decimal("0.00")} for vid in vendor_ids}
    for expense in expenses:
        amount = Decimal(str(expense.amount or 0))
        bucket = "paid" if (expense.status in PAID_STATUSES and expense.paid_on) else "owed"
        summaries[expense.vendor_id][bucket] += amount
    for summary in summaries.values():
        summary["total"] = summary["paid"] + summary["owed"]
    return summaries


def serialize_vendor(vendor, summary=None):
    """summary can be pre-computed (batch list view) or omitted (single-vendor
    view, computed here) - avoids either forcing every caller to batch-fetch
    or doing N+1 queries silently.
    """
    if summary is None:
        summary = vendor_balance_summary(vendor.id)
    data = vendor.to_dict()
    # Overwrite the dead stored `balance` column with the derived owed figure,
    # since "balance" in every existing UI (Vendors.jsx, dashboard VendorList)
    # means "what we still owe them" - this keeps those call sites correct
    # without needing a frontend rewrite. paid/total are added alongside for
    # anywhere that wants the fuller breakdown (item 1's "how much we've paid").
    data["balance"] = float(summary["owed"])
    data["amount_owed"] = float(summary["owed"])
    data["amount_paid"] = float(summary["paid"])
    data["lifetime_spend"] = float(summary["total"])
    # A vendor is "overdue" in the status sense only via its own `status`
    # field (unchanged); this derived balance does not auto-flip status,
    # since only a human/business decision (e.g. "watch" list) should do that.
    return data