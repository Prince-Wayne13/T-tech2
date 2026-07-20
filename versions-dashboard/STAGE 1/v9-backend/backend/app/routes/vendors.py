from flask import Blueprint, jsonify, request

from ..models import Vendor
from .common import apply_search, list_response

bp = Blueprint("vendors", __name__)


@bp.get("")
def list_vendors():
    query = Vendor.query
    status = request.args.get("status")
    if status and status.lower() != "all":
        query = query.filter(Vendor.status == status.lower())
    query = apply_search(query, Vendor, ["name", "category", "email", "phone"])
    return jsonify(list_response(query.order_by(Vendor.name.asc())))
