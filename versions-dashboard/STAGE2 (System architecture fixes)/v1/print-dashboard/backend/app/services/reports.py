from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal

from ..models import Expense, Invoice, Job, ProductionMachine
from .invoices import invoice_totals


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
    return {"sent", "overdue", "paid"}


def build_dashboard_summary():
    invoices = Invoice.query.all()
    expenses = Expense.query.all()
    jobs = Job.query.all()

    totals = {invoice.id: invoice_totals(invoice) for invoice in invoices}
    outstanding = sum(totals[i.id]["balance"] for i in invoices if i.status in {"sent", "overdue"})
    paid = sum(totals[i.id]["paid"] for i in invoices)
    booked_revenue = sum(totals[i.id]["total"] for i in invoices if i.status in active_invoice_statuses())
    total_expenses = sum(money(e.amount) for e in expenses if e.status in {"approved", "reimbursed"})
    overdue = [
        i for i in invoices
        if i.due_on and i.due_on < date.today() and i.status not in {"paid", "cancelled"}
    ]

    return {
        "cash_balance": paid - total_expenses,
        "receivables": outstanding,
        "expenses": total_expenses,
        "booked_revenue": booked_revenue,
        "gross_profit": booked_revenue - total_expenses,
        "active_jobs": len([j for j in jobs if j.status in {"queued", "printing"}]),
        "overdue_invoices": len(overdue),
        "pipeline": {
            "queued": len([j for j in jobs if j.status == "queued"]),
            "printing": len([j for j in jobs if j.status == "printing"]),
            "finishing": len([j for j in jobs if j.status == "finishing"]),
            "ready": len([j for j in jobs if j.status == "ready"]),
        },
    }


def build_financial_report(period="month"):
    invoices = Invoice.query.all()
    expenses = Expense.query.all()
    jobs = Job.query.all()

    revenue = sum(invoice_totals(invoice)["total"] for invoice in invoices if invoice.status in active_invoice_statuses())
    paid = sum(invoice_totals(invoice)["paid"] for invoice in invoices)
    expense_total = sum(money(expense.amount) for expense in expenses if expense.status in {"approved", "reimbursed"})

    by_status = defaultdict(float)
    by_month = defaultdict(float)
    expenses_by_month = defaultdict(float)
    client_revenue = defaultdict(float)
    product_mix = defaultdict(float)
    expense_categories = defaultdict(float)

    for invoice in invoices:
        totals = invoice_totals(invoice)
        by_status[invoice.status] += totals["total"]
        by_month[month_key(invoice.issued_on)] += totals["total"]
        client_revenue[invoice.client_name] += totals["total"]
        for item in invoice.line_items:
            product_mix[item.product_type or "General Print"] += float(item.line_total())

    for expense in expenses:
        expense_categories[expense.category] += money(expense.amount)
        expenses_by_month[month_key(expense.expense_date)] += money(expense.amount)

    month_keys = trailing_month_keys()

    return {
        "period": period,
        "revenue": revenue,
        "cash_collected": paid,
        "expenses": expense_total,
        "profit": revenue - expense_total,
        "invoice_totals_by_status": dict(by_status),
        "expense_totals_by_category": dict(expense_categories),
        "revenue_by_month": {key: by_month.get(key, 0.0) for key in month_keys},
        "expenses_by_month": {key: expenses_by_month.get(key, 0.0) for key in month_keys},
        "top_clients": [
            {"client_name": client, "revenue": amount}
            for client, amount in sorted(client_revenue.items(), key=lambda row: row[1], reverse=True)[:5]
        ],
        "product_mix": dict(sorted(product_mix.items(), key=lambda row: row[1], reverse=True)),
        "receivables_aging": build_receivables_aging(invoices),
        "production": {
            "active_jobs": len([job for job in jobs if job.status in {"queued", "printing", "finishing"}]),
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
        if invoice.status not in active_invoice_statuses():
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
    ]
