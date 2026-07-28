import os
import sys
from pathlib import Path


def _resolve_base_dir() -> Path:
    """
    Works out the folder this code is actually running from, whether
    that's:
      - plain `python main.py` during development (BASE_DIR = the
        backend folder, same as before), or
      - the packaged TTechStudio.exe, where PyInstaller extracts
        everything into a temporary folder at startup and __file__
        would silently point inside THAT temp folder instead of
        wherever the .exe file actually lives on the user's computer.

    sys.frozen / sys._MEIPASS are PyInstaller's own documented way to
    detect this at runtime -- not something this project invented.
    Getting this wrong doesn't crash loudly; it just makes paths built
    from BASE_DIR (the database location, the built frontend files,
    the exports folder) silently point somewhere temporary that
    disappears the moment the app closes, so it needs to be right.
    """
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent.parent


BASE_DIR = _resolve_base_dir()

# The 'instance' folder holds the SQLite database files during plain
# `python main.py` / web development (DevelopmentConfig, below). SQLite
# will not create this directory itself, so we ensure it exists before
# any SQLALCHEMY_DATABASE_URI is built. Doing this once here (module
# import time) means it's guaranteed to exist before Flask-SQLAlchemy
# ever tries to open a connection, no matter which config class gets used.
#
# ProductionConfig -- what the packaged desktop app actually runs
# under -- does NOT use this folder for its database. It uses the
# per-machine data folder that lifecycle.py's get_data_dir() resolves
# (C:\ProgramData\TTechStudio), which stays correct and stable
# regardless of where the .exe itself is installed or moved, and
# survives a re-install of the app. See ProductionConfig below.
INSTANCE_DIR = BASE_DIR / "instance"
INSTANCE_DIR.mkdir(parents=True, exist_ok=True)


def _production_data_dir() -> Path:
    # Mirrors lifecycle.get_data_dir() exactly, without importing
    # lifecycle.py here (this file is imported very early, before
    # logging/lifecycle are set up) -- if this ever needs to change,
    # change it in both places together.
    import platform
    if platform.system() == "Windows":
        base = os.environ.get("PROGRAMDATA", r"C:\ProgramData")
        data_dir = Path(base) / "TTechStudio"
    else:
        data_dir = Path.home() / ".ttechstudio"
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir


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
    # Deliberately NOT under INSTANCE_DIR/BASE_DIR -- see
    # _production_data_dir() above. This must stay stable no matter
    # where the .exe is installed, moved, or re-packaged, and must
    # never depend on PyInstaller's temporary extraction folder.
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{(_production_data_dir() / 'ttech_prod.db').as_posix()}",
    )
    # The desktop app (main.py) serves its on-screen files and its API
    # from the exact same address (http://127.0.0.1:5000), unlike plain
    # web development where the frontend runs separately on port 5173
    # (see BaseConfig above). Same-address requests don't strictly need
    # CORS permission at all, but pywebview's internal browser still
    # sends the preflight check, so this address must be explicitly
    # allowed or every real request gets silently blocked after its
    # OPTIONS preflight succeeds -- which looks exactly like a request
    # that "just stops" with no error message.
    CORS_ORIGINS = os.getenv(
        "CORS_ORIGINS", "http://127.0.0.1:5000,http://localhost:5000"
    ).split(",")


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