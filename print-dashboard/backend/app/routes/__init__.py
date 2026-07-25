# path: backend/app/routes/__init__.py

from .advances import bp as advances_bp
from .analytics import bp as analytics_bp
from .audit import bp as audit_bp
from .clients import bp as clients_bp
from .exports import bp as exports_bp
from .expenses import bp as expenses_bp
from .invoices import bp as invoices_bp
from .jobs import bp as jobs_bp
from .machines import bp as machines_bp
from .materials import bp as materials_bp
from .petty_cash import bp as petty_cash_bp
from .proposals import bp as proposals_bp
from .reports import bp as reports_bp
from .sales import bp as sales_bp
from .staff import bp as staff_bp
from .vendors import bp as vendors_bp


def register_blueprints(app):
    app.register_blueprint(jobs_bp, url_prefix="/api/jobs")
    app.register_blueprint(machines_bp, url_prefix="/api/machines")
    app.register_blueprint(materials_bp, url_prefix="/api/materials")
    app.register_blueprint(invoices_bp, url_prefix="/api/invoices")
    app.register_blueprint(proposals_bp, url_prefix="/api/proposals")
    app.register_blueprint(expenses_bp, url_prefix="/api/expenses")
    app.register_blueprint(vendors_bp, url_prefix="/api/vendors")
    app.register_blueprint(advances_bp, url_prefix="/api/advances")
    app.register_blueprint(clients_bp, url_prefix="/api/clients")
    app.register_blueprint(reports_bp, url_prefix="/api/reports")
    app.register_blueprint(analytics_bp, url_prefix="/api/reports/analytics")
    app.register_blueprint(exports_bp, url_prefix="/api/exports")
    app.register_blueprint(audit_bp, url_prefix="/api/audit")
    app.register_blueprint(staff_bp, url_prefix="/api/staff")
    app.register_blueprint(sales_bp, url_prefix="/api/sales")
    app.register_blueprint(petty_cash_bp, url_prefix="/api/petty-cash")