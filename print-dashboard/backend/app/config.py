import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent

# The 'instance' folder holds the SQLite database files. SQLite will not
# create this directory itself, so we ensure it exists before any
# SQLALCHEMY_DATABASE_URI is built. Doing this once here (module import time)
# means it's guaranteed to exist before Flask-SQLAlchemy ever tries to open
# a connection, no matter which config class gets used.
INSTANCE_DIR = BASE_DIR / "instance"
INSTANCE_DIR.mkdir(parents=True, exist_ok=True)


class BaseConfig:
    SECRET_KEY = os.getenv("SECRET_KEY", "change-me-before-production")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JSON_SORT_KEYS = False
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    REPORT_EXPORT_DIR = os.getenv("REPORT_EXPORT_DIR", str(BASE_DIR / "exports"))
    COMPANY_PROFILE = {
        "name": os.getenv("COMPANY_NAME", "T-Tech Suppliers & General Dealers Ltd"),
        "contact": {
            "phone": os.getenv("COMPANY_PHONE", "+265 988 231 291"),
            "email": os.getenv("COMPANY_EMAIL", "ttechsuppliers@gmail.com"),
            "address": os.getenv("COMPANY_ADDRESS", "Lilongwe, City Mall, Standard Bank Corridor"),
        },
        "banking": {
            "bank": os.getenv("COMPANY_BANK", "National Bank of Malawi"),
            "account_name": os.getenv("COMPANY_ACCOUNT_NAME", "T-Tech Suppliers & General Dealers Ltd"),
            "account_number": os.getenv("COMPANY_ACCOUNT_NUMBER", "1234567890"),
        },
    }


class DevelopmentConfig(BaseConfig):
    DEBUG = True
    # .as_posix() forces forward slashes even on Windows. sqlite/SQLAlchemy
    # URIs require forward slashes; a raw Windows path with backslashes
    # (e.g. C:\Users\...) gets mis-parsed and produces
    # "unable to open database file" even though the file exists and is
    # readable via sqlite3.connect() directly.
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{(INSTANCE_DIR / 'ttech_dev.db').as_posix()}",
    )


class ProductionConfig(BaseConfig):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{(INSTANCE_DIR / 'ttech_prod.db').as_posix()}",
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