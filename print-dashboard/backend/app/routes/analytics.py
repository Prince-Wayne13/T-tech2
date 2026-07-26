# path: backend/app/routes/analytics.py

from flask import Blueprint, jsonify, request

from ..services.analytics import (
    build_client_report,
    build_machine_category_revenue_report,
    build_monthly_projections,
    build_sales_vs_expenses_report,
    build_vendor_report,
)
from ..services.reports import build_job_throughput, build_quantity_produced

bp = Blueprint("analytics", __name__)


@bp.get("/vendors")
def vendor_report():
    return jsonify(build_vendor_report())


@bp.get("/clients")
def client_report():
    return jsonify(build_client_report())


@bp.get("/projections")
def monthly_projections():
    return jsonify(build_monthly_projections())


@bp.get("/sales-vs-expenses")
def sales_vs_expenses():
    return jsonify(build_sales_vs_expenses_report())


@bp.get("/machine-category-revenue")
def machine_category_revenue():
    return jsonify(build_machine_category_revenue_report(
        month=request.args.get("month"),
        service_type=request.args.get("service_type"),
    ))


@bp.get("/quantity-produced")
def quantity_produced():
    return jsonify(build_quantity_produced())


@bp.get("/job-throughput")
def job_throughput():
    return jsonify(build_job_throughput())