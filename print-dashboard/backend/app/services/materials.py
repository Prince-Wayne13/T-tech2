# path: backend/app/services/materials.py
#
# Backend-only for this session (per Wayne's explicit scope: build the table
# and API now, UI comes later). Answers exactly what was asked for:
#   - how much of a material we have on hand (purchased minus used)
#   - how much revenue it has generated (via the jobs it was used on)
#   - a simple projection of when it runs out, based on recent usage pace
#
# "Derive, don't store" convention, same reasoning as Vendor balances in
# services/vendors.py: stock and revenue are computed live from the
# MaterialTransaction ledger every time, never written to a mutable running
# total, so they can never silently drift out of sync with the source rows.

from datetime import date, timedelta
from decimal import Decimal

from ..models import Material, MaterialTransaction
from .invoices import invoice_totals
from .reports import money

USAGE_LOOKBACK_DAYS = 30


def next_material_ref():
    last = Material.query.order_by(Material.id.desc()).first()
    return f"MAT-{((last.id if last else 0) + 1):04d}"


def _qty(value):
    return Decimal(str(value or 0))


def material_stock_summary(material_id, transactions=None):
    """Returns {'purchased', 'used', 'adjusted', 'on_hand'} as Decimals, all
    in the material's own unit. transactions can be pre-fetched (batch list
    view) or omitted (single-material view, queried here) - same optional-
    precompute pattern as vendor_balance_summary()/vendor_balance_summaries().

    "count" rows are deliberately excluded from this ledger math - they are
    a labelled physical-count snapshot (see Material Transaction.transaction_
    type comment in models.py), not a movement of stock. Folding a count
    into on_hand here would let a mistyped count silently overwrite the
    ledger-derived figure with no record of the disagreement; instead,
    reconcile_material_count() below compares the two explicitly and reports
    the variance, leaving this function's on_hand as the ledger's own answer.
    """
    if transactions is None:
        transactions = MaterialTransaction.query.filter(MaterialTransaction.material_id == material_id).all()

    purchased = Decimal("0.000")
    used = Decimal("0.000")
    adjusted = Decimal("0.000")
    for txn in transactions:
        qty = _qty(txn.quantity)
        if txn.transaction_type == "purchase":
            purchased += qty
        elif txn.transaction_type == "usage":
            used += qty
        elif txn.transaction_type == "adjustment":
            # Adjustment quantity is signed by the caller (+ for found stock,
            # - for waste/damage/loss), so it's added directly rather than
            # bucketed like purchase/usage.
            adjusted += qty
        # "count" rows: intentionally not summed into any bucket - see
        # docstring above.

    on_hand = purchased - used + adjusted
    return {"purchased": purchased, "used": used, "adjusted": adjusted, "on_hand": on_hand}


def latest_count(material_id, transactions=None, as_of=None):
    """Most recent "count" transaction for a material, optionally as of a
    given date (for a specific month's reconciliation rather than the
    latest count overall). Returns None if no count has ever been logged -
    the caller decides how to handle that (reconciliation just omits a
    variance figure rather than guessing at a count that was never taken).
    """
    if transactions is None:
        transactions = MaterialTransaction.query.filter(MaterialTransaction.material_id == material_id).all()

    counts = [txn for txn in transactions if txn.transaction_type == "count"]
    if as_of is not None:
        counts = [txn for txn in counts if txn.transaction_date and txn.transaction_date <= as_of]
    if not counts:
        return None
    return max(counts, key=lambda txn: (txn.transaction_date, txn.id))


def reconcile_material_count(material_id, transactions=None, as_of=None):
    """Compares the ledger-derived on_hand figure against the most recent
    physical count (as of `as_of`, or the latest count overall if omitted).
    Returns None if no count exists to compare against - callers should
    treat that as "not yet reconciled", not as "variance is zero".
    """
    if transactions is None:
        transactions = MaterialTransaction.query.filter(MaterialTransaction.material_id == material_id).all()

    count_txn = latest_count(material_id, transactions, as_of=as_of)
    if count_txn is None:
        return None

    # Only ledger movements up to (and including) the count date are fair to
    # compare against - transactions logged after the count happened aren't
    # what the counted stock reflected at the time.
    relevant = [
        txn for txn in transactions
        if txn.transaction_date and txn.transaction_date <= count_txn.transaction_date
    ]
    ledger_on_hand = material_stock_summary(material_id, relevant)["on_hand"]
    counted_quantity = _qty(count_txn.quantity)
    variance = counted_quantity - ledger_on_hand

    return {
        "count_transaction_id": count_txn.id,
        "count_date": count_txn.transaction_date.isoformat() if count_txn.transaction_date else None,
        "counted_quantity": float(counted_quantity),
        "ledger_on_hand": float(ledger_on_hand),
        "variance": float(variance),
        "notes": count_txn.notes,
    }


def material_revenue_summary(material_id, transactions=None):
    """Revenue and profit attributed to a material, read from the invoices of
    jobs its usage rows are linked to. A usage row with no job_id (material
    used but never tied to a specific job) contributes 0 revenue but still
    counts toward consumption - it isn't dropped from the ledger.
    """
    if transactions is None:
        transactions = MaterialTransaction.query.filter(MaterialTransaction.material_id == material_id).all()

    revenue = Decimal("0.00")
    jobs_seen = set()
    for txn in transactions:
        if txn.transaction_type != "usage" or not txn.job_id:
            continue
        if txn.job_id in jobs_seen:
            # A job can show up on more than one usage row (e.g. two separate
            # vinyl-consumption entries for the same job) - count that job's
            # invoice total once, not once per row, or revenue would be
            # inflated by however many usage rows happen to reference it.
            continue
        jobs_seen.add(txn.job_id)
        job = txn.job
        if job and job.invoice:
            revenue += invoice_totals(job.invoice)["total"]

    return {"revenue": revenue, "jobs_supplied": len(jobs_seen)}


def material_cost_summary(material, transactions=None):
    """What was actually spent buying this material, from purchase rows'
    own unit_cost where recorded, falling back to the material's current
    unit_cost for older purchase rows that didn't capture a price at the
    time (keeps historic data usable instead of zeroing it out).
    """
    if transactions is None:
        transactions = MaterialTransaction.query.filter(MaterialTransaction.material_id == material.id).all()

    spent = Decimal("0.00")
    for txn in transactions:
        if txn.transaction_type != "purchase":
            continue
        qty = _qty(txn.quantity)
        unit_cost = _qty(txn.unit_cost) if txn.unit_cost is not None else _qty(material.unit_cost)
        spent += qty * unit_cost
    return spent


def material_projection(material, stock_summary, transactions=None):
    """Simple historical-pace projection: average daily usage over the last
    USAGE_LOOKBACK_DAYS, applied to current on-hand stock. Explicitly not a
    forecasting model - same honesty-about-limits framing already used for
    the revenue Projections tab (services/analytics.py's
    build_monthly_projections()), so this doesn't overstate its own
    precision to Wayne or anyone reading the API response later.
    """
    if transactions is None:
        transactions = MaterialTransaction.query.filter(MaterialTransaction.material_id == material.id).all()

    cutoff = date.today() - timedelta(days=USAGE_LOOKBACK_DAYS)
    recent_usage = sum(
        (_qty(txn.quantity) for txn in transactions if txn.transaction_type == "usage" and txn.transaction_date and txn.transaction_date >= cutoff),
        Decimal("0.000"),
    )

    on_hand = stock_summary["on_hand"]
    daily_rate = recent_usage / Decimal(str(USAGE_LOOKBACK_DAYS))

    if daily_rate <= 0:
        return {
            "daily_usage_rate": 0.0,
            "days_remaining": None,
            "estimated_empty_date": None,
            "basis": f"No usage recorded in the last {USAGE_LOOKBACK_DAYS} days",
        }

    if on_hand <= 0:
        return {
            "daily_usage_rate": money(daily_rate),
            "days_remaining": 0,
            "estimated_empty_date": date.today().isoformat(),
            "basis": f"Based on usage over the last {USAGE_LOOKBACK_DAYS} days",
        }

    days_remaining = int(on_hand / daily_rate)
    estimated_empty = date.today() + timedelta(days=days_remaining)
    return {
        "daily_usage_rate": money(daily_rate),
        "days_remaining": days_remaining,
        "estimated_empty_date": estimated_empty.isoformat(),
        "basis": f"Based on usage over the last {USAGE_LOOKBACK_DAYS} days",
    }


def serialize_material(material, transactions=None):
    if transactions is None:
        transactions = MaterialTransaction.query.filter(MaterialTransaction.material_id == material.id).all()

    stock = material_stock_summary(material.id, transactions)
    revenue = material_revenue_summary(material.id, transactions)
    cost = material_cost_summary(material, transactions)
    projection = material_projection(material, stock, transactions)

    data = material.to_dict()
    data["machine_name"] = material.machine.name if material.machine else None
    data["vendor_name"] = material.vendor.name if material.vendor else None
    data["purchased"] = money(stock["purchased"])
    data["used"] = money(stock["used"])
    data["adjusted"] = money(stock["adjusted"])
    data["on_hand"] = money(stock["on_hand"])
    data["low_stock"] = bool(material.reorder_point is not None and stock["on_hand"] <= _qty(material.reorder_point))
    data["total_spent"] = money(cost)
    data["revenue_generated"] = money(revenue["revenue"])
    data["jobs_supplied"] = revenue["jobs_supplied"]
    data["estimated_profit"] = money(revenue["revenue"] - cost)
    data["projection"] = projection
    return data


def serialize_transaction(txn):
    data = txn.to_dict()
    data["material_name"] = txn.material.name if txn.material else None
    data["job_ref"] = txn.job.job_ref if txn.job else None
    return data


def serialize_material_unit(material):
    """Small helper used by the reconciliation report so each row can show
    its own unit label (e.g. "sq.m", "L") next to quantities, without the
    report builder needing to re-fetch/join Material itself for that one field.
    """
    return material.unit