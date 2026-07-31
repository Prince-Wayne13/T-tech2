# path: backend/app/routes/materials.py
#
# Backend-only this session (Wayne's explicit scope: table + API now, no UI
# yet). Covers materials (stock items like "Vinyl - White Gloss") and
# material_transactions (purchases/usage/adjustments against them).

from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import AuditLog, Material, MaterialTransaction
from ..services.materials import material_reconciliation, next_material_ref, serialize_material, serialize_transaction
from ..utils import parse_date
from .common import apply_search, list_response

bp = Blueprint("materials", __name__)


@bp.get("")
def list_materials():
    query = Material.query
    active = request.args.get("active")
    if active is not None and active.lower() != "all":
        query = query.filter(Material.active == (active.lower() == "true"))
    machine_id = request.args.get("machine_id")
    if machine_id:
        query = query.filter(Material.machine_id == int(machine_id))
    query = apply_search(query, Material, ["name", "category", "material_ref"])
    paginated = list_response(query.order_by(Material.name.asc()))
    materials_by_id = {item["id"]: Material.query.get(item["id"]) for item in paginated["items"]}
    paginated["items"] = [serialize_material(materials_by_id[item["id"]]) for item in paginated["items"]]
    return jsonify(paginated)


@bp.get("/summary")
def materials_summary():
    """All active materials with their full stock/revenue/projection picture
    in one call - built for a future dashboard/report card (Wayne's "vinyl
    thing: purchased this much, used this much, made this much, projected
    profit, estimate of when it may end"), not paginated like the main list
    route since a summary view needs every material at once, not a page of
    them.
    """
    materials = Material.query.filter(Material.active.is_(True)).order_by(Material.name.asc()).all()
    items = [serialize_material(material) for material in materials]
    low_stock = [item for item in items if item["low_stock"]]
    running_out_soon = sorted(
        (item for item in items if item["projection"]["days_remaining"] is not None),
        key=lambda item: item["projection"]["days_remaining"],
    )[:5]
    return jsonify({
        "items": items,
        "total_on_hand_value": sum(item["on_hand"] * (item.get("unit_cost") or 0) for item in items),
        "total_revenue_generated": sum(item["revenue_generated"] for item in items),
        "total_estimated_profit": sum(item["estimated_profit"] for item in items),
        "low_stock": low_stock,
        "running_out_soon": running_out_soon,
    })


@bp.get("/<int:material_id>")
def get_material(material_id):
    material = Material.query.get_or_404(material_id)
    return jsonify(serialize_material(material))


@bp.post("")
def create_material():
    data = request.get_json() or {}
    material = Material(
        material_ref=data.get("material_ref") or next_material_ref(),
        name=data["name"],
        machine_id=data.get("machine_id"),
        category=data.get("category"),
        vendor_id=data.get("vendor_id"),
        unit=data.get("unit", "unit"),
        unit_cost=data.get("unit_cost", 0),
        reorder_point=data.get("reorder_point"),
        active=data.get("active", True),
        notes=data.get("notes"),
    )
    db.session.add(material)
    db.session.flush()
    db.session.add(AuditLog(action=f"Created material {material.name}", entity_type="material", entity_id=material.id))
    db.session.commit()
    return jsonify(serialize_material(material)), 201


@bp.put("/<int:material_id>")
def update_material(material_id):
    material = Material.query.get_or_404(material_id)
    data = request.get_json() or {}
    for field in ["name", "machine_id", "category", "vendor_id", "unit", "unit_cost", "reorder_point", "active", "notes"]:
        if field in data:
            setattr(material, field, data[field])
    db.session.add(AuditLog(action=f"Updated material {material.name}", entity_type="material", entity_id=material.id))
    db.session.commit()
    return jsonify(serialize_material(material))


@bp.delete("/<int:material_id>")
def delete_material(material_id):
    material = Material.query.get_or_404(material_id)
    # Soft delete (active=False) rather than a hard DELETE - a material with
    # transaction history shouldn't disappear and orphan its ledger rows,
    # same reasoning as why jobs/expenses in this app are archived, not
    # deleted outright.
    material.active = False
    db.session.add(AuditLog(action=f"Deactivated material {material.name}", entity_type="material", entity_id=material.id))
    db.session.commit()
    return jsonify(serialize_material(material))


# ── Transactions (purchases / usage / adjustments) ──────────────────────────

@bp.get("/<int:material_id>/transactions")
def list_material_transactions(material_id):
    Material.query.get_or_404(material_id)
    query = MaterialTransaction.query.filter(MaterialTransaction.material_id == material_id)
    txn_type = request.args.get("type")
    if txn_type and txn_type.lower() != "all":
        query = query.filter(MaterialTransaction.transaction_type == txn_type.lower())
    return jsonify(list_response(query.order_by(MaterialTransaction.transaction_date.desc()), serialize_transaction))


@bp.post("/<int:material_id>/transactions")
def create_material_transaction(material_id):
    from ..services.ref_generator import next_material_transaction_ref

    material = Material.query.get_or_404(material_id)
    data = request.get_json() or {}
    transaction_type = data.get("transaction_type")
    if transaction_type not in {"purchase", "usage", "adjustment", "count"}:
        return jsonify({"error": "transaction_type must be 'purchase', 'usage', 'adjustment', or 'count'"}), 400
    quantity = data.get("quantity")
    if quantity is None:
        return jsonify({"error": "quantity is required"}), 400

    txn = MaterialTransaction(
        material_transaction_ref=next_material_transaction_ref(),
        material_id=material.id,
        transaction_type=transaction_type,
        quantity=quantity,
        unit_cost=data.get("unit_cost"),
        transaction_date=parse_date(data.get("transaction_date")) or None,
        job_id=data.get("job_id"),
        vendor_id=data.get("vendor_id"),
        output_quantity=data.get("output_quantity"),
        output_description=data.get("output_description"),
        notes=data.get("notes"),
    )
    db.session.add(txn)
    db.session.flush()
    db.session.add(AuditLog(
        action=f"Recorded {transaction_type} of {quantity}{material.unit} for {material.name}",
        entity_type="material_transaction",
        entity_id=txn.id,
    ))
    db.session.commit()
    return jsonify(serialize_transaction(txn)), 201


@bp.put("/transactions/<int:transaction_id>")
def update_material_transaction(transaction_id):
    """Was entirely missing -- Materials.jsx's edit-transaction flow
    (handleLogTransaction, when editTxn is set) has always called this
    exact address, and got a 405 every time since no route existed here at
    all. Mirrors create_material_transaction's field handling, but leaves
    transaction_type and material_id fixed (an edit corrects details of an
    existing entry, it doesn't move it to a different material or turn a
    purchase into a usage after the fact)."""
    txn = MaterialTransaction.query.get_or_404(transaction_id)
    data = request.get_json() or {}

    if "quantity" in data and data["quantity"] is not None:
        txn.quantity = data["quantity"]
    if "unit_cost" in data:
        txn.unit_cost = data["unit_cost"]
    if "transaction_date" in data:
        txn.transaction_date = parse_date(data.get("transaction_date")) or txn.transaction_date
    if "job_id" in data:
        txn.job_id = data["job_id"]
    if "vendor_id" in data:
        txn.vendor_id = data["vendor_id"]
    if "output_quantity" in data:
        txn.output_quantity = data["output_quantity"]
    if "output_description" in data:
        txn.output_description = data["output_description"]
    if "notes" in data:
        txn.notes = data["notes"]

    db.session.add(AuditLog(
        action=f"Updated {txn.transaction_type} transaction for material #{txn.material_id}",
        entity_type="material_transaction",
        entity_id=txn.id,
    ))
    db.session.commit()
    return jsonify(serialize_transaction(txn))


@bp.get("/<int:material_id>/reconciliation")
def material_reconciliation_route(material_id):
    """Was entirely missing -- MaterialDetail's 'Physical Count Check'
    stat card has always called this exact address (api.materialReconciliation),
    and it fell through to the catch-all frontend route instead of a real
    API response every time."""
    Material.query.get_or_404(material_id)
    return jsonify(material_reconciliation(material_id))


@bp.delete("/transactions/<int:transaction_id>")
def delete_material_transaction(transaction_id):
    # Corrections happen (wrong quantity entered, wrong job linked) - a hard
    # delete here is fine, unlike Material itself, because a transaction row
    # carries no history of its own that anything else points back to.
    txn = MaterialTransaction.query.get_or_404(transaction_id)
    db.session.add(AuditLog(
        action=f"Deleted {txn.transaction_type} transaction for material #{txn.material_id}",
        entity_type="material_transaction",
        entity_id=txn.id,
    ))
    db.session.delete(txn)
    db.session.commit()
    return jsonify({"deleted": True})