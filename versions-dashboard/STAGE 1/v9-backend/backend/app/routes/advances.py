from flask import Blueprint, jsonify, request

from ..models import Advance
from .common import apply_search, list_response

bp = Blueprint("advances", __name__)


@bp.get("")
def list_advances():
    query = Advance.query
    status = request.args.get("status")
    if status and status.lower() != "all":
        query = query.filter(Advance.status == status.lower())
    query = apply_search(query, Advance, ["advance_ref", "recipient", "notes"])
    return jsonify(list_response(query.order_by(Advance.created_at.desc())))
