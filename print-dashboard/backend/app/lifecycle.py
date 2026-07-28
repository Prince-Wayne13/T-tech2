"""
lifecycle.py

Everything that needs to happen once, in order, when the desktop app
starts up -- and the matching cleanup when it closes. main.py calls
into this file rather than doing all of this inline, so main.py itself
stays short and easy to read.

Startup order this file follows (each step depends on the one before):
  1. Work out where this computer should store its data
     (C:\\ProgramData\\TTechStudio on Windows), and make sure the
     folder exists.
  2. Turn on rotating crash/error logging, writing into that folder,
     before anything else runs -- so if a later step fails, there is
     still a log of it.
  3. Build the backup scheduler and give it the notification functions
     from notify.py, so every backup start/success/failure
     automatically shows a Windows notification with no extra wiring
     needed elsewhere.
  4. Start the backup scheduler's background timer.

bootstrap_app() below runs all of this and hands back the pieces
main.py needs (the Flask app, the scheduler, and the log file path).
"""

from __future__ import annotations

import logging
import logging.handlers
import os
import platform
from pathlib import Path

logger = logging.getLogger("ttech.lifecycle")


def get_data_dir() -> Path:
    """
    Where this app stores its database, logs, and local backup copies.
    Resolved fresh on whatever computer is currently running the app --
    this is what makes laptop testing completely separate from the
    office computer; see Part 4 of the build plan.
    """
    if platform.system() == "Windows":
        base = os.environ.get("PROGRAMDATA", r"C:\ProgramData")
        data_dir = Path(base) / "TTechStudio"
    else:
        # Non-Windows fallback, used only for testing this code on a
        # Mac/Linux machine before packaging the real Windows .exe.
        data_dir = Path.home() / ".ttechstudio"

    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "logs").mkdir(parents=True, exist_ok=True)
    (data_dir / "backups").mkdir(parents=True, exist_ok=True)
    return data_dir


def setup_logging(data_dir: Path) -> Path:
    """
    Turns on rotating file logging (app.log, kept to a sensible size
    so it never grows forever) plus console output, so both a
    developer running main.py directly and the packaged .exe get a
    written record of everything that happens.
    """
    log_path = data_dir / "logs" / "app.log"

    root_logger = logging.getLogger("ttech")
    root_logger.setLevel(logging.INFO)

    file_handler = logging.handlers.RotatingFileHandler(
        log_path, maxBytes=5 * 1024 * 1024, backupCount=5, encoding="utf-8"
    )
    console_handler = logging.StreamHandler()

    formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    )
    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)

    root_logger.addHandler(file_handler)
    root_logger.addHandler(console_handler)

    logger.info("Logging initialized")
    return log_path


def install_crash_hook() -> None:
    """
    Catches any error that would otherwise crash the app silently with
    no record of why, and writes it to the log before the app exits.
    """
    import sys

    def handle_uncaught(exc_type, exc_value, exc_tb):
        logger.error(
            "Unhandled crash", exc_info=(exc_type, exc_value, exc_tb)
        )
        sys.__excepthook__(exc_type, exc_value, exc_tb)

    sys.excepthook = handle_uncaught


def build_backup_scheduler(data_dir: Path, log_path: Path):
    """
    Builds (but does not yet start) the BackupScheduler, wired up to
    notify.py so every backup event automatically shows a Windows
    notification. Also returns it so main.py can attach it to
    app.config["BACKUP_SCHEDULER"] for the manual "Backup Now" button.
    """
    from . import notify
    from .backup_scheduler import BackupScheduler
    from .config import _production_data_dir

    # The real SQLite file Flask/SQLAlchemy is using day-to-day.
    # ProductionConfig resolves this via config.py's
    # _production_data_dir() (C:\ProgramData\TTechStudio on Windows),
    # NOT relative to wherever the .exe happens to be installed -- see
    # config.py for why. The desktop app always runs under the
    # production config (see main.py), so this matches it exactly.
    source_db_path = str(_production_data_dir() / "ttech_prod.db")

    local_backup_dir = str(data_dir / "backups")
    sync_fallback_dir = str(data_dir / "backups" / "cloud-fallback")

    scheduler = BackupScheduler(
        source_db_path=source_db_path,
        local_backup_dir=local_backup_dir,
        log_file_path=str(log_path),
        sync_fallback_dir=sync_fallback_dir,
        on_result=notify.on_backup_result,
    )
    return scheduler


def build_reports_scheduler(data_dir: Path, flask_app):
    """
    Builds (but does not yet start) the WeeklyReportsScheduler. Unlike
    the database backup, this system never writes a local copy -- its
    only destination is the detected cloud-sync folder -- so it only
    needs a small local status file (last-sent date) to know when the
    next weekly send is due, not a local backups directory.

    flask_app is passed through so the scheduler's background thread
    can open its own Flask app context before touching the database --
    background threads don't automatically have one the way a normal
    web request does.
    """
    from .reports_backup import WeeklyReportsScheduler

    sync_fallback_dir = str(data_dir / "backups" / "cloud-fallback")
    status_file_path = str(data_dir / "reports_status.json")

    return WeeklyReportsScheduler(
        sync_fallback_dir=sync_fallback_dir,
        status_file_path=status_file_path,
        flask_app=flask_app,
    )


def bootstrap_app(config_name: str = "production"):
    """
    Runs the full startup sequence and returns everything main.py
    needs: (flask_app, scheduler, reports_scheduler, log_path).
    """
    data_dir = get_data_dir()
    log_path = setup_logging(data_dir)
    install_crash_hook()

    from . import create_app
    from .extensions import db
    from .schema_migrations import run_full_upgrade

    flask_app = create_app(config_name)

    with flask_app.app_context():
        db.create_all()
        run_full_upgrade()

    scheduler = build_backup_scheduler(data_dir, log_path)
    flask_app.config["BACKUP_SCHEDULER"] = scheduler
    scheduler.start()

    reports_scheduler = build_reports_scheduler(data_dir, flask_app)
    flask_app.config["REPORTS_SCHEDULER"] = reports_scheduler
    reports_scheduler.start()

    logger.info("App lifecycle bootstrapped (data dir: %s)", data_dir)

    return flask_app, scheduler, reports_scheduler, log_path


def shutdown_app(scheduler, reports_scheduler=None) -> None:
    logger.info("Shutting down: stopping backup scheduler")
    scheduler.stop()
    if reports_scheduler is not None:
        logger.info("Shutting down: stopping weekly reports scheduler")
        reports_scheduler.stop()
