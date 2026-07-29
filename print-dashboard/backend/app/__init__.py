# path: backend/app/__init__.py

import logging
import os
from pathlib import Path

from flask import Flask, send_from_directory
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from .config import BASE_DIR, config_by_name
from .extensions import db, migrate
from .models import Invoice, Job, Material, MaterialTransaction, PricingItem, ProductionMachine, Vendor
from .routes import register_blueprints
from .services.invoices import serialize_invoice

logger = logging.getLogger("ttech.app")

import sys


def _resolve_frontend_dist_dir() -> Path:
    """
    Where the built on-screen app (npm run build's output) actually
    lives, in either of two very different situations:

      - Plain `python main.py` during development: the frontend sits
        at print-dashboard/dist, right next to the backend folder --
        BASE_DIR.parent / "dist" (unchanged from before).

      - The packaged TTechStudio.exe: PyInstaller extracts bundled
        data files (see the --add-data flag in the packaging command
        in scripts/build_exe.md) into a temporary folder at startup,
        given to us as sys._MEIPASS. The dist folder must be bundled
        under the name "dist" for this path to line up -- see the
        packaging instructions.
    """
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        return Path(sys._MEIPASS) / "dist"
    return BASE_DIR.parent / "dist"


# Where `npm run build` (Vite) places the built frontend -- see
# print-dashboard/vite.config.js and package.json. Only used when the
# desktop app is running as a single packaged .exe; during normal web
# development the frontend runs separately via `npm run dev`.
FRONTEND_DIST_DIR = _resolve_frontend_dist_dir()


def create_app(config_name=None):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(config_by_name(config_name))
    # Flask's own instance_path (app.instance_path) resolves relative to
    # the app's root folder -- for the packaged .exe that's wherever it's
    # installed (e.g. C:\Program Files (x86)\T-Tech Studio), which a
    # normal user install can't write to. Same bug as config.py's
    # INSTANCE_DIR (see the comment there); same fix: only needed in
    # dev, since production never reads/writes anything under Flask's
    # instance folder -- the DB and logs go through
    # _production_data_dir()/lifecycle.get_data_dir() instead.
    if not getattr(sys, "frozen", False):
        os.makedirs(app.instance_path, exist_ok=True)

    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    db.init_app(app)
    migrate.init_app(app, db)
    register_blueprints(app)

    @app.errorhandler(Exception)
    def log_unhandled_error(err):
        # HTTPException covers Flask's own normal responses -- a
        # wrong web address (404), calling something the wrong way
        # (405 Method Not Allowed), and similar. These are not
        # application bugs, so they're returned as-is, without being
        # written to the crash log and without being re-raised (doing
        # so previously produced a second, confusing 500 error on top
        # of every ordinary 404/405 -- fixed here).
        if isinstance(err, HTTPException):
            return err

        # Anything else is a genuine, unexpected crash -- write it to
        # the rotating app.log file (set up in lifecycle.py), not just
        # printed to a console window nobody is watching, then re-raise
        # so Flask's normal 500 response still happens afterward.
        logger.exception("Unhandled request error: %s", err)
        raise err

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
        # Only active once the frontend has actually been built (see
        # Step 4/6 of the build plan). During plain `flask run` API
        # development, this folder won't exist yet, so those requests
        # simply fall through to Flask's normal 404 -- no behavior
        # change for anyone doing backend-only work.
        if not FRONTEND_DIST_DIR.is_dir():
            return {"error": "Frontend build not found. Run 'npm run build' first."}, 404

        requested = FRONTEND_DIST_DIR / path
        if path and requested.is_file():
            return send_from_directory(FRONTEND_DIST_DIR, path)
        return send_from_directory(FRONTEND_DIST_DIR, "index.html")

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