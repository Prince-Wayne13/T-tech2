"""
merge_preview.py

Second slice of the restore engine: a read-only DRY RUN that compares
two backups (e.g. this device's current data vs. another device's
backup) and reports what a merge WOULD do -- without writing to any
database. Nothing here restores, swaps files, or touches the live app.

Why a dry run first: raw `id` is a per-device autoincrement integer,
NOT a stable cross-device identity -- two offline devices independently
produce id=1, id=2, etc. for genuinely different records. See
ref_generator.py's own docstring for the same problem already solved
for reference numbers. This means "match by id" is actively wrong for
merge, and the real matching key differs by table:

  - Tables with a unique *_ref column (jobs, invoices, proposals,
    expenses, payments, materials, machines, advances, exports, sales,
    petty cash, staff, clients, pricing_items) -- the ref IS the stable
    cross-device identity, because ref_generator.py already embeds a
    per-device fragment in every new ref (e.g. "JOB-4F32-0005"), so two
    devices can never produce the same ref for two different records.

  - Capability, Vendor -- neither has a _ref column, but `name` is a
    real, deliberate identity for both (Capability.name is unique=True;
    Vendor is deliberately loose/editable rather than rigid, so matched
    by name on purpose, not as a fallback).

  - Staff previously had neither a ref nor a unique column and was
    matched by (device_id, id) -- see WEAK_KEY_TABLES below, now empty.
    staff_ref (see schema_migrations.ensure_staff_client_pricing_refs)
    replaced that weak match with a real one.

Only these tables are covered by this first dry-run pass -- NOT all 20
device_id tables yet. Scope kept honest rather than claiming full
coverage before every table has actually been reasoned through.

For each matched pair (same key on both sides) with differing
updated_at, "newest wins" per the earlier explicit decision -- this
module only REPORTS which side would win, it does not apply it.
"""

from __future__ import annotations

import sqlite3
import tempfile
import zipfile
from dataclasses import dataclass, field
from datetime import datetime

REF_KEYED_TABLES = {
    "jobs": "job_ref",
    "invoices": "invoice_ref",
    "proposals": "proposal_ref",
    "expenses": "expense_ref",
    "payments": "payment_ref",
    "materials": "material_ref",
    "production_machines": "machine_ref",
    "advances": "advance_ref",
    "export_jobs": "export_ref",
    "sales": "sale_ref",
    "petty_cash_entries": "entry_ref",
    # Added once staff_ref/client_ref/pricing_item_ref existed (see
    # schema_migrations.ensure_staff_client_pricing_refs) -- these
    # previously had no unique column at all. staff was matched via
    # WEAK_KEY_TABLES below (now empty); clients/pricing_items were
    # entirely unmergeable. vendors is deliberately NOT added here --
    # it already has a real, working name-based match in
    # NAME_KEYED_TABLES, so no vendor_ref exists or is needed.
    "staff": "staff_ref",
    "clients": "client_ref",
    "pricing_items": "pricing_item_ref",
}

NAME_KEYED_TABLES = {
    "capabilities": "name",
    # Vendor is deliberately loose/editable (we might buy the same material
    # from a different vendor later) -- not a rigid identity, so matched by
    # name like Capability rather than requiring a ref.
    "vendors": "name",
}

# Previously held "staff" -- now empty since staff_ref exists (see
# REF_KEYED_TABLES above). Kept as an explicit empty list, not deleted,
# so a future table found to lack any stable key has an obvious place
# to go and existing code referencing WEAK_KEY_TABLES doesn't need
# restructuring.
WEAK_KEY_TABLES = []


@dataclass
class RowChange:
    key: str
    action: str  # "add_from_b", "b_wins_update", "a_wins_keep", "identical"
    a_updated_at: str | None = None
    b_updated_at: str | None = None
    # True only when BOTH sides show a real edit since the record was
    # created (updated_at != created_at on both sides) -- distinguishes
    # "only B ever touched this row" (safe to auto-apply) from "both
    # sides independently edited it" (needs a human to review before
    # either side's version overwrites the other).
    needs_review: bool = False

    def to_dict(self) -> dict:
        return {
            "key": self.key,
            "action": self.action,
            "a_updated_at": self.a_updated_at,
            "b_updated_at": self.b_updated_at,
            "needs_review": self.needs_review,
        }


@dataclass
class TableMergePreview:
    table: str
    match_strategy: str
    weak_key_warning: bool = False
    changes: list = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "table": self.table,
            "match_strategy": self.match_strategy,
            "weak_key_warning": self.weak_key_warning,
            "changes": [c.to_dict() for c in self.changes],
            "summary": {
                "add_from_b": sum(1 for c in self.changes if c.action == "add_from_b"),
                "b_wins_update": sum(1 for c in self.changes if c.action == "b_wins_update"),
                "a_wins_keep": sum(1 for c in self.changes if c.action == "a_wins_keep"),
                "identical": sum(1 for c in self.changes if c.action == "identical"),
            },
        }


def _extract_db(zip_path: str, tmpdir: str, expected_db_name: str = "app.db") -> str:
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(tmpdir)
    return f"{tmpdir}/{expected_db_name}"


def _rows_by_key(conn: sqlite3.Connection, table: str, key_column: str) -> dict:
    """Returns {key_value: row_dict} for every row in table, keyed by
    key_column (a ref string or a name). Skips rows where the key is
    NULL -- can't match what has no identity."""
    conn.row_factory = sqlite3.Row
    rows = {}
    for row in conn.execute(f"SELECT * FROM {table}").fetchall():
        d = dict(row)
        key = d.get(key_column)
        if key is not None:
            rows[key] = d
    return rows


def _rows_by_device_and_id(conn: sqlite3.Connection, table: str) -> dict:
    conn.row_factory = sqlite3.Row
    rows = {}
    for row in conn.execute(f"SELECT * FROM {table}").fetchall():
        d = dict(row)
        key = f"{d.get('device_id') or 'unknown'}::{d['id']}"
        rows[key] = d
    return rows


def _seconds_apart(ts_a: str | None, ts_b: str | None) -> float:
    """Absolute difference in seconds between two SQLite datetime
    strings. Returns 0 if either is missing or unparseable, treating
    that as "not a real edit" rather than raising."""
    if not ts_a or not ts_b:
        return 0.0
    formats = ("%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S")
    parsed = {}
    for label, ts in (("a", ts_a), ("b", ts_b)):
        for fmt in formats:
            try:
                parsed[label] = datetime.strptime(ts, fmt)
                break
            except ValueError:
                continue
    if "a" not in parsed or "b" not in parsed:
        return 0.0
    return abs((parsed["a"] - parsed["b"]).total_seconds())


def _compare(a_rows: dict, b_rows: dict) -> list:
    changes = []
    all_keys = set(a_rows) | set(b_rows)
    for key in sorted(all_keys, key=str):
        a = a_rows.get(key)
        b = b_rows.get(key)

        if a is None and b is not None:
            changes.append(RowChange(key=str(key), action="add_from_b", b_updated_at=b.get("updated_at")))
            continue
        if b is None:
            # Present only in A (this device) -- nothing to do, A already has it.
            continue

        a_updated = a.get("updated_at")
        b_updated = b.get("updated_at")
        if a_updated == b_updated:
            changes.append(RowChange(key=str(key), action="identical", a_updated_at=a_updated, b_updated_at=b_updated))
            continue

        # Both sides diverge -- check whether each side has actually
        # been edited since creation, or is still at its original
        # created_at (never touched on that device). Only when BOTH
        # sides show a real independent edit does this need a human
        # to review before either version overwrites the other.
        #
        # created_at and updated_at are set via two separate
        # datetime.utcnow() calls at insert time (see TimestampMixin),
        # so a never-edited row's updated_at is a few microseconds
        # AFTER its created_at, not exactly equal -- exact equality
        # produced false positives on every freshly-created row in
        # testing. A 2-second tolerance treats "insert-time drift" as
        # unedited while still catching any real edit, which happens
        # much later in practice.
        a_created = a.get("created_at")
        b_created = b.get("created_at")
        a_edited = a_updated is not None and _seconds_apart(a_updated, a_created) > 2
        b_edited = b_updated is not None and _seconds_apart(b_updated, b_created) > 2
        needs_review = a_edited and b_edited

        if (b_updated or "") > (a_updated or ""):
            changes.append(RowChange(
                key=str(key), action="b_wins_update",
                a_updated_at=a_updated, b_updated_at=b_updated,
                needs_review=needs_review,
            ))
        else:
            changes.append(RowChange(
                key=str(key), action="a_wins_keep",
                a_updated_at=a_updated, b_updated_at=b_updated,
                needs_review=needs_review,
            ))
    return changes


def preview_merge(zip_path_a: str, zip_path_b: str, expected_db_name: str = "app.db") -> dict:
    """Compares two backup zips (A = e.g. this device's latest backup,
    B = another device's backup) and returns a dry-run report of what a
    merge would do, per table. Writes nothing. Never applies changes.

    A device with no data at all for a table simply reports every row
    from the other side as add_from_b, which is correct (not an error).
    """
    with tempfile.TemporaryDirectory() as tmp_a, tempfile.TemporaryDirectory() as tmp_b:
        db_a = _extract_db(zip_path_a, tmp_a, expected_db_name)
        db_b = _extract_db(zip_path_b, tmp_b, expected_db_name)

        conn_a = sqlite3.connect(db_a)
        conn_b = sqlite3.connect(db_b)
        try:
            existing_a = {r[0] for r in conn_a.execute("SELECT name FROM sqlite_master WHERE type='table'")}
            existing_b = {r[0] for r in conn_b.execute("SELECT name FROM sqlite_master WHERE type='table'")}

            table_previews = []

            for table, key_column in {**REF_KEYED_TABLES, **NAME_KEYED_TABLES}.items():
                if table not in existing_a or table not in existing_b:
                    continue
                a_rows = _rows_by_key(conn_a, table, key_column)
                b_rows = _rows_by_key(conn_b, table, key_column)
                changes = _compare(a_rows, b_rows)
                table_previews.append(
                    TableMergePreview(
                        table=table,
                        match_strategy=f"unique column '{key_column}'",
                        weak_key_warning=False,
                        changes=changes,
                    )
                )

            for table in WEAK_KEY_TABLES:
                if table not in existing_a or table not in existing_b:
                    continue
                a_rows = _rows_by_device_and_id(conn_a, table)
                b_rows = _rows_by_device_and_id(conn_b, table)
                changes = _compare(a_rows, b_rows)
                table_previews.append(
                    TableMergePreview(
                        table=table,
                        match_strategy="(device_id, id) -- no stable business key exists yet",
                        weak_key_warning=True,
                        changes=changes,
                    )
                )

            return {
                "generated_at": datetime.now().isoformat(),
                "zip_path_a": zip_path_a,
                "zip_path_b": zip_path_b,
                "tables": [t.to_dict() for t in table_previews],
            }
        finally:
            conn_a.close()
            conn_b.close()