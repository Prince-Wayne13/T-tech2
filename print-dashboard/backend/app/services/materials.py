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
from .ref_generator import next_material_ref  # noqa: F401 -- re-exported so
    # routes/materials.py's existing `from ..services.materials import
    # next_material_ref` keeps working unchanged; the real, collision-safe
    # implementation now lives in ref_generator.py alongside every other
    # ref type, see that file's module docstring for why.
from .reports import money

USAGE_LOOKBACK_DAYS = 30


def _qty(value):
    return Decimal(str(value or 0))


def material_stock_summary(material_id, transactions=None):
    """Returns {'purchased', 'used', 'adjusted', 'on_hand'} as Decimals, all
    in the material's own unit. transactions can be pre-fetched (batch list
    view) or omitted (single-material view, queried here) - same optional-
    precompute pattern as vendor_balance_summary()/vendor_balance_summaries().

    "count" transactions (a physical stock take) are handled specially:
    each one's quantity is the actual counted total, not a delta to add
    like purchase/usage/adjustment. Whichever count is most recent (by
    transaction_date, falling back to id for same-day counts) resets what
    "on hand" means from that point forward -- everything before it is
    summarised as normal, then the count's own quantity replaces the
    running total, and only purchase/usage/adjustment rows STRICTLY AFTER
    that count continue to move stock from there. This mirrors how a real
    physical count is meant to work: it corrects the books to match reality,
    it doesn't just get logged alongside without changing anything.
    """
    if transactions is None:
        transactions = MaterialTransaction.query.filter(MaterialTransaction.material_id == material_id).all()

    # Process in date order (id as a tiebreaker for same-day rows) so a
    # count's "reset point" is unambiguous even if rows were entered out of
    # chronological order.
    ordered = sorted(transactions, key=lambda t: (t.transaction_date or date.min, t.id))

    purchased = Decimal("0.000")
    used = Decimal("0.000")
    adjusted = Decimal("0.000")
    on_hand = Decimal("0.000")

    for txn in ordered:
        qty = _qty(txn.quantity)
        if txn.transaction_type == "purchase":
            purchased += qty
            on_hand += qty
        elif txn.transaction_type == "usage":
            used += qty
            on_hand -= qty
        elif txn.transaction_type == "adjustment":
            # Adjustment quantity is signed by the caller (+ for a stock
            # count that found more than expected, - for waste/damage/loss),
            # so it's added directly rather than bucketed like purchase/usage.
            adjusted += qty
            on_hand += qty
        elif txn.transaction_type == "count":
            # The counted quantity becomes the new on-hand total directly.
            # The gap between what the ledger expected and what was
            # actually found is recorded as an adjustment, so total
            # purchased/used/adjusted figures stay a truthful history of
            # what happened, while on_hand reflects physical reality.
            variance = qty - on_hand
            adjusted += variance
            on_hand = qty

    return {"purchased": purchased, "used": used, "adjusted": adjusted, "on_hand": on_hand}


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


def material_reconciliation(material_id, transactions=None):
    """Physical-count-check for one material -- what MaterialDetail's
    'Physical Count Check' stat card reads. Finds the most recent 'count'
    transaction (if any) and reports the variance recorded against it at
    the time (see material_stock_summary's count handling above -- the
    variance was already computed and folded into 'adjusted' there; this
    just surfaces that same number attached to when it happened).
    """
    if transactions is None:
        transactions = MaterialTransaction.query.filter(MaterialTransaction.material_id == material_id).all()

    counts = sorted(
        (t for t in transactions if t.transaction_type == "count"),
        key=lambda t: (t.transaction_date or date.min, t.id),
    )
    if not counts:
        return {"reconciled": False, "variance": None, "count_date": None}

    latest_count = counts[-1]
    # Re-derive what the ledger expected AT the moment of that count, the
    # same way material_stock_summary does internally, so this number is
    # always freshly correct rather than a separately-stored duplicate that
    # could drift (same "derive, don't store" principle as the rest of this
    # file).
    before_count = [t for t in transactions if (t.transaction_date or date.min, t.id) < (latest_count.transaction_date or date.min, latest_count.id)]
    expected_before = material_stock_summary(material_id, before_count)["on_hand"]
    variance = _qty(latest_count.quantity) - expected_before

    return {
        "reconciled": True,
        "variance": money(variance),
        "count_date": latest_count.transaction_date.isoformat() if latest_count.transaction_date else None,
    }


def build_materials_reconciliation(month=None):
    """Month-end periodic-inventory reconciliation across every active
    material -- what Materials.jsx's Month-End Report tab reads
    (GET /api/reports/materials). For each material: opening stock (as of
    the start of the month), purchased/consumed/adjusted during the month,
    closing stock, what was actually produced from it (via linked jobs'
    output_quantity/output_description on usage rows), and whether a
    physical count happened during the month with any variance.

    month: 'YYYY-MM' string, defaults to the current month.
    """
    from calendar import monthrange

    if month:
        year, month_num = (int(part) for part in month.split("-"))
    else:
        today = date.today()
        year, month_num = today.year, today.month

    period_start = date(year, month_num, 1)
    period_end = date(year, month_num, monthrange(year, month_num)[1])

    materials = Material.query.filter(Material.active.is_(True)).order_by(Material.name.asc()).all()

    rows = []
    unreconciled = []
    count_variance = []

    for material in materials:
        all_txns = MaterialTransaction.query.filter(MaterialTransaction.material_id == material.id).all()

        before_period = [t for t in all_txns if (t.transaction_date or date.min) < period_start]
        opening_stock = material_stock_summary(material.id, before_period)["on_hand"]

        during_period = [t for t in all_txns if t.transaction_date and period_start <= t.transaction_date <= period_end]

        purchased = sum((_qty(t.quantity) for t in during_period if t.transaction_type == "purchase"), Decimal("0.000"))
        consumed = sum((_qty(t.quantity) for t in during_period if t.transaction_type == "usage"), Decimal("0.000"))
        adjusted = sum((_qty(t.quantity) for t in during_period if t.transaction_type == "adjustment"), Decimal("0.000"))

        # A count during the period also contributes its own reconciling
        # adjustment (the gap between ledger-expected and physically
        # counted), same logic as material_stock_summary, applied only to
        # what's "adjusted" for THIS specific period's rows.
        counts_this_period = sorted(
            (t for t in during_period if t.transaction_type == "count"),
            key=lambda t: (t.transaction_date or date.min, t.id),
        )
        running = opening_stock
        for txn in sorted(during_period, key=lambda t: (t.transaction_date or date.min, t.id)):
            qty = _qty(txn.quantity)
            if txn.transaction_type == "purchase":
                running += qty
            elif txn.transaction_type == "usage":
                running -= qty
            elif txn.transaction_type == "adjustment":
                running += qty
            elif txn.transaction_type == "count":
                adjusted += qty - running
                running = qty

        closing_stock = running

        output_produced = {}
        for txn in during_period:
            if txn.transaction_type == "usage" and txn.output_quantity:
                label = txn.output_description or "unlabelled output"
                output_produced[label] = output_produced.get(label, 0) + float(txn.output_quantity)

        if counts_this_period:
            latest = counts_this_period[-1]
            before_latest = [t for t in all_txns if (t.transaction_date or date.min, t.id) < (latest.transaction_date or date.min, latest.id)]
            expected_before_latest = material_stock_summary(material.id, before_latest)["on_hand"]
            variance = _qty(latest.quantity) - expected_before_latest
            physical_count_check = {
                "count_date": latest.transaction_date.isoformat() if latest.transaction_date else None,
                "variance": money(variance),
            }
            if abs(variance) > Decimal("0.001"):
                count_variance.append(material.material_ref)
        else:
            physical_count_check = None
            unreconciled.append(material.material_ref)

        rows.append({
            "material_id": material.id,
            "name": material.name,
            "material_ref": material.material_ref,
            "unit": material.unit,
            "opening_stock": money(opening_stock),
            "purchased": money(purchased),
            "consumed": money(consumed),
            "adjusted": money(adjusted),
            "closing_stock": money(closing_stock),
            "output_produced": output_produced,
            "physical_count_check": physical_count_check,
        })

    return {
        "period_start": period_start.isoformat(),
        "period_end": period_end.isoformat(),
        "formula": "Opening + Purchased - Consumed + Adjusted (incl. count variance) = Closing",
        "materials": rows,
        "flags": {
            "unreconciled_count": unreconciled,
            "count_variance": count_variance,
        },
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