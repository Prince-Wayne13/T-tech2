"""
merge_apply.py

Third slice of the restore engine: the first piece that actually WRITES
to the live database. Scoped to the tables proven safe in
merge_preview.py's docstring and this module's own FK dependency mapping
-- see SAFE_TO_WRITE_TABLES below. Every other device_id table is
reported as "not merged" rather than silently skipped or guessed at.

vendors, materials, and staff are now included:
  - vendors: matched by name (NAME_KEYED_TABLES in merge_preview.py).
    Vendor is deliberately loose/editable -- not a rigid identity -- so
    name-matching is the right fit, no FK translation needed on this side.
  - staff: matched by (device_id, id) via merge_preview.py's
    WEAK_KEY_TABLES -- no stable business key exists, so this is applied
    with the same caveat already documented there.
  - materials: matched by material_ref (a real, per-device-stamped unique
    key -- same tier as machine_ref). This is the first table here with
    actual cross-device foreign keys that need translation rather than
    verbatim copy: Material.machine_id and Material.vendor_id are raw
    local integers on B, meaningless on this device. FK_TRANSLATIONS
    below resolves each one through the referenced table's natural key
    (machine_ref for machines, name for vendors) to find/skip correctly
    instead of silently pointing at whatever row happens to share that
    raw id locally -- that would be real data corruption, not a cosmetic
    gap. If a referenced row can't be found locally at all (shouldn't
    normally happen since machines/vendors sync too, but not assumed),
    it's reported as a per-row error rather than guessed at or dropped.

    This is also why table application order matters now: machines and
    vendors must be written before materials in the same run, so a
    material's FK lookup can see rows added earlier in this same merge.
    APPLY_ORDER (not SAFE_TO_WRITE_TABLES's dict order, which SQLAlchemy
    doesn't guarantee) makes that explicit, and each write is flushed
    immediately so later lookups in the same run can see it.

  material_transactions is deliberately still excluded -- it depends on
  the still-blocked `jobs` table via its own job_id FK.

`sales` was initially miscategorized as safe (only FKs to jobs) before
catching that Sale.job_id is NOT NULL, so it transitively depends on
`jobs`, which IS blocked -- corrected before this module was written, not
after.

Design:
  - Uses merge_preview.preview_merge()'s OWN dry-run output as the single
    source of truth for what to do -- this module does not recompute
    row-matching logic itself, so the "what would happen" report you see
    beforehand is exactly what gets applied, not a second implementation
    that could silently disagree with it.
  - Runs entirely inside one SQLAlchemy transaction (single commit at the
    end, rollback on any error) -- a failure partway through must not
    leave a half-merged database.
  - add_from_b: copies the row's scalar columns from B's backup into a
    brand-new row on this device (own id, own device_id preserved as
    whatever B originally recorded -- NOT reassigned to this device,
    since the record legitimately originated elsewhere). Any column in
    that table's fk_translations is resolved to this device's local id
    first (see FK_TRANSLATIONS below) instead of being copied verbatim.
  - b_wins_update: overwrites this device's matching row's scalar columns
    with B's values (again preserving B's own device_id/timestamps as the
    authoritative record of who last touched it and when). FK columns are
    translated the same way as add_from_b.
  - a_wins_keep / identical: no write, by definition.
  - Many-to-many relationships (ProductionMachine.capabilities) are NOT
    touched by this pass -- both sides of that join reference raw local
    ids on two safe-but-independently-numbered tables, and reconciling
    that correctly needs its own pass, not a guess bundled into this one.
"""

from __future__ import annotations

import sqlite3
import tempfile
import zipfile
from dataclasses import dataclass, field
from datetime import datetime

from .extensions import db
from .models import (
    Advance, Capability, ExpenseCategory, ExportJob, Material,
    ProductionMachine, Staff, Vendor,
)
from .merge_preview import preview_merge

# Table name -> (ORM model, natural key column, columns to copy verbatim).
# Only scalar, non-FK-to-an-unmapped-table columns are copied. device_id,
# created_at, updated_at are always carried over from the source row (see
# module docstring) rather than reset to "now"/"this device", since the
# whole point is preserving true origin and edit history across the merge.
#
# "fk_translations" (optional): {column_name: (referenced_table, referenced
# natural-key column)}. Present only for tables whose FK columns need
# resolving through another table's natural key rather than copied as a
# raw local id -- see _translate_fk() and the module docstring.
SAFE_TO_WRITE_TABLES = {
    "production_machines": {
        "model": ProductionMachine,
        "key_column": "machine_ref",
        "columns": [
            "machine_ref", "name", "category", "capability", "status",
            "available", "unavailable_reason", "image_path", "notes",
            "device_id", "created_at", "updated_at",
        ],
    },
    "capabilities": {
        "model": Capability,
        "key_column": "name",
        "columns": ["name", "category", "notes", "device_id", "created_at", "updated_at"],
    },
    "vendors": {
        "model": Vendor,
        "key_column": "name",
        "columns": [
            "name", "category", "phone", "email", "balance", "status",
            "device_id", "created_at", "updated_at",
        ],
    },
    "staff": {
        "model": Staff,
        # Weak key -- see merge_preview.py's WEAK_KEY_TABLES docstring.
        # preview_merge already reports staff changes keyed as
        # "device_id::id" strings; apply just needs to look B's row up by
        # its own (device_id, id), which _fetch_b_row handles specially.
        "key_column": "__device_and_id__",
        "columns": ["name", "role", "active", "notes", "device_id", "created_at", "updated_at"],
    },
    "expense_categories": {
        "model": ExpenseCategory,
        "key_column": "name",
        "columns": ["name", "vendor_related", "notes", "device_id", "created_at", "updated_at"],
    },
    "advances": {
        "model": Advance,
        "key_column": "advance_ref",
        "columns": [
            "advance_ref", "recipient", "amount", "status", "issued_on",
            "settled_on", "notes", "device_id", "created_at", "updated_at",
        ],
    },
    "export_jobs": {
        "model": ExportJob,
        "key_column": "export_ref",
        "columns": [
            "export_ref", "name", "format", "records", "file_path",
            "status", "generated_by", "notes", "device_id", "created_at", "updated_at",
        ],
    },
    "materials": {
        "model": Material,
        "key_column": "material_ref",
        "columns": [
            "material_ref", "name", "machine_id", "category", "vendor_id",
            "unit", "unit_cost", "reorder_point", "active", "notes",
            "device_id", "created_at", "updated_at",
        ],
        "fk_translations": {
            "machine_id": ("production_machines", "machine_ref"),
            "vendor_id": ("vendors", "name"),
        },
    },
}

# Tables that reference each other must be applied in this order, so that
# a row added earlier in the same run (e.g. a new machine or vendor from
# B) is already committed-and-flushed by the time a later table (e.g.
# materials) needs to resolve an FK against it. Any SAFE_TO_WRITE_TABLES
# key not listed here has no incoming FK dependency and can run after.
APPLY_ORDER = [
    "production_machines", "capabilities", "vendors", "staff",
    "expense_categories", "advances", "export_jobs", "materials",
]

NOT_YET_SAFE_TABLES = [
    "jobs", "invoices", "proposals", "expenses",
    "invoice_line_items", "proposal_line_items", "material_transactions",
    "petty_cash_entries", "sales", "clients", "pricing_items",
]


@dataclass
class TableApplyResult:
    table: str
    applied: bool
    added: int = 0
    updated: int = 0
    skipped_reason: str | None = None
    errors: list = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "table": self.table,
            "applied": self.applied,
            "added": self.added,
            "updated": self.updated,
            "skipped_reason": self.skipped_reason,
            "errors": self.errors,
        }


def _extract_db(zip_path: str, tmpdir: str, expected_db_name: str = "app.db") -> str:
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(tmpdir)
    return f"{tmpdir}/{expected_db_name}"


# SQLite has no native DATETIME/BOOLEAN type -- raw sqlite3 reads them back
# as plain strings/ints, but the ORM's DateTime/Boolean columns require
# real Python datetime/bool objects on assignment or SQLAlchemy raises
# (this was caught for real during this session's own test run, not
# hypothetical -- every add_from_b/b_wins_update on a DateTime column
# failed until this coercion was added). DATE_COLUMNS covers every
# DateTime/Date column across SAFE_TO_WRITE_TABLES specifically; BOOL_COLUMNS
# likewise for every Boolean column in that same table set.
DATE_COLUMNS = {"created_at", "updated_at", "issued_on", "settled_on"}
BOOL_COLUMNS = {"available", "vendor_related", "active"}

_DATETIME_FORMATS = ("%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d")


def _coerce_value(column: str, value):
    if value is None:
        return None
    if column in DATE_COLUMNS and isinstance(value, str):
        for fmt in _DATETIME_FORMATS:
            try:
                parsed = datetime.strptime(value, fmt)
                return parsed.date() if fmt == "%Y-%m-%d" else parsed
            except ValueError:
                continue
        raise ValueError(f"Could not parse datetime value {value!r} for column {column!r}")
    if column in BOOL_COLUMNS and isinstance(value, int):
        return bool(value)
    return value


def _coerce_row(columns: list, row) -> dict:
    return {col: _coerce_value(col, row[col]) for col in columns if col in row.keys()}


def _fetch_b_row(conn_b, table: str, key_column: str, key_value):
    """Looks up B's row for a change entry. Ref/name-keyed tables use a
    normal WHERE match. Weak-key tables (staff) are keyed in the preview
    report as "device_id::id" strings -- split that back apart to find
    the actual row, since there's no single real column to match on."""
    if key_column == "__device_and_id__":
        device_part, _, id_part = str(key_value).partition("::")
        row = conn_b.execute(
            "SELECT * FROM " + table + " WHERE id = ?", (id_part,)
        ).fetchone()
        if row is not None and device_part != "unknown":
            # Extra sanity check -- id alone should already be unique per
            # sqlite file, this just confirms the key wasn't misparsed.
            if (row["device_id"] or "unknown") != device_part:
                return None
        return row
    return conn_b.execute(
        f"SELECT * FROM {table} WHERE {key_column} = ?", (key_value,)
    ).fetchone()


def _translate_fk(column: str, raw_value, referenced_table: str, referenced_key: str, errors: list):
    """Resolves a raw local id from B's backup (meaningless on this
    device) into the matching local id on THIS device, via the
    referenced table's natural key (e.g. machine_ref, vendor name).

    Looked up straight against the live ORM/session (not conn_b), since
    by the time materials are processed (APPLY_ORDER runs machines/
    vendors first and flushes after each write) any row referenced by a
    same-run add_from_b is already visible here.

    Returns (resolved_local_id, ok). On failure, ok=False and a message
    is appended to errors -- callers must skip the row rather than guess.
    """
    if raw_value is None:
        return None, True

    # Find B's natural-key value for this raw id by asking B's own table
    # -- but we don't have conn_b here, so this expects the caller to
    # have already resolved raw_value into the natural-key VALUE (a ref
    # string or a name), not a raw id. See call sites below.
    natural_key_value = raw_value
    model = {"production_machines": ProductionMachine, "vendors": Vendor}[referenced_table]
    match = model.query.filter_by(**{referenced_key: natural_key_value}).first()
    if match is None:
        errors.append(
            f"{column}: referenced {referenced_table}.{referenced_key}="
            f"{natural_key_value!r} not found on this device -- row skipped "
            "rather than guessed at."
        )
        return None, False
    return match.id, True


def _snapshot_live_db_as_zip(tmpdir: str, expected_db_name: str = "app.db") -> str:
    """Builds a zip of the LIVE database's current state, in the same
    shape preview_merge() expects (a zip containing app.db). Used as the
    "A" side of a merge instead of trusting a caller-supplied backup zip,
    which can be stale -- e.g. from before an earlier merge already wrote
    rows to the live DB. Using a stale A meant a second merge run would
    re-report already-merged rows as add_from_b and crash on the resulting
    UNIQUE constraint violation (caught for real during this session's own
    idempotency check, not hypothetical).

    Reuses backup_scheduler.safe_sqlite_snapshot for the actual file-level
    copy (same tested locking/consistency handling backups already use),
    rather than re-implementing sqlite snapshotting here.
    """
    from flask import current_app
    from .backup_scheduler import safe_sqlite_snapshot

    live_db_path = current_app.config["SQLALCHEMY_DATABASE_URI"].replace("sqlite:///", "")
    snapshot_db_path = f"{tmpdir}/{expected_db_name}"
    safe_sqlite_snapshot(live_db_path, snapshot_db_path)

    zip_path = f"{tmpdir}/live_snapshot.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.write(snapshot_db_path, arcname=expected_db_name)
    return zip_path


def apply_merge(zip_path_a: str | None, zip_path_b: str, dry_run_only: bool = True) -> dict:
    """Runs preview_merge() first (always), then, for tables in
    SAFE_TO_WRITE_TABLES only, actually applies add_from_b / b_wins_update
    against the LIVE app database -- inside one transaction, committed
    only if every safe-table write succeeds.

    zip_path_a is accepted for compatibility with preview_merge()'s
    signature but is NOT used to determine "this device's current state"
    -- a fresh snapshot of the live database is taken instead, so the
    comparison is always against what's actually in the database right
    now, not whatever was last backed up. Pass None explicitly to make
    that clear at call sites; a provided value is ignored with a note in
    the returned dict rather than silently doing something different from
    what the caller likely expected.

    dry_run_only=True (the default) computes and returns exactly what
    WOULD be written without calling db.session.commit() -- everything
    is rolled back at the end regardless of success. Callers must pass
    dry_run_only=False explicitly to actually persist changes; this is
    deliberately not the default so a route/script can't apply real
    writes by omission.

    Tables outside SAFE_TO_WRITE_TABLES are always reported with
    applied=False and a skipped_reason, never silently ignored.
    """
    with tempfile.TemporaryDirectory() as tmp_live:
        live_zip_path = _snapshot_live_db_as_zip(tmp_live)
        ignored_zip_path_a_note = (
            f"zip_path_a ({zip_path_a!r}) was ignored -- apply_merge always "
            "compares against a fresh snapshot of the live database, not a "
            "caller-supplied backup, to avoid re-applying already-merged rows."
        ) if zip_path_a else None

        preview = preview_merge(live_zip_path, zip_path_b)
        preview_by_table = {t["table"]: t for t in preview["tables"]}

        results: list[TableApplyResult] = []

        with tempfile.TemporaryDirectory() as tmp_b:
            db_b_path = _extract_db(zip_path_b, tmp_b)
            conn_b = sqlite3.connect(db_b_path)
            conn_b.row_factory = sqlite3.Row

            try:
                for table in NOT_YET_SAFE_TABLES:
                    if table in preview_by_table:
                        results.append(TableApplyResult(
                            table=table,
                            applied=False,
                            skipped_reason=(
                                "Foreign key dependency on clients/jobs/"
                                "pricing_items not yet safe to write -- see "
                                "merge_apply.py's module docstring."
                            ),
                        ))

                for table in APPLY_ORDER:
                    spec = SAFE_TO_WRITE_TABLES[table]
                    if table not in preview_by_table:
                        continue

                    model = spec["model"]
                    key_column = spec["key_column"]
                    columns = spec["columns"]
                    fk_translations = spec.get("fk_translations", {})
                    table_changes = preview_by_table[table]["changes"]

                    result = TableApplyResult(table=table, applied=True)

                    for change in table_changes:
                        action = change["action"]
                        if action in ("identical", "a_wins_keep"):
                            continue

                        key_value = change["key"]
                        b_row = _fetch_b_row(conn_b, table, key_column, key_value)
                        if b_row is None:
                            result.errors.append(
                                f"{key_column}={key_value}: expected in B's backup but not found "
                                "(backup may have changed between preview and apply)."
                            )
                            continue

                        row_data = _coerce_row(columns, b_row)

                        # Resolve any FK columns through their referenced
                        # table's natural key before this row is written.
                        # B's raw id (row_data[col]) is first turned into
                        # B's own natural-key VALUE via conn_b, then that
                        # value is looked up on THIS device's live tables.
                        row_errors = []
                        for col, (ref_table, ref_key) in fk_translations.items():
                            raw_b_id = row_data.get(col)
                            if raw_b_id is None:
                                continue
                            b_ref_row = conn_b.execute(
                                f"SELECT {ref_key} FROM {ref_table} WHERE id = ?", (raw_b_id,)
                            ).fetchone()
                            if b_ref_row is None:
                                row_errors.append(
                                    f"{col}: B's own {ref_table} row (id={raw_b_id}) not found in "
                                    "B's backup -- can't translate, row skipped."
                                )
                                continue
                            resolved_id, ok = _translate_fk(
                                col, b_ref_row[ref_key], ref_table, ref_key, row_errors
                            )
                            row_data[col] = resolved_id if ok else raw_b_id
                            if not ok:
                                row_errors[-1] = (
                                    f"{key_column}={key_value}: " + row_errors[-1]
                                )

                        if row_errors:
                            result.errors.extend(row_errors)
                            continue

                        if action == "add_from_b":
                            new_row = model(**row_data)
                            db.session.add(new_row)
                            db.session.flush()
                            result.added += 1

                        elif action == "b_wins_update":
                            if key_column == "__device_and_id__":
                                device_part, _, id_part = str(key_value).partition("::")
                                existing = model.query.get(int(id_part))
                            else:
                                existing = model.query.filter_by(**{key_column: key_value}).first()
                            if existing is None:
                                result.errors.append(
                                    f"{key_column}={key_value}: expected an existing row on this "
                                    "device for b_wins_update but none was found."
                                )
                                continue
                            for col, value in row_data.items():
                                if col == key_column:
                                    continue
                                setattr(existing, col, value)
                            db.session.flush()
                            result.updated += 1

                    results.append(result)

                has_errors = any(r.errors for r in results)

                if dry_run_only or has_errors:
                    db.session.rollback()
                else:
                    db.session.commit()

                return {
                    "ok": not has_errors,
                    "applied": (not dry_run_only) and (not has_errors),
                    "dry_run_only": dry_run_only,
                    "ignored_zip_path_a_note": ignored_zip_path_a_note,
                    "tables": [r.to_dict() for r in results],
                }
            finally:
                conn_b.close()