# path: backend/app/services/reports.py

from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal

from ..models import Expense, Invoice, Job, Material, MaterialTransaction, ProductionMachine
from .invoices import invoice_status_from_totals, invoice_totals
from .vendors import PAID_STATUSES

# material_stock_summary/reconcile_material_count are imported inside
# build_materials_reconciliation() below, not at module level here - this
# file (reports.py) is itself imported BY services/materials.py (for the
# shared money() helper), so a module-level import in this direction would
# be a circular import. A local import inside the one function that needs
# them avoids that without having to move money() out of this file.


def money(value):
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    return value


def month_key(value):
    if not value:
        return "unscheduled"
    return value.strftime("%Y-%m")


def add_months(value, months):
    year = value.year + ((value.month - 1 + months) // 12)
    month = ((value.month - 1 + months) % 12) + 1
    return date(year, month, 1)


def trailing_month_keys(month_count=13):
    current_month = date.today().replace(day=1)
    start_month = add_months(current_month, -(month_count - 1))
    return [add_months(start_month, offset).strftime("%Y-%m") for offset in range(month_count)]


def active_invoice_statuses():
    return {"not_paid", "partial", "paid", "sent", "overdue"}


def build_dashboard_summary():
    invoices = Invoice.query.all()
    expenses = Expense.query.all()
    jobs = Job.query.all()

    totals = {invoice.id: invoice_totals(invoice) for invoice in invoices}
    outstanding = sum(totals[i.id]["balance"] for i in invoices if invoice_status_from_totals(totals[i.id]) in {"not_paid", "partial"})
    paid = sum(totals[i.id]["paid"] for i in invoices)
    booked_revenue = sum(totals[i.id]["total"] for i in invoices if invoice_status_from_totals(totals[i.id]) in active_invoice_statuses())
    total_expenses = sum(money(e.amount) for e in expenses if e.status in PAID_STATUSES)
    overdue = [
        i for i in invoices
        if i.due_on and i.due_on < date.today() and invoice_status_from_totals(totals[i.id]) not in {"paid", "cancelled"}
    ]

    return {
        "cash_balance": paid - total_expenses,
        "receivables": outstanding,
        "expenses": total_expenses,
        "booked_revenue": booked_revenue,
        "gross_profit": booked_revenue - total_expenses,
        "active_jobs": len([j for j in jobs if j.status in {"in_session", "queued", "printing", "finishing"}]),
        "overdue_invoices": len(overdue),
        "pipeline": {
            "in_session": len([j for j in jobs if j.status in {"in_session", "queued", "printing", "finishing"}]),
            "finished": len([j for j in jobs if j.status in {"finished", "completed", "ready"}]),
            "cancelled": len([j for j in jobs if j.status == "cancelled"]),
        },
    }


def build_financial_report(period="month"):
    invoices = Invoice.query.all()
    expenses = Expense.query.all()
    jobs = Job.query.all()

    revenue = sum(invoice_totals(invoice)["total"] for invoice in invoices if invoice_status_from_totals(invoice_totals(invoice)) in active_invoice_statuses())
    paid = sum(invoice_totals(invoice)["paid"] for invoice in invoices)
    expense_total = sum(money(expense.amount) for expense in expenses if expense.status in PAID_STATUSES)

    by_status = defaultdict(float)
    by_month = defaultdict(float)
    expenses_by_month = defaultdict(float)
    client_revenue = defaultdict(float)
    product_mix = defaultdict(float)
    expense_categories = defaultdict(float)

    for invoice in invoices:
        totals = invoice_totals(invoice)
        status = invoice_status_from_totals(totals)
        by_status[status] += totals["total"]
        # FIX (2026-07-20): revenue_by_month is keyed off actual cash received
        # (Payment.paid_on), not Invoice.issued_on (booked revenue). This is what
        # makes it a true cashflow figure rather than a booked-revenue figure.
        for payment in (invoice.job.payments if invoice.job else invoice.payments):
            by_month[month_key(payment.paid_on)] += money(payment.amount)
        client_revenue[invoice.client_name] += totals["total"]
        for item in invoice.line_items:
            product_mix[item.product_type or "General Print"] += float(item.line_total())

    for expense in expenses:
        expense_categories[expense.category] += money(expense.amount)
        # FIX (2026-07-20): key off paid_on (actual cash paid out), not expense_date
        # (booked/submitted date). Unpaid expenses (paid_on is None) are excluded from
        # this bucket until a paid_on is recorded, rather than being silently miskeyed
        # or crashing month_key() on a None date.
        if expense.paid_on:
            expenses_by_month[month_key(expense.paid_on)] += money(expense.amount)

    month_keys = trailing_month_keys()
    revenue_by_month_dict = {key: by_month.get(key, 0.0) for key in month_keys}
    expenses_by_month_dict = {key: expenses_by_month.get(key, 0.0) for key in month_keys}

    # FIX (flagged 2026-07-20, resolved this session): "revenue"/"profit" below
    # are booked-basis (Invoice.issued_on-driven, via invoice_totals()) and are
    # left unchanged, since build_report_library()'s RPT-FIN-MONTH metric and
    # other existing consumers already read them that way. "revenue_by_month"/
    # "expenses_by_month" are cash-basis (Payment.paid_on / Expense.paid_on -
    # driven, per the 2026-07-20 fixes above) and were previously left
    # unreconciled with the top-level fields in the same response object -
    # a caller reading "profit" and "revenue_by_month" from one response could
    # reasonably assume they're on the same accounting basis, and they weren't.
    # Rather than silently changing what "revenue"/"profit" mean (which would
    # silently change RPT-FIN-MONTH's number too), this adds explicit
    # cash-basis totals (cash_revenue/cash_expenses/cash_profit, summed
    # straight from the same by-month dicts already being returned) plus a
    # "basis" block naming which fields are which - so a consumer can pick the
    # right pair without needing to read this function's source to find out.
    cash_revenue_total = sum(revenue_by_month_dict.values())
    cash_expenses_total = sum(expenses_by_month_dict.values())

    return {
        "period": period,
        "revenue": revenue,
        "cash_collected": paid,
        "expenses": expense_total,
        "profit": revenue - expense_total,
        "cash_revenue": cash_revenue_total,
        "cash_expenses": cash_expenses_total,
        "cash_profit": cash_revenue_total - cash_expenses_total,
        "basis": {
            "revenue": "booked",
            "profit": "booked",
            "expenses": "booked",
            "cash_collected": "cash",
            "revenue_by_month": "cash",
            "expenses_by_month": "cash",
            "cash_revenue": "cash",
            "cash_expenses": "cash",
            "cash_profit": "cash",
        },
        "invoice_totals_by_status": dict(by_status),
        "expense_totals_by_category": dict(expense_categories),
        "revenue_by_month": revenue_by_month_dict,
        "expenses_by_month": expenses_by_month_dict,
        "top_clients": [
            {"client_name": client, "revenue": amount}
            for client, amount in sorted(client_revenue.items(), key=lambda row: row[1], reverse=True)[:5]
        ],
        "product_mix": dict(sorted(product_mix.items(), key=lambda row: row[1], reverse=True)),
        "receivables_aging": build_receivables_aging(invoices),
        "production": {
            "active_jobs": len([job for job in jobs if job.status in {"in_session", "queued", "printing", "finishing"}]),
            "due_this_week": len([job for job in jobs if job.due_date and job.due_date <= date.today() + timedelta(days=7)]),
            "average_progress": round(sum(job.progress or 0 for job in jobs) / len(jobs), 1) if jobs else 0,
        },
        "machine_revenue": build_machine_revenue(invoices),
    }


def build_receivables_aging(invoices):
    buckets = {"current": 0.0, "1_30_days": 0.0, "31_60_days": 0.0, "60_plus_days": 0.0}
    today = date.today()
    for invoice in invoices:
        balance = invoice_totals(invoice)["balance"]
        if balance <= 0:
            continue
        if not invoice.due_on or invoice.due_on >= today:
            buckets["current"] += balance
            continue
        days_overdue = (today - invoice.due_on).days
        if days_overdue <= 30:
            buckets["1_30_days"] += balance
        elif days_overdue <= 60:
            buckets["31_60_days"] += balance
        else:
            buckets["60_plus_days"] += balance
    return buckets


def build_machine_revenue(invoices=None):
    invoices = invoices if invoices is not None else Invoice.query.all()
    revenue_by_machine = defaultdict(float)
    jobs_by_machine = defaultdict(int)

    for invoice in invoices:
        if invoice_status_from_totals(invoice_totals(invoice)) not in active_invoice_statuses():
            continue
        for item in invoice.line_items:
            machine_name = item.machine.name if item.machine else (item.product_type or "Unassigned")
            revenue_by_machine[machine_name] += float(item.line_total())

    for job in Job.query.all():
        machine_name = job.machine.name if job.machine else (job.service_category or "Unassigned")
        jobs_by_machine[machine_name] += 1

    rows = []
    for machine in ProductionMachine.query.order_by(ProductionMachine.category, ProductionMachine.name).all():
        rows.append(
            {
                "machine_id": machine.id,
                "machine_ref": machine.machine_ref,
                "name": machine.name,
                "category": machine.category,
                "status": machine.status,
                "revenue": revenue_by_machine.get(machine.name, 0.0),
                "jobs": jobs_by_machine.get(machine.name, 0),
                "image_path": machine.image_path,
            }
        )

    known = {row["name"] for row in rows}
    for name, revenue in revenue_by_machine.items():
        if name not in known:
            rows.append(
                {
                    "machine_id": None,
                    "machine_ref": "UNASSIGNED",
                    "name": name,
                    "category": "Unassigned",
                    "status": "active",
                    "revenue": revenue,
                    "jobs": jobs_by_machine.get(name, 0),
                    "image_path": None,
                }
            )

    return sorted(rows, key=lambda row: row["revenue"], reverse=True)


def build_quantity_produced():
    """Sums invoiced quantity by month and by product type, from real
    InvoiceLineItem rows (InvoiceLineItem.quantity / .product_type).

    Keyed by Invoice.issued_on, since there is no separate "production date"
    field anywhere on Invoice/InvoiceLineItem/Job today. issued_on (when the
    work was billed out) is the closest honest proxy available - flagging
    this explicitly rather than implying it's a true production date.

    Only counts line items on invoices in an active status (same
    active_invoice_statuses() set used by build_financial_report/
    build_machine_revenue), so cancelled/void invoices don't inflate
    production totals.
    """
    invoices = Invoice.query.all()

    by_month = defaultdict(float)
    by_month_type = defaultdict(lambda: defaultdict(float))
    by_type = defaultdict(float)

    for invoice in invoices:
        if invoice_status_from_totals(invoice_totals(invoice)) not in active_invoice_statuses():
            continue
        mkey = month_key(invoice.issued_on)
        for item in invoice.line_items:
            qty = money(item.quantity)
            product_type = item.product_type or "General Print"
            by_month[mkey] += qty
            by_month_type[mkey][product_type] += qty
            by_type[product_type] += qty

    month_keys = trailing_month_keys()

    return {
        "quantity_by_month": {key: by_month.get(key, 0.0) for key in month_keys},
        "quantity_by_month_and_type": {
            key: dict(by_month_type.get(key, {})) for key in month_keys
        },
        "quantity_by_type": dict(sorted(by_type.items(), key=lambda row: row[1], reverse=True)),
        "date_basis": "issued_on",
    }


def active_job_statuses():
    """Non-cancelled job statuses - a cancelled job's completed_count doesn't
    represent real production, so it's excluded the same way
    active_invoice_statuses() excludes cancelled/void invoices elsewhere in
    this file."""
    return {"queued", "printing", "finishing", "in_session", "completed", "ready", "finished"}


def build_job_throughput():
    """Units actually completed on the shop floor (Job.completed_count),
    grouped by month, by machine, and by status - the production-side
    counterpart to build_quantity_produced()'s billing-side view.

    Keyed by Job.created_at (when the job entered the system), since there is
    no separate "production date"/"completed on" field on Job today - same
    honest-proxy stance already used for Invoice.issued_on in
    build_quantity_produced(). Flagged explicitly here for the same reason:
    a job created in one month and finished in a later one will still be
    bucketed under its creation month, not its completion month.

    Only Job.completed_count is summed (not total_count) - this counts units
    actually finished, not units ordered/queued. Cancelled jobs are excluded
    entirely via active_job_statuses().
    """
    jobs = Job.query.filter(Job.status != "cancelled").all()

    by_month = defaultdict(float)
    by_machine = defaultdict(float)
    by_status = defaultdict(float)
    jobs_by_machine = defaultdict(int)

    for job in jobs:
        completed = job.completed_count or 0
        mkey = month_key(job.created_at.date() if job.created_at else None)
        machine_name = job.machine.name if job.machine else (job.service_category or "Unassigned")
        by_month[mkey] += completed
        by_machine[machine_name] += completed
        by_status[job.status or "unknown"] += completed
        jobs_by_machine[machine_name] += 1

    month_keys = trailing_month_keys()

    machine_rows = [
        {"machine": machine, "units_completed": total, "job_count": jobs_by_machine.get(machine, 0)}
        for machine, total in sorted(by_machine.items(), key=lambda row: row[1], reverse=True)
    ]

    active_jobs = [job for job in jobs if job.status in {"queued", "printing", "finishing", "in_session"}]
    finished_jobs = [job for job in jobs if job.status in {"completed", "ready", "finished"}]
    total_units_active = sum(job.total_count or 0 for job in active_jobs)
    completed_units_active = sum(job.completed_count or 0 for job in active_jobs)

    return {
        "units_completed_by_month": {key: by_month.get(key, 0.0) for key in month_keys},
        "units_completed_by_machine": machine_rows,
        "units_completed_by_status": dict(by_status),
        "in_progress_summary": {
            "job_count": len(active_jobs),
            "units_completed": completed_units_active,
            "units_total": total_units_active,
            "units_remaining": max(total_units_active - completed_units_active, 0),
        },
        "finished_job_count": len(finished_jobs),
        "date_basis": "created_at",
    }


def _month_bounds(month_str):
    """month_str is 'YYYY-MM'. Returns (period_start, period_end) as dates,
    period_end being the last day of that month (inclusive)."""
    year, month = (int(part) for part in month_str.split("-"))
    period_start = date(year, month, 1)
    period_end = add_months(period_start, 1) - timedelta(days=1)
    return period_start, period_end


def build_materials_reconciliation(month=None):
    """The month-end periodic inventory report: for each material,
    Opening + Purchased - Consumed = Closing (the formula Wayne described -
    count what's on the shelf, work backward from what was bought and what's
    left to find what was actually used), cross-checked in two ways:

      1. Against a physical count, if one was logged for this material this
         month (reconcile_material_count()) - flags a variance if the shelf
         count disagrees with what the ledger says should be there.
      2. Against recorded output ("this much vinyl became this much
         stickers") - summed from MaterialTransaction.output_quantity on
         usage rows dated within the month, which is exactly Wayne's boss's
         question ("for this much vinyl, we made this much stickers").

    `month` is 'YYYY-MM'; defaults to the current calendar month. Opening
    stock for the month is derived the same way as closing stock - not
    stored anywhere - by running material_stock_summary() over only the
    transactions dated before the period starts, then again over
    transactions dated up to and including the period end. This keeps the
    report honest against the "derive, don't store" convention used
    everywhere else in this file/services/materials.py: an opening-balance
    column would be one more place a stale, hand-edited number could drift
    from what the ledger actually shows.
    """
    from .materials import material_stock_summary, reconcile_material_count

    if month is None:
        month = date.today().strftime("%Y-%m")
    period_start, period_end = _month_bounds(month)

    materials = Material.query.order_by(Material.name.asc()).all()
    rows = []
    for material in materials:
        all_transactions = MaterialTransaction.query.filter(
            MaterialTransaction.material_id == material.id
        ).all()

        opening_transactions = [
            txn for txn in all_transactions
            if txn.transaction_date and txn.transaction_date < period_start
        ]
        closing_transactions = [
            txn for txn in all_transactions
            if txn.transaction_date and txn.transaction_date <= period_end
        ]
        month_transactions = [
            txn for txn in all_transactions
            if txn.transaction_date and period_start <= txn.transaction_date <= period_end
        ]

        opening_stock = material_stock_summary(material.id, opening_transactions)["on_hand"]
        closing_summary = material_stock_summary(material.id, closing_transactions)
        closing_stock = closing_summary["on_hand"]

        purchased_this_month = sum(
            (money(txn.quantity) for txn in month_transactions if txn.transaction_type == "purchase"),
            0.0,
        )
        consumed_this_month = sum(
            (money(txn.quantity) for txn in month_transactions if txn.transaction_type == "usage"),
            0.0,
        )
        adjusted_this_month = sum(
            (money(txn.quantity) for txn in month_transactions if txn.transaction_type == "adjustment"),
            0.0,
        )

        # Formula check: opening + purchased - consumed + adjusted should
        # equal closing. Any gap here means a transaction was dated outside
        # [period_start, period_end] in a way that doesn't add up, or (more
        # usually) simply confirms the two independent calculations agree -
        # this is a sanity check on the report's own arithmetic, not a
        # comparison against a physical count (that's count_variance below).
        expected_closing = money(opening_stock) + purchased_this_month - consumed_this_month + adjusted_this_month
        formula_variance = round(money(closing_stock) - expected_closing, 3)

        output_rows = defaultdict(float)
        for txn in month_transactions:
            if txn.transaction_type == "usage" and txn.output_quantity:
                label = txn.output_description or "Output"
                output_rows[label] += money(txn.output_quantity)

        count_check = reconcile_material_count(material.id, all_transactions, as_of=period_end)

        rows.append({
            "material_id": material.id,
            "material_ref": material.material_ref,
            "name": material.name,
            "unit": material.unit,
            "opening_stock": money(opening_stock),
            "purchased": purchased_this_month,
            "consumed": consumed_this_month,
            "adjusted": adjusted_this_month,
            "closing_stock": money(closing_stock),
            "formula_variance": formula_variance,
            "output_produced": dict(output_rows),
            "physical_count_check": count_check,
            "low_stock": bool(material.reorder_point is not None and money(closing_stock) <= money(material.reorder_point)),
        })

    return {
        "month": month,
        "period_start": period_start.isoformat(),
        "period_end": period_end.isoformat(),
        "method": "periodic",
        "formula": "Opening Stock + Purchased - Consumed + Adjusted = Closing Stock",
        "materials": rows,
        "flags": {
            "unreconciled_count": [row["material_ref"] for row in rows if row["physical_count_check"] is None],
            "count_variance": [
                row["material_ref"] for row in rows
                if row["physical_count_check"] and abs(row["physical_count_check"]["variance"]) > 0.001
            ],
        },
    }


def build_report_library():
    financials = build_financial_report()
    dashboard = build_dashboard_summary()
    return [
        {
            "id": "RPT-FIN-MONTH",
            "name": "Monthly Financial Summary",
            "type": "Monthly",
            "status": "ready",
            "generated_by": "System",
            "notes": "Revenue, collected cash, expenses, profit and receivables aging.",
            "metrics": {
                "revenue": financials["revenue"],
                "profit": financials["profit"],
                "receivables": dashboard["receivables"],
            },
        },
        {
            "id": "RPT-OPS-PRINT",
            "name": "Production Pipeline Report",
            "type": "Operational",
            "status": "ready",
            "generated_by": "System",
            "notes": "Queued, printing, finishing and ready jobs for the print floor.",
            "metrics": dashboard["pipeline"],
        },
        {
            "id": "RPT-CLIENT-PERF",
            "name": "Client Performance Report",
            "type": "Quarterly",
            "status": "ready",
            "generated_by": "System",
            "notes": "Top clients by billed value and recurring work.",
            "metrics": {"top_clients": financials["top_clients"]},
        },
        {
            "id": "RPT-MACHINE-REV",
            "name": "Machine Revenue Report",
            "type": "Operational",
            "status": "ready",
            "generated_by": "System",
            "notes": "Revenue by DTF, large format, digital print, binding, sublimation, UV DTF and finishing machines.",
            "metrics": {"machine_revenue": financials["machine_revenue"]},
        },
        {
            "id": "RPT-MATERIALS-RECON",
            "name": "Monthly Materials Reconciliation",
            "type": "Monthly",
            "status": "ready",
            "generated_by": "System",
            "notes": "Periodic inventory method: opening stock, purchases, and closing stock reconcile to consumption per material, cross-checked against physical counts and against units produced. Call GET /api/reports/materials?month=YYYY-MM for the full table.",
            "metrics": {},
        },
    ]