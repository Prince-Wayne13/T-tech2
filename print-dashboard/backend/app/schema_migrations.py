from sqlalchemy import inspect, text

from .extensions import db
from .models import Invoice, Job
from .services.invoices import sync_invoice_amount
from .services.jobs import normalise_job_status


def _columns(table_name):
    return {column["name"] for column in inspect(db.engine).get_columns(table_name)}


def _add_column(table_name, column_sql):
    db.session.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_sql}"))


def ensure_job_invoice_schema():
    """Apply the lightweight SQLite schema changes needed by the Job->Invoice flow.

    This is intentionally idempotent so it can be run safely on local dev databases
    that predate the new ORM columns. Flask-Migrate/Alembic can still be used for a
    formal production migration later.
    """
    changed = []
    invoice_columns = _columns("invoices")
    payment_columns = _columns("payments")

    if "job_id" not in invoice_columns:
        _add_column("invoices", "job_id INTEGER REFERENCES jobs(id)")
        changed.append("invoices.job_id")

    if "job_id" not in payment_columns:
        _add_column("payments", "job_id INTEGER REFERENCES jobs(id)")
        changed.append("payments.job_id")

    db.session.commit()
    return changed


def normalize_legacy_job_statuses():
    updated = 0
    for job in Job.query.all():
        normalized = normalise_job_status(job.status)
        if job.status != normalized:
            job.status = normalized
            updated += 1
    db.session.commit()
    return updated


def backfill_invoice_jobs():
    created = 0
    for invoice in Invoice.query.filter(Invoice.job_id.is_(None)).order_by(Invoice.id.asc()).all():
        job = Job(
            job_ref=next_job_ref(),
            client_id=invoice.client_id,
            client_name=invoice.client_name,
            title=invoice.title,
            service_category="Backfilled Invoice Job",
            status="finished",
            priority="medium",
            progress=100,
            due_date=invoice.due_on,
            notes=f"Synthetic job backfilled for {invoice.invoice_ref}.",
        )
        db.session.add(job)
        db.session.flush()
        invoice.job_id = job.id
        for payment in invoice.payments:
            payment.job_id = job.id
        sync_invoice_amount(invoice)
        created += 1
    db.session.commit()
    return created


def next_job_ref():
    last = Job.query.order_by(Job.id.desc()).first()
    return f"JOB-{((last.id if last else 0) + 1):04d}"


def upgrade_job_invoice_flow():
    changed = ensure_job_invoice_schema()
    normalized = normalize_legacy_job_statuses()
    backfilled = backfill_invoice_jobs()
    return {
        "schema_changes": changed,
        "statuses_normalized": normalized,
        "invoice_jobs_backfilled": backfilled,
    }
