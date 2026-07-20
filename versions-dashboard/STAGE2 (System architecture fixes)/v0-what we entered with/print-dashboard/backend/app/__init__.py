import os

from flask import Flask
from flask_cors import CORS

from .config import config_by_name
from .extensions import db, migrate
from .models import Invoice, Job, PricingItem, ProductionMachine, Vendor
from .routes import register_blueprints
from .services.invoices import serialize_invoice


def create_app(config_name=None):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(config_by_name(config_name))
    os.makedirs(app.instance_path, exist_ok=True)

    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    db.init_app(app)
    migrate.init_app(app, db)
    register_blueprints(app)

    @app.get("/api/health")
    def health_check():
        return {"status": "ok", "service": "ttech-print-dashboard"}

    @app.get("/api/search")
    def global_search():
        from flask import request

        q = request.args.get("q", "").strip()
        if not q:
            return {"query": q, "invoices": [], "jobs": [], "vendors": [], "machines": [], "pricing": []}

        term = f"%{q}%"
        invoices = Invoice.query.filter(
            Invoice.invoice_ref.ilike(term) | Invoice.client_name.ilike(term) | Invoice.title.ilike(term)
        ).order_by(Invoice.created_at.desc()).limit(6).all()
        jobs = Job.query.filter(
            Job.job_ref.ilike(term) | Job.client_name.ilike(term) | Job.title.ilike(term)
        ).order_by(Job.created_at.desc()).limit(6).all()
        vendors = Vendor.query.filter(
            Vendor.name.ilike(term) | Vendor.category.ilike(term) | Vendor.email.ilike(term)
        ).order_by(Vendor.name.asc()).limit(6).all()
        machines = ProductionMachine.query.filter(
            ProductionMachine.machine_ref.ilike(term)
            | ProductionMachine.name.ilike(term)
            | ProductionMachine.category.ilike(term)
            | ProductionMachine.capability.ilike(term)
        ).order_by(ProductionMachine.name.asc()).limit(6).all()
        pricing = PricingItem.query.filter(
            PricingItem.code.ilike(term) | PricingItem.name.ilike(term) | PricingItem.category.ilike(term)
        ).order_by(PricingItem.name.asc()).limit(6).all()

        return {
            "query": q,
            "invoices": [serialize_invoice(invoice) for invoice in invoices],
            "jobs": [job.to_dict() for job in jobs],
            "vendors": [vendor.to_dict() for vendor in vendors],
            "machines": [machine.to_dict() for machine in machines],
            "pricing": [item.to_dict() for item in pricing],
        }

    return app
