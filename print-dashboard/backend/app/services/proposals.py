# path: backend/app/services/proposals.py

from datetime import date
from decimal import Decimal

from ..models import Proposal, ProposalLineItem
from ..utils import parse_date


def decimal_money(value):
    if value is None:
        return Decimal("0.00")
    return Decimal(str(value)).quantize(Decimal("0.01"))


def proposal_totals(proposal):
    subtotal = sum((item.amount or Decimal("0.00") for item in proposal.line_items), Decimal("0.00"))
    discount = decimal_money(proposal.discount_amount)
    total = max(subtotal - discount, Decimal("0.00"))
    return {
        "subtotal": float(subtotal),
        "discount": float(discount),
        "total": float(total),
    }


def serialize_proposal(proposal, include_document=False):
    data = proposal.to_dict()
    data["line_items"] = [item.to_dict() for item in proposal.line_items]
    data["totals"] = proposal_totals(proposal)
    data["is_expired"] = bool(
        proposal.valid_until
        and proposal.valid_until < date.today()
        and proposal.status not in {"accepted", "declined"}
    )

    if include_document:
        data["document"] = build_proposal_document(proposal)

    return data


def apply_proposal_line_items(proposal, line_items):
    proposal.line_items.clear()
    for index, item in enumerate(line_items or [], start=1):
        proposal.line_items.append(
            ProposalLineItem(
                position=item.get("position", index),
                # Accepts both `description` (backend-native naming, matches
                # InvoiceLineItem's convention) and `desc` (what the current
                # NewProposalModal frontend form actually sends), so the frontend
                # doesn't need a simultaneous rewrite for this to work.
                description=item.get("description") or item.get("desc", ""),
                amount=decimal_money(item.get("amount", 0)),
            )
        )


def build_proposal_document(proposal):
    totals = proposal_totals(proposal)
    return {
        "title": f"Proposal {proposal.proposal_ref}",
        "header": {
            "proposal_ref": proposal.proposal_ref,
            "status": proposal.status,
            "currency": proposal.currency,
        },
        "billing": {
            "client_name": proposal.client_name,
            "contact": proposal.contact,
            "valid_until": proposal.valid_until.isoformat() if proposal.valid_until else None,
        },
        "line_items": [
            {
                "description": item.description,
                "amount": float(item.amount),
            }
            for item in proposal.line_items
        ],
        "totals": totals,
        "footer": {
            "notes": proposal.notes,
        },
    }