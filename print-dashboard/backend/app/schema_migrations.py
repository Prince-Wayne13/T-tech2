# path: backend/app/schema_migrations.py

from sqlalchemy import inspect, text

from .extensions import db
from .models import Invoice, Job, Staff
from .services.invoices import sync_invoice_amount
from .services.jobs import normalise_job_status


def _columns(table_name):
    return {column["name"] for column in inspect(db.engine).get_columns(table_name)}


def _tables():
    return set(inspect(db.engine).get_table_names())


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


def ensure_payment_invoice_nullable_schema():
    """Rebuild legacy payments tables where invoice_id is still NOT NULL.

    SQLite cannot loosen a column constraint with ALTER TABLE, so databases
    created before job-linked payments allowed invoice-free rows need a table
    rebuild. This function is intentionally a no-op once the live table reports
    payments.invoice_id as nullable.
    """
    if "payments" not in _tables():
        return []

    payment_columns = inspect(db.engine).get_columns("payments")
    invoice_id = next(
        (column for column in payment_columns if column["name"] == "invoice_id"),
        None,
    )

    if invoice_id is None or invoice_id["nullable"]:
        return []

    changed = ["payments.invoice_id nullable"]
    copy_columns = [
        "id",
        "invoice_id",
        "job_id",
        "payment_ref",
        "amount",
        "method",
        "paid_on",
        "received_by",
        "notes",
        "created_at",
        "updated_at",
    ]
    column_sql = ", ".join(copy_columns)

    with db.engine.begin() as connection:
        connection.execute(text("DROP TABLE IF EXISTS payments_new"))
        connection.execute(
            text(
                """
                CREATE TABLE payments_new (
                    id INTEGER NOT NULL,
                    invoice_id INTEGER,
                    job_id INTEGER,
                    payment_ref VARCHAR(40) NOT NULL,
                    amount NUMERIC(14, 2) NOT NULL,
                    method VARCHAR(60),
                    paid_on DATE NOT NULL,
                    received_by VARCHAR(120),
                    notes TEXT,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    PRIMARY KEY (id),
                    FOREIGN KEY(invoice_id) REFERENCES invoices (id),
                    FOREIGN KEY(job_id) REFERENCES jobs (id)
                )
                """
            )
        )
        connection.execute(
            text(
                f"""
                INSERT INTO payments_new ({column_sql})
                SELECT {column_sql}
                FROM payments
                """
            )
        )
        connection.execute(text("DROP TABLE payments"))
        connection.execute(text("ALTER TABLE payments_new RENAME TO payments"))
        connection.execute(
            text("CREATE INDEX ix_payments_invoice_id ON payments (invoice_id)")
        )
        connection.execute(text("CREATE INDEX ix_payments_job_id ON payments (job_id)"))
        connection.execute(
            text("CREATE UNIQUE INDEX ix_payments_payment_ref ON payments (payment_ref)")
        )

    return changed


def ensure_prompt4_schema():
    """Catches up databases created before Prompt 4's additions. None of these
    were ever added to this migration file at the time, which is why a dev
    database that predates Prompt 4 is currently missing `staff`,
    `expense_categories`, `petty_cash_entries`, `sales`, and several columns
    on `expenses`/`jobs`/`proposals` entirely — this is what was throwing
    'no such table: staff', 'no such column: expenses.category_id', and
    'no such column: proposals.prepared_by'.

    `proposals.prepared_by` was missed in this function's first pass — it's
    a Prompt 4 item 6 column (added to the ORM model alongside
    `expenses.category_id` etc.) but wasn't included in the original
    ALTER TABLE checks below, so it was still throwing after that first
    migration ran clean. Added here now, same idempotent pattern as the rest.

    `db.create_all()` (called from wherever the app initializes tables) will
    create any table that doesn't exist at all yet (staff, expense_categories,
    sales, petty_cash_entries) since those are brand-new tables, not altered
    existing ones — CREATE TABLE IF NOT EXISTS-equivalent behavior. What
    create_all() will NOT do is add a new column to an existing table
    (expenses, jobs, proposals), which is the SQLite ALTER TABLE gap this
    function covers. Both are called together in run_full_upgrade() below so
    a single call fixes the whole gap regardless of which kind it is.
    """
    changed = []
    expense_columns = _columns("expenses")
    job_columns = _columns("jobs")
    proposal_columns = _columns("proposals")

    # Predates Prompt 4 (added during the earlier Payables-consolidation
    # session per dev-log.md) but was never covered by this migration file
    # at any point until now — found via a systematic cross-check against
    # documented column additions, not a live traceback. Included so a
    # sufficiently old database doesn't hit this as a fourth surprise.
    if "vendor_id" not in expense_columns:
        _add_column("expenses", "vendor_id INTEGER REFERENCES vendors(id)")
        changed.append("expenses.vendor_id")

    if "category_id" not in expense_columns:
        _add_column("expenses", "category_id INTEGER REFERENCES expense_categories(id)")
        changed.append("expenses.category_id")

    if "paid_on" not in expense_columns:
        _add_column("expenses", "paid_on DATE")
        changed.append("expenses.paid_on")

    if "completed_count" not in job_columns:
        _add_column("jobs", "completed_count INTEGER NOT NULL DEFAULT 0")
        changed.append("jobs.completed_count")

    if "total_count" not in job_columns:
        _add_column("jobs", "total_count INTEGER NOT NULL DEFAULT 0")
        changed.append("jobs.total_count")

    if "prepared_by" not in proposal_columns:
        _add_column("proposals", "prepared_by VARCHAR(160)")
        changed.append("proposals.prepared_by")

    db.session.commit()
    return changed


def ensure_staff_assignment_schema():
    """This session's addition: Job.assigned_staff_id (Prompt 7, item 7).
    Separated from ensure_prompt4_schema() since it postdates that prompt —
    keeping migrations attributable to the change that introduced them,
    rather than folding everything into one undifferentiated bucket.
    """
    changed = []
    job_columns = _columns("jobs")

    if "assigned_staff_id" not in job_columns:
        _add_column("jobs", "assigned_staff_id INTEGER REFERENCES staff(id)")
        changed.append("jobs.assigned_staff_id")

    db.session.commit()
    return changed


def ensure_proposal_job_planning_schema():
    """Proposal fields that are internal while drafting, then copied to Job."""
    changed = []
    proposal_columns = _columns("proposals")

    if "priority" not in proposal_columns:
        _add_column("proposals", "priority VARCHAR(30) DEFAULT 'medium'")
        changed.append("proposals.priority")

    if "assigned_staff_id" not in proposal_columns:
        _add_column("proposals", "assigned_staff_id INTEGER REFERENCES staff(id)")
        changed.append("proposals.assigned_staff_id")

    db.session.commit()
    return changed


def ensure_proposal_line_item_quantity_schema():
    """Keep proposal lines itemized instead of collapsing quantity into amount."""
    changed = []
    columns = _columns("proposal_line_items")

    if "quantity" not in columns:
        _add_column("proposal_line_items", "quantity NUMERIC(12, 2) NOT NULL DEFAULT 1")
        changed.append("proposal_line_items.quantity")

    if "unit" not in columns:
        _add_column("proposal_line_items", "unit VARCHAR(40) DEFAULT 'item'")
        changed.append("proposal_line_items.unit")

    if "unit_price" not in columns:
        _add_column("proposal_line_items", "unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0")
        changed.append("proposal_line_items.unit_price")
        db.session.execute(text("UPDATE proposal_line_items SET unit_price = amount WHERE unit_price = 0"))

    db.session.commit()
    return changed


def ensure_core_staff_seed():
    """Ensure the core staff names exist on databases that predate staff seed data."""
    names = ["Vivienne", "Victor", "Adam", "Chisomo", "Galfken"]
    existing = {
        staff.name.lower()
        for staff in Staff.query.filter(Staff.name.in_(names)).all()
    }
    created = []
    for name in names:
        if name.lower() not in existing:
            db.session.add(Staff(name=name, role="Production", active=True))
            created.append(name)
    db.session.commit()
    return created


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


def run_full_upgrade():
    """Single entry point covering every migration added so far, in order.
    Call this once (e.g. from a `flask shell` one-liner or a small script)
    against the live dev database to fix the 'no such table: staff' /
    'no such column: expenses.category_id' / 'no such column:
    jobs.completed_count' errors.

    Ordering matters here and was previously wrong: db.create_all() handles
    wholly-new tables, but ensure_prompt4_schema() and
    ensure_staff_assignment_schema() (which ALTER TABLE to add missing
    columns) must run BEFORE anything does an ORM query against the full
    Job/Expense model — e.g. upgrade_job_invoice_flow() ->
    normalize_legacy_job_statuses() -> Job.query.all(), which SELECTs every
    column the ORM model declares, including completed_count/total_count/
    assigned_staff_id. Running that query while those columns are still
    missing from the actual table throws 'no such column' even though
    db.create_all() succeeded, because create_all() only creates tables that
    don't exist yet — it never ALTERs an existing table to add a column.
    """
    db.create_all()
    prompt4 = ensure_prompt4_schema()
    staff_assignment = ensure_staff_assignment_schema()
    proposal_job_planning = ensure_proposal_job_planning_schema()
    proposal_line_item_quantity = ensure_proposal_line_item_quantity_schema()
    core_staff = ensure_core_staff_seed()
    job_invoice_schema = ensure_job_invoice_schema()
    payment_invoice_nullable = ensure_payment_invoice_nullable_schema()
    normalized = normalize_legacy_job_statuses()
    backfilled = backfill_invoice_jobs()
    return {
        "prompt4_schema_changes": prompt4,
        "staff_assignment_schema_changes": staff_assignment,
        "proposal_job_planning_schema_changes": proposal_job_planning,
        "proposal_line_item_quantity_schema_changes": proposal_line_item_quantity,
        "core_staff_seeded": core_staff,
        "payment_invoice_nullable_schema_changes": payment_invoice_nullable,
        "job_invoice_flow": {
            "schema_changes": job_invoice_schema,
            "statuses_normalized": normalized,
            "invoice_jobs_backfilled": backfilled,
        },
    }
