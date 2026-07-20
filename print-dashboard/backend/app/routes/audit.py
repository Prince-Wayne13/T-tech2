from flask import Blueprint, jsonify

from ..models import AuditLog
from .common import list_response

bp = Blueprint("audit", __name__)


@bp.get("")
def list_audit_logs():
    return jsonify(list_response(AuditLog.query.order_by(AuditLog.created_at.desc())))
