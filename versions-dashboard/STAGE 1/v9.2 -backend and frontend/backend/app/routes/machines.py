from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import AuditLog, PricingItem, ProductionMachine
from .common import apply_search, list_response

bp = Blueprint("machines", __name__)


@bp.get("")
def list_machines():
    query = ProductionMachine.query
    category = request.args.get("category")
    status = request.args.get("status")
    if category and category.lower() != "all":
        query = query.filter(ProductionMachine.category == category)
    if status and status.lower() != "all":
        query = query.filter(ProductionMachine.status == status)
    query = apply_search(query, ProductionMachine, ["machine_ref", "name", "category", "capability"])
    return jsonify(list_response(query.order_by(ProductionMachine.category.asc(), ProductionMachine.name.asc())))


@bp.post("")
def create_machine():
    data = request.get_json() or {}
    machine = ProductionMachine(
        machine_ref=data["machine_ref"],
        name=data["name"],
        category=data["category"],
        capability=data.get("capability"),
        status=data.get("status", "active"),
        image_path=data.get("image_path"),
        notes=data.get("notes"),
    )
    db.session.add(machine)
    db.session.flush()
    db.session.add(AuditLog(action=f"Created machine {machine.machine_ref}", entity_type="machine", entity_id=machine.id))
    db.session.commit()
    return jsonify(machine.to_dict()), 201


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
