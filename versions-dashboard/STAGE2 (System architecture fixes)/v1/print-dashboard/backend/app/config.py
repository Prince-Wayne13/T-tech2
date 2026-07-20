import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent


class BaseConfig:
    SECRET_KEY = os.getenv("SECRET_KEY", "change-me-before-production")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JSON_SORT_KEYS = False
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    REPORT_EXPORT_DIR = os.getenv("REPORT_EXPORT_DIR", str(BASE_DIR / "exports"))
    COMPANY_PROFILE = {
        "name": os.getenv("COMPANY_NAME", "T-Tech Digital Print Studio"),
        "contact": {
            "phone": os.getenv("COMPANY_PHONE", "+265 999 000 000"),
            "email": os.getenv("COMPANY_EMAIL", "accounts@ttechprint.local"),
            "address": os.getenv("COMPANY_ADDRESS", "Blantyre, Malawi"),
        },
        "banking": {
            "bank": os.getenv("COMPANY_BANK", "National Bank"),
            "account_name": os.getenv("COMPANY_ACCOUNT_NAME", "T-Tech Digital Print Studio"),
            "account_number": os.getenv("COMPANY_ACCOUNT_NUMBER", "0000000000"),
        },
    }


class DevelopmentConfig(BaseConfig):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{BASE_DIR / 'instance' / 'ttech_dev.db'}",
    )


class ProductionConfig(BaseConfig):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{BASE_DIR / 'instance' / 'ttech_prod.db'}",
    )


class TestingConfig(BaseConfig):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


def config_by_name(name=None):
    selected = name or os.getenv("FLASK_ENV", "development")
    return {
        "development": DevelopmentConfig,
        "production": ProductionConfig,
        "testing": TestingConfig,
    }.get(selected, DevelopmentConfig)
