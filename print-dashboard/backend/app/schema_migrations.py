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
        ("Stapling", "Finishing"),
        ("Book Binding", "Finishing"),
        ("Cutting & Trimming", "Finishing"),
        ("Vinyl Stickers", "Large Format"),
        ("Banner Printing", "Large Format"),
        ("Contra Vision", "Large Format"),
        ("Window Frosting", "Large Format"),
        ("Photo Printing", "Sublimation"),
        ("Glossy Printing", "Sublimation"),
        ("Mug & Plate Sublimation", "Sublimation"),
        ("DTF Apparel Transfer", "DTF Apparel"),
        ("Cap Branding", "DTF Apparel"),
        ("UV DTF Hard Surface", "UV DTF"),
        ("Fabric Embroidery", "Embroidery"),
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
    from .services.ref_generator import next_staff_ref

    names = ["Vivienne", "Victor", "Adam", "Chisomo", "Galfken"]
    existing = {
        staff.name.lower()
        for staff in Staff.query.filter(Staff.name.in_(names)).all()
    }
    created = []
    for name in names:
        if name.lower() not in existing:
            # staff_ref assigned here too, not just left for the backfill
            # migration below -- these ARE newly created rows, so they
            # need a real ref immediately, same as next_job_ref() is used
            # in backfill_invoice_jobs() elsewhere in this file.
            db.session.add(Staff(name=name, role="Production", active=True, staff_ref=next_staff_ref()))
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


def backfill_missing_sales():
    """One-time catch-up for jobs that already had payments recorded
    before add_job_payment() started auto-creating the linked Sale (see
    services/jobs.py). Without this, any job paid before that fix would
    stay permanently absent from the Sales page even after upgrading,
    since nothing else ever revisits old payments.
    """
    from .services.sales import create_sale_for_job

    created = 0
    jobs_with_payments = (
        Job.query.filter(Job.payments.any()).order_by(Job.id.asc()).all()
    )
    for job in jobs_with_payments:
        if job.sales:
            continue
        sale = create_sale_for_job(job, description=job.title)
        job.sales.append(sale)
        created += 1
    db.session.commit()
    return created


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


def ensure_material_transaction_output_schema():
    """Adds MaterialTransaction.output_quantity/output_description.

    The frontend (Materials.jsx's handleLogTransaction) has sent these two
    fields on every 'usage' transaction all along, and create_material_
    transaction() in routes/materials.py silently ignored them since the
    columns never existed -- output was never actually recorded, even
    though the UI collected it. This backfills the columns on an existing
    database; db.create_all() alone only creates brand-new tables, it
    doesn't ALTER an existing material_transactions table to add these.
    """
    changed = []
    columns = _columns("material_transactions")

    if "output_quantity" not in columns:
        _add_column("material_transactions", "output_quantity NUMERIC(14, 3)")
        changed.append("material_transactions.output_quantity")

    if "output_description" not in columns:
        _add_column("material_transactions", "output_description VARCHAR(120)")
        changed.append("material_transactions.output_description")

    db.session.commit()
    return changed


def ensure_staff_client_pricing_refs():
    """Adds staff_ref/client_ref/pricing_item_ref -- see each column's
    comment in models.py for why these exist (cross-device merge matching
    for three tables that previously had no unique column at all besides
    the local, per-device `id`). vendors is deliberately NOT included
    here -- merge_preview.py already matches it by `name` (a real,
    working design decision made separately), so no vendor_ref exists or
    is needed.

    Unlike ensure_device_ownership_schema()'s device_id (deliberately left
    NULL for old rows -- an honest "unknown" beats a fabricated device),
    these ref columns MUST be backfilled with a real value for every
    existing row, not left NULL: a NULL merge key can't be matched on,
    which would make every existing pre-migration row on every device
    permanently unmergeable.

    IMPORTANT -- found by actually running this migration against
    simulated existing data, not caught by reading the code: backfilling
    by calling next_staff_ref() etc. (the same function new rows use
    going forward) is WRONG here, not just a timing issue.
    _next_sequential_ref() counts "how many rows this device already
    has", which stays exactly the same before and after a backfill --
    backfill doesn't add rows, it fills in a column on rows that already
    existed from the start of the loop. Every row in a batch got the
    identical count and therefore the identical ref (e.g. 3 real staff
    rows all became 'STAFF-LOCAL-0004' in testing), which is exactly the
    collision this column exists to prevent. Fixed by using a plain
    enumerate() counter local to this backfill pass instead -- a
    dedicated "Nth row backfilled in this run" number, continuing after
    however many rows already have a real ref, completely separate from
    next_*_ref()'s "rows this device has ever created" logic.

    Must run AFTER ensure_device_ownership_schema() in run_full_upgrade():
    this filters by device_id, which must already exist as a column
    before that query can run (same "no such column" failure mode this
    whole migration-order investigation started from). Must also run
    BEFORE ensure_core_staff_seed(), since that function's Staff.query
    will now SELECT staff_ref too, same failure mode again if it ran
    first.
    """
    changed = []

    from .models import Client, PricingItem
    from .services.ref_generator import _device_fragment

    ref_specs = [
        ("staff", "staff_ref", Staff, "STAFF"),
        ("clients", "client_ref", Client, "CLI"),
        ("pricing_items", "pricing_item_ref", PricingItem, "PRC"),
    ]

    existing_tables = _tables()
    device_fragment = _device_fragment()

    for table_name, column_name, model, prefix in ref_specs:
        if table_name not in existing_tables:
            continue

        columns = _columns(table_name)
        if column_name not in columns:
            _add_column(table_name, f"{column_name} VARCHAR(40)")
            db.session.commit()
            changed.append(f"{table_name}.{column_name}")

        rows_needing_ref = model.query.filter(
            getattr(model, column_name).is_(None)
        ).order_by(model.id).all()

        if rows_needing_ref:
            already_have_ref = model.query.filter(
                getattr(model, column_name).isnot(None)
            ).count()

            for offset, row in enumerate(rows_needing_ref, start=1):
                setattr(row, column_name, f"{prefix}-{device_fragment}-{(already_have_ref + offset):04d}")

            db.session.commit()
            changed.append(f"{table_name}.{column_name}_backfilled:{len(rows_needing_ref)}")

    return changed


def ensure_device_ownership_schema():
    """Adds device_id to every table whose model inherits TimestampMixin
    (see models.py -- device_id lives on the mixin itself, not repeated
    per-class), for cross-device backup/restore merge logic.

    Table list below was generated from db.metadata.tables directly
    (every table with a device_id column in the ORM), not hand-typed --
    see the migration's own dev notes for how to regenerate it if a new
    TimestampMixin table is ever added and this list needs updating:

        for name, table in db.metadata.tables.items():
            if 'device_id' in table.columns: print(name)

    Existing rows get device_id=NULL (not backfilled with a guess --
    see models.py's TimestampMixin comment for why an honest "unknown"
    beats a fabricated device for old data). New/edited rows going
    forward are stamped automatically by
    services/device_context.py's before_flush listener.
    """
    changed = []
    tables_needing_device_id = [
        "clients", "vendors", "capabilities", "production_machines",
        "pricing_items", "materials", "material_transactions", "jobs",
        "invoices", "invoice_line_items", "payments", "proposals",
        "proposal_line_items", "expense_categories", "expenses",
        "advances", "export_jobs", "staff", "sales", "petty_cash_entries",
    ]
    existing_tables = _tables()

    for table_name in tables_needing_device_id:
        if table_name not in existing_tables:
            # Table itself doesn't exist yet on this database (very old
            # dev DB predating that feature, or a fresh DB about to be
            # created by db.create_all() -- either way, nothing to ALTER
            # here; db.create_all() will include device_id from the ORM
            # model directly when it creates the table for the first time.
            continue
        columns = _columns(table_name)
        if "device_id" not in columns:
            _add_column(table_name, "device_id VARCHAR(40)")
            changed.append(f"{table_name}.device_id")

    db.session.commit()
    return changed


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
    # Must run immediately after db.create_all(), before every other
    # ensure_*_schema()/ensure_*_seed() call below: nearly all of them do an
    # ORM query (Capability.query.all(), Staff.query.filter(...), Job.query.all(),
    # Invoice.query.filter(...), ProductionMachine.query.all(), etc.) against a
    # model that inherits TimestampMixin, and any such query SELECTs every
    # column the model declares -- including device_id -- whether or not the
    # code touches device_id directly. On a pre-existing database that
    # predates this column, running any of those queries before this line
    # raises 'sqlite3.OperationalError: no such column: <table>.device_id'
    # (seen for staff.device_id and capabilities.device_id so far; the same
    # applies to every table in tables_needing_device_id below, e.g. jobs,
    # invoices, production_machines). db.create_all() alone doesn't fix this
    # because it only creates brand-new tables -- it never ALTERs an existing
    # table to add a column.
    device_ownership = ensure_device_ownership_schema()
    # Must run after device_ownership (filters by device_id, which must
    # already exist) and before ensure_core_staff_seed() below: that
    # function's Staff.query will now SELECT staff_ref too, same
    # "no such column" failure mode as device_id if this ran after.
    staff_client_pricing_refs = ensure_staff_client_pricing_refs()
    prompt4 = ensure_prompt4_schema()
    staff_assignment = ensure_staff_assignment_schema()
    proposal_job_planning = ensure_proposal_job_planning_schema()
    proposal_line_item_quantity = ensure_proposal_line_item_quantity_schema()
    job_invoice_schema = ensure_job_invoice_schema()
    payment_invoice_nullable = ensure_payment_invoice_nullable_schema()
    # Priority 2 (Machine Management): must run after db.create_all() (so the
    # capabilities/machine_capabilities tables exist) and before any ORM
    # query touches Job.required_capability_id or ProductionMachine.available,
    # same ordering requirement documented above for prompt4/staff_assignment.
    machine_capability_schema = ensure_machine_capability_schema()
    default_capabilities = ensure_default_capabilities_seed()
    material_transaction_output = ensure_material_transaction_output_schema()
    core_staff = ensure_core_staff_seed()
    normalized = normalize_legacy_job_statuses()
    backfilled = backfill_invoice_jobs()
    # Must run after backfill_invoice_jobs() -- some jobs it backfills are
    # themselves paid (invoice.payments carried over), so those need to be
    # in place before checking for jobs with payments but no Sale yet.
    sales_backfilled = backfill_missing_sales()
    return {
        "prompt4_schema_changes": prompt4,
        "staff_assignment_schema_changes": staff_assignment,
        "proposal_job_planning_schema_changes": proposal_job_planning,
        "proposal_line_item_quantity_schema_changes": proposal_line_item_quantity,
        "core_staff_seeded": core_staff,
        "payment_invoice_nullable_schema_changes": payment_invoice_nullable,
        "machine_capability_schema_changes": machine_capability_schema,
        "default_capabilities_seed": default_capabilities,
        "material_transaction_output_schema_changes": material_transaction_output,
        "device_ownership_schema_changes": device_ownership,
        "staff_client_pricing_refs_changes": staff_client_pricing_refs,
        "job_invoice_flow": {
            "schema_changes": job_invoice_schema,
            "statuses_normalized": normalized,
            "invoice_jobs_backfilled": backfilled,
            "missing_sales_backfilled": sales_backfilled,
        },
    }