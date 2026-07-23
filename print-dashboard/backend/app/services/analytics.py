# path: backend/app/services/analytics.py

from collections import defaultdict
from datetime import date
from decimal import Decimal

from ..models import Client, Expense, Invoice, Job, Proposal, Sale, Vendor
from .invoices import invoice_status_from_totals, invoice_totals
from .reports import add_months, money, month_key, trailing_month_keys


def year_key(value):
    if not value:
        return "unscheduled"
    return str(value.year)


# ── Item 1: Vendor report ───────────────────────────────────────────────────

def build_vendor_report():
    """Per vendor, per month and per year: total spent, and which
    category was used most (by total spend in that category, not count).
    Built on Expense.vendor_id, which already exists (Prompt 4).
    Only expenses that actually represent money spent (approved/reimbursed/
    paid) are counted - a still-pending expense hasn't been paid to the
    vendor yet, so including it would overstate what's actually owed/spent.
    """
    countable_statuses = {"approved", "reimbursed", "paid"}
    vendors = Vendor.query.order_by(Vendor.name.asc()).all()
    expenses = Expense.query.filter(Expense.vendor_id.isnot(None)).all()

    by_vendor_month = defaultdict(lambda: defaultdict(Decimal))
    by_vendor_year = defaultdict(lambda: defaultdict(Decimal))
    by_vendor_month_category = defaultdict(lambda: defaultdict(lambda: defaultdict(Decimal)))
    by_vendor_year_category = defaultdict(lambda: defaultdict(lambda: defaultdict(Decimal)))

    for expense in expenses:
        if expense.status not in countable_statuses:
            continue
        amount = Decimal(str(expense.amount or 0))
        mkey = month_key(expense.expense_date)
        ykey = year_key(expense.expense_date)
        by_vendor_month[expense.vendor_id][mkey] += amount
        by_vendor_year[expense.vendor_id][ykey] += amount
        by_vendor_month_category[expense.vendor_id][mkey][expense.category] += amount
        by_vendor_year_category[expense.vendor_id][ykey][expense.category] += amount

    def top_category(category_totals):
        if not category_totals:
            return None
        return max(category_totals.items(), key=lambda row: row[1])[0]

    rows = []
    for vendor in vendors:
        monthly = []
        for mkey, total in sorted(by_vendor_month[vendor.id].items()):
            monthly.append({
                "month": mkey,
                "total_spent": money(total),
                "top_category": top_category(by_vendor_month_category[vendor.id][mkey]),
            })
        yearly = []
        for ykey, total in sorted(by_vendor_year[vendor.id].items()):
            yearly.append({
                "year": ykey,
                "total_spent": money(total),
                "top_category": top_category(by_vendor_year_category[vendor.id][ykey]),
            })
        rows.append({
            "vendor_id": vendor.id,
            "vendor_name": vendor.name,
            "category": vendor.category,
            "monthly": monthly,
            "yearly": yearly,
            "lifetime_total": money(sum(by_vendor_year[vendor.id].values(), Decimal("0.00"))),
        })

    return {"items": rows, "total": len(rows)}


# ── Item 2: Client report + recurring-client detection ─────────────────────

RECURRING_MONTH_THRESHOLD = 3
# Confirmed window: current calendar month plus the trailing 12 months
# (13 months total), per explicit confirmation for this prompt.
RECURRING_WINDOW_MONTHS = 13


def recurring_window_start():
    current_month = date.today().replace(day=1)
    return add_months(current_month, -(RECURRING_WINDOW_MONTHS - 1))


def build_client_report():
    """Per client: total purchased (booked invoice total, active statuses),
    and recurring-client detection = invoices in 3+ distinct calendar months
    within the current month + trailing 12 months window (13 months total).
    Built on Invoice.client_id, which already exists.
    """
    window_start = recurring_window_start()
    clients = Client.query.order_by(Client.name.asc()).all()
    invoices = Invoice.query.filter(Invoice.client_id.isnot(None)).all()

    totals_by_client = defaultdict(Decimal)
    months_by_client = defaultdict(set)
    invoice_count_by_client = defaultdict(int)

    for invoice in invoices:
        totals = invoice_totals(invoice)
        status = invoice_status_from_totals(totals) if invoice.job_id else invoice.status
        if status in {"not_paid", "partial", "paid", "sent", "overdue"}:
            totals_by_client[invoice.client_id] += Decimal(str(totals["total"]))
            invoice_count_by_client[invoice.client_id] += 1
        if invoice.issued_on and invoice.issued_on >= window_start:
            months_by_client[invoice.client_id].add(month_key(invoice.issued_on))

    rows = []
    for client in clients:
        distinct_months = len(months_by_client[client.id])
        rows.append({
            "client_id": client.id,
            "client_name": client.name,
            "total_purchased": money(totals_by_client[client.id]),
            "invoice_count": invoice_count_by_client[client.id],
            "distinct_active_months": distinct_months,
            "is_recurring": distinct_months >= RECURRING_MONTH_THRESHOLD,
        })

    rows.sort(key=lambda row: row["total_purchased"], reverse=True)
    return {
        "items": rows,
        "total": len(rows),
        "recurring_threshold_months": RECURRING_MONTH_THRESHOLD,
        "recurring_window_months": RECURRING_WINDOW_MONTHS,
    }


def recurring_client_ids():
    """Shared with build_monthly_projections() (item 3) so both endpoints
    use the exact same recurring definition rather than two competing ones.
    """
    report = build_client_report()
    return {row["client_id"] for row in report["items"] if row["is_recurring"]}


# ── Item 3: Monthly projections ─────────────────────────────────────────────

def build_monthly_projections():
    """Computed projection for the current month, derived entirely from
    existing data - not a manual input field.

    Pipeline component: per confirmed scope, "Sent + Accepted-not-yet-
    invoiced" proposals. Note on a real data-model gap: accept_proposal()
    converts a Proposal to a Job+Invoice in one atomic transaction, so there
    is no "accepted but not yet invoiced" gap state to query - acceptance
    and invoicing happen together, always. The closest honest mapping onto
    actual data: Sent proposals (not yet decided either way) plus Accepted
    proposals whose converted invoice has zero payments recorded yet (i.e.
    accepted and invoiced, but no cash has moved on it yet - still
    "pipeline", not yet "realized revenue"). Expired proposals (valid_until
    in the past) are excluded from the Sent bucket, since an expired-but-
    still-sent proposal is unlikely to convert.

    Recurring-client component: average monthly revenue (over the same
    13-month recurring window) for clients flagged recurring by item 2,
    projected forward one month. This is a simple historical-average
    projection, not a forecast model - stated plainly rather than
    overclaiming precision.
    """
    today = date.today()

    sent_proposals = (
        Proposal.query.filter(Proposal.status == "sent")
        .filter((Proposal.valid_until.is_(None)) | (Proposal.valid_until >= today))
        .all()
    )
    sent_pipeline_total = Decimal("0.00")
    sent_pipeline_items = []
    for proposal in sent_proposals:
        subtotal = sum((item.amount or Decimal("0.00") for item in proposal.line_items), Decimal("0.00"))
        discount = Decimal(str(proposal.discount_amount or 0))
        total = max(subtotal - discount, Decimal("0.00"))
        sent_pipeline_total += total
        sent_pipeline_items.append({
            "proposal_ref": proposal.proposal_ref,
            "client_name": proposal.client_name,
            "estimated_total": money(total),
        })

    accepted_not_invoiced_total = Decimal("0.00")
    accepted_not_invoiced_items = []
    accepted_proposals = Proposal.query.filter(Proposal.status == "accepted").all()
    for proposal in accepted_proposals:
        invoice = proposal.converted_invoice
        if not invoice:
            continue
        totals = invoice_totals(invoice)
        if Decimal(str(totals["paid"])) > 0:
            continue
        accepted_not_invoiced_total += Decimal(str(totals["total"]))
        accepted_not_invoiced_items.append({
            "proposal_ref": proposal.proposal_ref,
            "invoice_ref": invoice.invoice_ref,
            "client_name": proposal.client_name,
            "estimated_total": money(totals["total"]),
        })

    window_start = recurring_window_start()
    recurring_ids = recurring_client_ids()
    recurring_month_totals = defaultdict(lambda: defaultdict(Decimal))
    invoices = Invoice.query.filter(Invoice.client_id.in_(recurring_ids)).all() if recurring_ids else []
    for invoice in invoices:
        if not invoice.issued_on or invoice.issued_on < window_start:
            continue
        totals = invoice_totals(invoice)
        status = invoice_status_from_totals(totals) if invoice.job_id else invoice.status
        if status not in {"not_paid", "partial", "paid", "sent", "overdue"}:
            continue
        recurring_month_totals[invoice.client_id][month_key(invoice.issued_on)] += Decimal(str(totals["total"]))

    recurring_projection_total = Decimal("0.00")
    recurring_projection_items = []
    for client_id, month_totals in recurring_month_totals.items():
        months_active = len(month_totals)
        if months_active == 0:
            continue
        average = sum(month_totals.values(), Decimal("0.00")) / months_active
        recurring_projection_total += average
        client = Client.query.get(client_id)
        recurring_projection_items.append({
            "client_id": client_id,
            "client_name": client.name if client else None,
            "months_active_in_window": months_active,
            "projected_next_month": money(average),
        })
    recurring_projection_items.sort(key=lambda row: row["projected_next_month"], reverse=True)

    return {
        "projection_month": month_key(today),
        "pipeline": {
            "sent_not_expired": {
                "total": money(sent_pipeline_total),
                "count": len(sent_pipeline_items),
                "items": sent_pipeline_items,
            },
            "accepted_not_yet_invoiced": {
                "note": (
                    "No true 'accepted but not invoiced' state exists in this data model - "
                    "acceptance and invoicing happen atomically in accept_proposal(). This "
                    "bucket instead means: accepted proposals whose derived invoice has "
                    "received zero payments so far."
                ),
                "total": money(accepted_not_invoiced_total),
                "count": len(accepted_not_invoiced_items),
                "items": accepted_not_invoiced_items,
            },
        },
        "recurring_clients_projection": {
            "total": money(recurring_projection_total),
            "count": len(recurring_projection_items),
            "items": recurring_projection_items,
            "window_months": RECURRING_WINDOW_MONTHS,
        },
        "total_projected_revenue": money(
            sent_pipeline_total + accepted_not_invoiced_total + recurring_projection_total
        ),
    }


# ── Item 4: Sales vs Expenses monthly balance ───────────────────────────────

def build_sales_vs_expenses_report():
    """Uses the Sale model (Prompt 4 item 7) against existing Expense data,
    grouped by month. Sale.amount is already derived (paid/partial-paid
    portion of the linked job's invoice) by services/sales.py, so this report
    sums that stored value directly rather than re-deriving it - if it's
    stale relative to the linked job, that's a sales.py-level sync concern
    (see GET /api/sales/<id>, which does re-sync on read), not something to
    silently second-guess here.

    Expenses counted the same way as build_financial_report()'s
    expenses_by_month: keyed by paid_on (actual cash out), excluding
    not-yet-paid expenses from the by-month bucket.
    """
    sales = Sale.query.all()
    expenses = Expense.query.all()

    sales_by_month = defaultdict(Decimal)
    for sale in sales:
        if not sale.job or not sale.job.created_at:
            mkey = "unscheduled"
        else:
            mkey = month_key(sale.job.created_at.date())
        sales_by_month[mkey] += Decimal(str(sale.amount or 0))

    expenses_by_month = defaultdict(Decimal)
    for expense in expenses:
        if not expense.paid_on:
            continue
        expenses_by_month[month_key(expense.paid_on)] += Decimal(str(expense.amount or 0))

    month_keys = trailing_month_keys()
    rows = []
    for mkey in month_keys:
        sales_total = sales_by_month.get(mkey, Decimal("0.00"))
        expenses_total = expenses_by_month.get(mkey, Decimal("0.00"))
        rows.append({
            "month": mkey,
            "sales": money(sales_total),
            "expenses": money(expenses_total),
            "balance": money(sales_total - expenses_total),
        })

    return {
        "months": rows,
        "lifetime_sales": money(sum(sales_by_month.values(), Decimal("0.00"))),
        "lifetime_expenses": money(sum(v for k, v in expenses_by_month.items())),
    }


# ── Item 5: Machine/category revenue report ─────────────────────────────────

def build_machine_category_revenue_report():
    """'How much has DTF made this month' style breakdown - group
    InvoiceLineItem by machine_id (falling back to product_type when
    machine_id is null), sum revenue per month AND per year. Only counts
    line items belonging to invoices in an active (non-draft/cancelled)
    status, matching the same active-statuses convention used elsewhere in
    services/reports.py.
    """
    active_statuses = {"not_paid", "partial", "paid", "sent", "overdue"}
    invoices = Invoice.query.all()

    by_key_month = defaultdict(lambda: defaultdict(Decimal))
    by_key_year = defaultdict(lambda: defaultdict(Decimal))
    display_name = {}

    for invoice in invoices:
        totals = invoice_totals(invoice)
        status = invoice_status_from_totals(totals) if invoice.job_id else invoice.status
        if status not in active_statuses:
            continue
        mkey = month_key(invoice.issued_on)
        ykey = year_key(invoice.issued_on)
        for item in invoice.line_items:
            if item.machine_id:
                group_key = f"machine:{item.machine_id}"
                display_name[group_key] = item.machine.name if item.machine else f"Machine #{item.machine_id}"
            else:
                label = item.product_type or "General Print"
                group_key = f"category:{label}"
                display_name[group_key] = label
            by_key_month[group_key][mkey] += Decimal(str(item.line_total()))
            by_key_year[group_key][ykey] += Decimal(str(item.line_total()))

    rows = []
    for group_key, monthly_totals in by_key_month.items():
        rows.append({
            "key": group_key,
            "name": display_name[group_key],
            "type": "machine" if group_key.startswith("machine:") else "category",
            "monthly": [
                {"month": mkey, "revenue": money(total)}
                for mkey, total in sorted(monthly_totals.items())
            ],
            "yearly": [
                {"year": ykey, "revenue": money(total)}
                for ykey, total in sorted(by_key_year[group_key].items())
            ],
            "lifetime_revenue": money(sum(monthly_totals.values(), Decimal("0.00"))),
        })

    rows.sort(key=lambda row: row["lifetime_revenue"], reverse=True)
    return {"items": rows, "total": len(rows)}