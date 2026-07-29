# path: backend/app/routes/clients.py
#
# New file. No Client route/blueprint existed anywhere before this — Client
# rows were only ever touched implicitly via client_id/client_name on
# Job/Invoice/Proposal. This is the minimum needed to support the confirmed
# "contact autofill, remember on save" flow: list (for dropdown/autofill
# lookup) and a targeted PUT to update phone/email in place when the user
# types a different contact than what's on file.

from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import AuditLog, Client
from .common import apply_search, list_response

bp = Blueprint("clients", __name__)


@bp.get("")
def list_clients():
    query = Client.query
    query = apply_search(query, Client, ["name", "phone", "email"])
    return jsonify(list_response(query.order_by(Client.name.asc())))


@bp.post("")
def create_client():
    from ..services.ref_generator import next_client_ref

    data = request.get_json() or {}
    client = Client(
        client_ref=next_client_ref(),
        name=data["name"],
        phone=data.get("phone"),
        email=data.get("email"),
        address=data.get("address"),
        notes=data.get("notes"),
    )
    db.session.add(client)
    db.session.flush()
    db.session.add(AuditLog(action=f"Created client {client.name}", entity_type="client", entity_id=client.id))
    db.session.commit()
    return jsonify(client.to_dict()), 201


@bp.put("/<int:client_id>")
def update_client(client_id):
    # Used by the Proposal/Job contact-autofill flow: when a user types a
    # contact different from what's on file, it's written back here so it
    # doesn't need retyping next time — mirrors VendorPicker's inline
    # create/update pattern in Modals.jsx, applied to the existing Client
    # row instead of a new table.
    client = Client.query.get_or_404(client_id)
    data = request.get_json() or {}
    for field in ["name", "phone", "email", "address", "notes"]:
        if field in data:
            setattr(client, field, data[field])
    db.session.add(AuditLog(action=f"Updated client {client.name}", entity_type="client", entity_id=client.id))
    db.session.commit()
    return jsonify(client.to_dict())