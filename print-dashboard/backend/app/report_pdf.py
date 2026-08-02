"""
report_pdf.py

Real PDF generation via reportlab for the weekly reports package sent to
Drive (see reports_backup.py). Built around the ACTUAL shapes returned by
services/reports.py (flat money dicts, a few list-of-dict tables, and three
genuinely nested structures: machine_revenue, quantity_produced,
job_throughput) rather than one generic recursive renderer for everything --
a generic approach is what produced the old, mashed-up HTML this replaces.
"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT

HEADER_BG = colors.HexColor("#2b2f38")
ROW_ALT_BG = colors.HexColor("#f5f6f8")
BORDER = colors.HexColor("#cccccc")
MUTED = colors.HexColor("#777777")

styles = getSampleStyleSheet()
TITLE_STYLE = ParagraphStyle("ReportTitle", parent=styles["Title"], fontSize=20, spaceAfter=2, alignment=TA_LEFT)
GENERATED_STYLE = ParagraphStyle("Generated", parent=styles["Normal"], fontSize=9, textColor=MUTED, spaceAfter=16)
SECTION_STYLE = ParagraphStyle("Section", parent=styles["Heading2"], fontSize=13, spaceBefore=18, spaceAfter=6, textColor=colors.HexColor("#333333"))
NOTE_STYLE = ParagraphStyle("Note", parent=styles["Normal"], fontSize=8, textColor=MUTED, spaceBefore=2, spaceAfter=8)


def money_fmt(value) -> str:
    try:
        return f"MK {float(value):,.0f}"
    except (TypeError, ValueError):
        return str(value)


def _styled_table(data_rows, col_widths=None, money_cols=None):
    """
    Builds one reportlab Table with the header row styled dark, alternating
    row backgrounds, and right-aligned numeric columns -- the same visual
    language across every report instead of ad-hoc nesting.
    money_cols: set of column indices (0-based) to right-align + treat as
    already-formatted currency strings.
    """
    table = Table(data_rows, colWidths=col_widths, repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]
    for i in range(1, len(data_rows)):
        if i % 2 == 0:
            style.append(("BACKGROUND", (0, i), (-1, i), ROW_ALT_BG))
    if money_cols:
        for col in money_cols:
            style.append(("ALIGN", (col, 1), (col, -1), "RIGHT"))
    table.setStyle(TableStyle(style))
    return table


def _kv_table(pairs: list[tuple[str, str]], money_keys: set[str] | None = None):
    """Simple two-column label/value table for flat dicts like revenue/expenses/profit."""
    money_keys = money_keys or set()
    rows = [["Metric", "Value"]]
    money_col = {1} if money_keys else set()
    for label, value in pairs:
        display = money_fmt(value) if label in money_keys else str(value)
        rows.append([label, display])
    return _styled_table(rows, col_widths=[100 * mm, 70 * mm], money_cols=money_col)


def _month_table(month_dict: dict, value_label="Amount", is_money=True):
    rows = [["Month", value_label]]
    for month, value in month_dict.items():
        rows.append([month, money_fmt(value) if is_money else str(value)])
    return _styled_table(rows, col_widths=[80 * mm, 90 * mm], money_cols={1})


CELL_STYLE = ParagraphStyle("Cell", parent=styles["Normal"], fontSize=9, leading=11)
CELL_HEADER_STYLE = ParagraphStyle("CellHeader", parent=styles["Normal"], fontSize=9, leading=11, textColor=colors.white, fontName="Helvetica-Bold")


def _list_of_dict_table(items: list[dict], columns: list[tuple[str, str]], money_keys: set[str] | None = None, col_widths=None, wrap_cols=None):
    """
    columns: list of (dict_key, display_header). money_keys: set of dict_keys
    to right-align + currency-format. col_widths: explicit widths (mm) per
    column, overriding the even-split default -- needed whenever columns
    hold very different amounts of text (e.g. a machine name vs. a status
    word). wrap_cols: set of column indices whose text should wrap inside
    the cell (via Paragraph) instead of overflowing past the column edge.
    """
    money_keys = money_keys or set()
    wrap_cols = wrap_cols or set()
    header = [label for _, label in columns]
    money_cols = set()
    for idx, (key, _) in enumerate(columns):
        if key in money_keys:
            money_cols.add(idx)

    def _cell(text, idx, is_header=False):
        if idx in wrap_cols:
            style = CELL_HEADER_STYLE if is_header else CELL_STYLE
            return Paragraph(str(text), style)
        return text

    rows = [[_cell(h, i, is_header=True) for i, h in enumerate(header)]]
    for item in items:
        row = []
        for idx, (key, _) in enumerate(columns):
            value = item.get(key, "")
            display = money_fmt(value) if key in money_keys else ("" if value is None else str(value))
            row.append(_cell(display, idx))
        rows.append(row)
    if not items:
        rows.append(["No data", *([""] * (len(header) - 1))])

    if col_widths is None:
        equal_width = 170 * mm / max(len(header), 1)
        col_widths = [equal_width] * len(header)
    return _styled_table(rows, col_widths=col_widths, money_cols=money_cols)


class ReportBuilder:
    """Accumulates flowables for one PDF report, then writes it to disk."""

    def __init__(self, title: str):
        self.title = title
        self.flowables = [
            Paragraph(title, TITLE_STYLE),
            Paragraph(f"Generated {datetime.now().strftime('%Y-%m-%d %H:%M')}", GENERATED_STYLE),
        ]

    def section(self, heading: str, note: str | None = None):
        self.flowables.append(Paragraph(heading, SECTION_STYLE))
        if note:
            self.flowables.append(Paragraph(note, NOTE_STYLE))

    def add(self, flowable):
        self.flowables.append(flowable)
        self.flowables.append(Spacer(1, 4 * mm))

    def write(self, path: Path):
        doc = SimpleDocTemplate(
            str(path), pagesize=A4,
            topMargin=18 * mm, bottomMargin=16 * mm, leftMargin=16 * mm, rightMargin=16 * mm,
        )
        doc.build(self.flowables)


# ---------------------------------------------------------------------------
# Report-specific builders, one per report, each laid out for its own shape
# ---------------------------------------------------------------------------

def build_income_statement_pdf(financials: dict, path: Path):
    r = ReportBuilder("Income Statement")

    r.section("Booked Revenue, Expenses & Profit")
    r.add(_kv_table(
        [("Revenue", financials["revenue"]), ("Expenses", financials["expenses"]), ("Profit", financials["profit"])],
        money_keys={"Revenue", "Expenses", "Profit"},
    ))

    r.section("Cash-Basis Revenue, Expenses & Profit")
    r.add(_kv_table(
        [("Cash Revenue", financials["cash_revenue"]), ("Cash Expenses", financials["cash_expenses"]), ("Cash Profit", financials["cash_profit"])],
        money_keys={"Cash Revenue", "Cash Expenses", "Cash Profit"},
    ))

    r.section("Revenue By Status")
    r.add(_kv_table(list(financials["invoice_totals_by_status"].items()), money_keys=set(financials["invoice_totals_by_status"].keys())))

    r.section("Expenses By Category")
    r.add(_kv_table(list(financials["expense_totals_by_category"].items()), money_keys=set(financials["expense_totals_by_category"].keys())))

    r.section("Top Clients")
    r.add(_list_of_dict_table(
        financials["top_clients"],
        columns=[("client_name", "Client"), ("revenue", "Revenue")],
        money_keys={"revenue"},
        col_widths=[110 * mm, 60 * mm],
        wrap_cols={0},
    ))

    r.write(path)


def build_cashflow_pdf(financials: dict, dashboard: dict, path: Path):
    r = ReportBuilder("Cashflow Report")

    r.section("Current Position")
    r.add(_kv_table(
        [("Cash Balance", dashboard["cash_balance"]), ("Receivables", dashboard["receivables"]), ("Overdue Invoices", dashboard["overdue_invoices"])],
        money_keys={"Cash Balance", "Receivables"},
    ))

    r.section("Cash Collected By Month")
    r.add(_month_table(financials["revenue_by_month"]))

    r.section("Cash Paid Out By Month (Expenses)")
    r.add(_month_table(financials["expenses_by_month"]))

    r.section("Receivables Aging")
    # build_receivables_aging() (services/reports.py) always returns a flat
    # {bucket_name: amount} dict, never a list - so this only needs the
    # dict path.
    aging = financials["receivables_aging"]
    r.add(_kv_table(list(aging.items()), money_keys=set(aging.keys())))

    r.write(path)


def build_analytics_pdf(dashboard: dict, financials: dict, quantity_produced: dict, job_throughput: dict, path: Path):
    r = ReportBuilder("Analytics — Production & Machines")

    r.section("Job Pipeline")
    r.add(_kv_table(list(dashboard["pipeline"].items())))

    r.section("Machine Revenue")
    r.add(_list_of_dict_table(
        financials["machine_revenue"],
        columns=[
            ("machine_ref", "Ref"), ("name", "Machine"), ("category", "Category"),
            ("status", "Status"), ("revenue", "Revenue"), ("jobs", "Jobs"),
        ],
        money_keys={"revenue"},
        col_widths=[26 * mm, 48 * mm, 28 * mm, 18 * mm, 32 * mm, 18 * mm],
        wrap_cols={0, 1, 2},
    ))

    r.section("Quantity Produced — By Month")
    r.add(_month_table(quantity_produced["quantity_by_month"], value_label="Units", is_money=False))

    r.section("Quantity Produced — By Type")
    by_type = quantity_produced["quantity_by_type"]
    r.add(_kv_table(list(by_type.items())))

    r.section(
        "Quantity Produced — By Month & Type",
        note="One table per month; only months with production activity are shown.",
    )
    for mkey, type_dict in quantity_produced["quantity_by_month_and_type"].items():
        if not type_dict:
            continue
        r.flowables.append(Paragraph(mkey, ParagraphStyle("MonthSub", parent=styles["Heading3"], fontSize=10, spaceBefore=6, spaceAfter=3)))
        r.add(_kv_table(list(type_dict.items())))

    r.section("Job Throughput — Units Completed By Month")
    r.add(_month_table(job_throughput["units_completed_by_month"], value_label="Units", is_money=False))

    r.section("Job Throughput — By Machine")
    r.add(_list_of_dict_table(
        job_throughput["units_completed_by_machine"],
        columns=[("machine", "Machine"), ("units_completed", "Units Completed"), ("job_count", "Job Count")],
        col_widths=[90 * mm, 50 * mm, 30 * mm],
        wrap_cols={0},
    ))

    r.section("Job Throughput — By Status")
    r.add(_kv_table(list(job_throughput["units_completed_by_status"].items())))

    r.section("In-Progress Summary")
    ips = job_throughput["in_progress_summary"]
    r.add(_kv_table([
        ("Job Count", ips["job_count"]), ("Units Completed", ips["units_completed"]),
        ("Units Total", ips["units_total"]), ("Units Remaining", ips["units_remaining"]),
    ]))

    r.section("Product Mix (Revenue)")
    r.add(_kv_table(list(financials["product_mix"].items()), money_keys=set(financials["product_mix"].keys())))

    r.write(path)


def build_audit_log_pdf(audit_data: dict, path: Path):
    """
    audit_data: services/reports.py's build_audit_log_entries() return
    shape - {"entries": [...], "total_count": int, "shown_count": int}.
    entries are AuditLog.to_dict() rows: id, actor, action, entity_type,
    entity_id, created_at (ISO string).
    """
    r = ReportBuilder("Audit Log")

    total_count = audit_data.get("total_count", 0)
    shown_count = audit_data.get("shown_count", 0)
    note = None
    if total_count > shown_count:
        note = f"Showing the {shown_count:,} most recent entries out of {total_count:,} total on record."
    r.section("Recent Activity", note=note)

    entries = audit_data.get("entries", [])
    rows = [
        {
            "created_at": _format_audit_timestamp(entry.get("created_at")),
            "actor": entry.get("actor") or "system",
            "action": entry.get("action") or "",
            "entity_type": entry.get("entity_type") or "-",
        }
        for entry in entries
    ]
    r.add(_list_of_dict_table(
        rows,
        columns=[
            ("created_at", "Date/Time"), ("actor", "Actor"),
            ("action", "Action"), ("entity_type", "Entity"),
        ],
        col_widths=[32 * mm, 26 * mm, 92 * mm, 20 * mm],
        wrap_cols={2},
    ))

    r.write(path)


def _format_audit_timestamp(value) -> str:
    """AuditLog.to_dict() stores created_at as an ISO string (models.py) -
    reformatted here to something readable in a printed report rather than
    the raw 'YYYY-MM-DDTHH:MM:SS.ffffff' form."""
    if not value:
        return ""
    try:
        return datetime.fromisoformat(value).strftime("%Y-%m-%d %H:%M")
    except (TypeError, ValueError):
        return str(value)
