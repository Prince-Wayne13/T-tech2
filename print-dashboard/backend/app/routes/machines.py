from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import AuditLog, Capability, PricingItem, ProductionMachine
from ..services.machines import (
    compatible_machines,
    machine_workload,
    serialize_machine,
)
from .common import apply_search, list_response

bp = Blueprint("machines", __name__)


def _resolve_capabilities(capability_ids):
    if capability_ids is None:
        return None
    capabilities = Capability.query.filter(Capability.id.in_(capability_ids)).all()
    found_ids = {cap.id for cap in capabilities}
    missing = [cid for cid in capability_ids if cid not in found_ids]
    if missing:
        raise ValueError(f"Unknown capability id(s): {missing}")
    return capabilities


@bp.get("")
def list_machines():
    query = ProductionMachine.query
    category = request.args.get("category")
    status = request.args.get("status")
    available = request.args.get("available")
    capability_id = request.args.get("capability_id", type=int)
    if category and category.lower() != "all":
        query = query.filter(ProductionMachine.category == category)
    if status and status.lower() != "all":
        query = query.filter(ProductionMachine.status == status)
    if available is not None and available.lower() != "all":
        query = query.filter(ProductionMachine.available.is_(available.lower() in {"1", "true", "yes"}))
    query = apply_search(query, ProductionMachine, ["machine_ref", "name", "category", "capability"])
    query = query.order_by(ProductionMachine.category.asc(), ProductionMachine.name.asc())

    if capability_id:
        # Priority 2: capability filtering can't be expressed as a plain
        # column filter (it's a many-to-many join), so apply it in Python
        # after the rest of the query/search-adjacent filters run.
        machines = [m for m in query.all() if any(cap.id == capability_id for cap in m.capabilities)]
        return jsonify({
            "items": [serialize_machine(m) for m in machines],
            "total": len(machines),
        })

    return jsonify(list_response(query, serialize_machine))


@bp.post("")
def create_machine():
    data = request.get_json() or {}
    try:
        capabilities = _resolve_capabilities(data.get("capability_ids"))
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    machine = ProductionMachine(
        machine_ref=data["machine_ref"],
        name=data["name"],
        category=data["category"],
        capability=data.get("capability"),
        status=data.get("status", "active"),
        available=data.get("available", True),
        unavailable_reason=data.get("unavailable_reason"),
        image_path=data.get("image_path"),
        notes=data.get("notes"),
    )
    if capabilities is not None:
        machine.capabilities = capabilities
    db.session.add(machine)
    db.session.flush()
    db.session.add(AuditLog(action=f"Created machine {machine.machine_ref}", entity_type="machine", entity_id=machine.id))
    db.session.commit()
    return jsonify(serialize_machine(machine)), 201


@bp.get("/<int:machine_id>")
def get_machine(machine_id):
    machine = ProductionMachine.query.get_or_404(machine_id)
    return jsonify(serialize_machine(machine))


@bp.put("/<int:machine_id>")
def update_machine(machine_id):
    machine = ProductionMachine.query.get_or_404(machine_id)
    data = request.get_json() or {}

    try:
        capabilities = _resolve_capabilities(data.get("capability_ids"))
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    for field in ["machine_ref", "name", "category", "capability", "status", "unavailable_reason", "image_path", "notes"]:
        if field in data:
            setattr(machine, field, data[field])
    if "available" in data:
        machine.available = bool(data["available"])
        if machine.available:
            machine.unavailable_reason = None
    if capabilities is not None:
        machine.capabilities = capabilities

    db.session.add(AuditLog(action=f"Updated machine {machine.machine_ref}", entity_type="machine", entity_id=machine.id))
    db.session.commit()
    return jsonify(serialize_machine(machine))


@bp.delete("/<int:machine_id>")
def delete_machine(machine_id):
    machine = ProductionMachine.query.get_or_404(machine_id)
    machine_ref = machine.machine_ref
    db.session.delete(machine)
    db.session.add(AuditLog(action=f"Deleted machine {machine_ref}", entity_type="machine", entity_id=machine_id))
    db.session.commit()
    return "", 204


@bp.get("/<int:machine_id>/workload")
def get_machine_workload(machine_id):
    ProductionMachine.query.get_or_404(machine_id)
    return jsonify(machine_workload(machine_id))


@bp.get("/compatible")
def get_compatible_machines():
    capability_id = request.args.get("capability_id", type=int)
    only_available = request.args.get("only_available", "true").lower() in {"1", "true", "yes"}
    machines = compatible_machines(capability_id, only_available=only_available)
    return jsonify({"items": [serialize_machine(m) for m in machines], "total": len(machines)})


@bp.get("/capabilities")
def list_capabilities():
    query = Capability.query
    category = request.args.get("category")
    if category and category.lower() != "all":
        query = query.filter(Capability.category == category)
    query = apply_search(query, Capability, ["name", "category"])
    return jsonify(list_response(query.order_by(Capability.category.asc(), Capability.name.asc())))


@bp.post("/capabilities")
def create_capability():
    data = request.get_json() or {}
    existing = Capability.query.filter(db.func.lower(Capability.name) == data["name"].strip().lower()).first()
    if existing:
        return jsonify({"error": f"Capability '{existing.name}' already exists"}), 409
    capability = Capability(
        name=data["name"].strip(),
        category=data.get("category"),
        notes=data.get("notes"),
    )
    db.session.add(capability)
    db.session.flush()
    db.session.add(AuditLog(action=f"Created capability {capability.name}", entity_type="capability", entity_id=capability.id))
    db.session.commit()
    return jsonify(capability.to_dict()), 201


@bp.put("/capabilities/<int:capability_id>")
def update_capability(capability_id):
    capability = Capability.query.get_or_404(capability_id)
    data = request.get_json() or {}
    if "name" in data:
        capability.name = data["name"].strip()
    if "category" in data:
        capability.category = data["category"]
    if "notes" in data:
        capability.notes = data["notes"]
    db.session.add(AuditLog(action=f"Updated capability {capability.name}", entity_type="capability", entity_id=capability.id))
    db.session.commit()
    return jsonify(capability.to_dict())


@bp.delete("/capabilities/<int:capability_id>")
def delete_capability(capability_id):
    capability = Capability.query.get_or_404(capability_id)
    name = capability.name
    db.session.delete(capability)
    db.session.add(AuditLog(action=f"Deleted capability {name}", entity_type="capability", entity_id=capability_id))
    db.session.commit()
    return "", 204


@bp.get("/pricing")
def list_pricing_items():
    query = PricingItem.query
    category = request.args.get("category")
    if category and category.lower() != "all":
        query = query.filter(PricingItem.category == category)
    query = apply_search(query, PricingItem, ["code", "name", "category", "unit"])
    return jsonify(
        list_response(
            query.order_by(PricingItem.category.asc(), PricingItem.name.asc()),
            lambda item: item.to_dict() | {"machine_name": item.machine.name if item.machine else None},
        )
    )


@bp.post("/pricing")
def create_pricing_item():
    data = request.get_json() or {}
    item = PricingItem(
        code=data["code"],
        name=data["name"],
        category=data["category"],
        machine_id=data.get("machine_id"),
        unit=data.get("unit", "unit"),
        price=data.get("price", 0),
        cost_estimate=data.get("cost_estimate", 0),
        currency=data.get("currency", "MWK"),
        active=data.get("active", True),
        notes=data.get("notes"),
    )
    db.session.add(item)
    db.session.flush()
    db.session.add(AuditLog(action=f"Created pricing item {item.code}", entity_type="pricing_item", entity_id=item.id))
    db.session.commit()
    return jsonify(item.to_dict() | {"machine_name": item.machine.name if item.machine else None}), 201


@bp.get("/pricing/<int:item_id>")
def get_pricing_item(item_id):
    item = PricingItem.query.get_or_404(item_id)
    return jsonify(item.to_dict() | {"machine_name": item.machine.name if item.machine else None})


@bp.put("/pricing/<int:item_id>")
def update_pricing_item(item_id):
    item = PricingItem.query.get_or_404(item_id)
    data = request.get_json() or {}
    for field in ["code", "name", "category", "unit", "price", "cost_estimate", "currency", "notes"]:
        if field in data:
            setattr(item, field, data[field])
    if "machine_id" in data:
        item.machine_id = data["machine_id"]
    if "active" in data:
        item.active = bool(data["active"])
    db.session.add(AuditLog(action=f"Updated pricing item {item.code}", entity_type="pricing_item", entity_id=item.id))
    db.session.commit()
    return jsonify(item.to_dict() | {"machine_name": item.machine.name if item.machine else None})


@bp.delete("/pricing/<int:item_id>")
def delete_pricing_item(item_id):
    item = PricingItem.query.get_or_404(item_id)
    code = item.code
    db.session.delete(item)
    db.session.add(AuditLog(action=f"Deleted pricing item {code}", entity_type="pricing_item", entity_id=item_id))
    db.session.commit()
    return "", 204
