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


def ensure_machine_capability_schema():
    """Priority 2 (Machine Management): capabilities table, the
    machine_capabilities join table, ProductionMachine.available/
    unavailable_reason, and Job.required_capability_id.

    db.create_all() already creates the wholly-new tables (capabilities,
    machine_capabilities) on a fresh database, same as it does for
    staff/expense_categories/etc in ensure_prompt4_schema()'s docstring -
    what it can't do is ALTER an existing production_machines/jobs table to
    add the new columns, which is what this function covers, following the
    same idempotent column-check pattern as the rest of this file.
    """
    changed = []
    machine_columns = _columns("production_machines")
    job_columns = _columns("jobs")

    if "available" not in machine_columns:
        _add_column("production_machines", "available BOOLEAN NOT NULL DEFAULT 1")
        changed.append("production_machines.available")

    if "unavailable_reason" not in machine_columns:
        _add_column("production_machines", "unavailable_reason VARCHAR(255)")
        changed.append("production_machines.unavailable_reason")

    if "required_capability_id" not in job_columns:
        _add_column("jobs", "required_capability_id INTEGER REFERENCES capabilities(id)")
        changed.append("jobs.required_capability_id")

    db.session.commit()
    return changed


def ensure_material_yield_schema():
    """This session's addition: MaterialTransaction.output_quantity and
    .output_description (yield tracking - "this much material produced this
    much output"), needed for the month-end materials reconciliation report.
    No new transaction_type value needs a schema change ("count" is just a
    new allowed string in an existing VARCHAR column, not a new column), so
    this migration only needs to add the two output_* columns.
    """
    changed = []
    material_transaction_columns = _columns("material_transactions")

    if "output_quantity" not in material_transaction_columns:
        _add_column("material_transactions", "output_quantity NUMERIC(14, 2)")
        changed.append("material_transactions.output_quantity")

    if "output_description" not in material_transaction_columns:
        _add_column("material_transactions", "output_description VARCHAR(120)")
        changed.append("material_transactions.output_description")

    db.session.commit()
    return changed


def ensure_default_capabilities_seed():
    """Seed the capability set from the workshop's actual machine lineup
    (Large Format = vinyl stickers/banners, DTF = apparel transfers, etc.),
    matching what's already in seed.py's DEFAULT_MACHINES/machines list, and
    attach each machine to its matching capability by category so existing
    databases don't end up with machines that have zero capabilities once
    this migration runs.
    """
    from .models import Capability, ProductionMachine

    defaults = [
        ("Colour Printing", "Digital Print"),
        ("Duplex Printing", "Digital Print"),
        ("A3 Printing", "Digital Print"),
        ("Document Printing", "Digital Print"),
        ("Book Printing", "Digital Print"),
        ("Magazine Printing", "Digital Print"),
        ("Calendar Printing", "Digital Print"),
        ("Stapling", "Finishing"),
        ("Book Binding", "Finishing"),
        ("Cutting & Trimming", "Finishing"),
        ("Vinyl Stickers", "Large Format"),
        ("Banner Printing", "Large Format"),
        ("Photo Printing", "Sublimation"),
        ("Glossy Printing", "Sublimation"),
        ("Mug Cup Sublimation", "Sublimation"),
        ("DTF Apparel Transfer", "DTF Apparel"),
        ("DTF Diary Branding", "DTF Apparel"),
        ("UV DTF Assorted Items", "UV DTF"),
        ("PVC Card Printing", "PVC Cards"),
        ("Cutting Stencils", "Cutting"),
    ]
    existing = {cap.name.lower(): cap for cap in Capability.query.all()}
    created = []
    for name, category in defaults:
        if name.lower() not in existing:
            capability = Capability(name=name, category=category)
            db.session.add(capability)
            existing[name.lower()] = capability
            created.append(name)
    db.session.flush()

    # Attach machines to capabilities by category, best-effort - a machine
    # whose category has no matching default capability above is simply
    # left alone rather than guessed at.
    category_to_capabilities = {}
    for capability in existing.values():
        category_to_capabilities.setdefault(capability.category, []).append(capability)

    attached = 0
    for machine in ProductionMachine.query.all():
        if machine.capabilities:
            continue
        candidates = category_to_capabilities.get(machine.category, [])
        if candidates:
            machine.capabilities = candidates
            attached += 1

    db.session.commit()
    return {"capabilities_created": created, "machines_attached": attached}


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
    # Priority 2 (Machine Management): must run after db.create_all() (so the
    # capabilities/machine_capabilities tables exist) and before any ORM
    # query touches Job.required_capability_id or ProductionMachine.available,
    # same ordering requirement documented above for prompt4/staff_assignment.
    machine_capability_schema = ensure_machine_capability_schema()
    default_capabilities = ensure_default_capabilities_seed()
    # Must run before anything does an ORM query against MaterialTransaction
    # (e.g. services/materials.py's stock/summary functions, or the new
    # build_materials_reconciliation() report), same ordering reason as
    # every other ALTER TABLE migration in this function.
    material_yield_schema = ensure_material_yield_schema()
    normalized = normalize_legacy_job_statuses()
    backfilled = backfill_invoice_jobs()
    return {
        "prompt4_schema_changes": prompt4,
        "staff_assignment_schema_changes": staff_assignment,
        "proposal_job_planning_schema_changes": proposal_job_planning,
        "proposal_line_item_quantity_schema_changes": proposal_line_item_quantity,
        "core_staff_seeded": core_staff,
        "payment_invoice_nullable_schema_changes": payment_invoice_nullable,
        "machine_capability_schema_changes": machine_capability_schema,
        "default_capabilities_seed": default_capabilities,
        "material_yield_schema_changes": material_yield_schema,
        "job_invoice_flow": {
            "schema_changes": job_invoice_schema,
            "statuses_normalized": normalized,
            "invoice_jobs_backfilled": backfilled,
        },
    }