import os

from flask import Flask
from flask_cors import CORS

from .config import config_by_name
from .extensions import db, migrate
from .routes import register_blueprints


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

    return app
