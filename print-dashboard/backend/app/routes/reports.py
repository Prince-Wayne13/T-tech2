# path: backend/app/routes/reports.py

from flask import Blueprint, jsonify, request

from ..services.materials import build_materials_reconciliation
from ..services.reports import build_dashboard_summary, build_financial_report, build_machine_revenue, build_report_library

bp = Blueprint("reports", __name__)


@bp.get("/dashboard")
def dashboard():
    return jsonify(build_dashboard_summary())


@bp.get("/financials")
def financials():
    return jsonify(build_financial_report(period=request.args.get("period", "month")))


@bp.get("/materials")
def materials_reconciliation_report():
    """Was entirely missing -- Materials.jsx's Month-End Report tab has
    always called this exact address (api.materialsReconciliationReport),
    and it fell through to the catch-all frontend route instead of real
    data every time."""
    return jsonify(build_materials_reconciliation(month=request.args.get("month")))


@bp.get("")
def reports_library():
    items = build_report_library()
    return jsonify({"items": items, "total": len(items)})


@bp.get("/machines/revenue")
def machine_revenue():
    rows = build_machine_revenue()
    return jsonify({"items": rows, "total": len(rows)})