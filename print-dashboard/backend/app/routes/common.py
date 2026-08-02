from flask import request

from ..extensions import db


def apply_search(query, model, fields):
    search = request.args.get("search", "").strip()
    if not search:
        return query

    filters = [getattr(model, field).ilike(f"%{search}%") for field in fields]
    return query.filter(db.or_(*filters))


def list_response(query, serializer=lambda item: item.to_dict()):
    page = max(int(request.args.get("page", 1)), 1)
    per_page = min(max(int(request.args.get("per_page", 50)), 1), 200)
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    return {
        "items": [serializer(item) for item in pagination.items],
        "page": pagination.page,
        "per_page": pagination.per_page,
        "total": pagination.total,
        "pages": pagination.pages,
    }


class MissingFieldError(Exception):
    """Raised by require_fields() -- a required field was missing or blank.

    Build decision #9: Job/Proposal/Invoice/Client creation used to read
    required fields with raw `data["field"]`, which raises an uncaught
    KeyError on a missing field -- Flask's default error handler turns
    that into a raw stack trace / HTML error page (the same class of
    problem as item 15, just triggered from a route instead of a
    frontend browser dialog). Routes catch this and return a clean
    `{"error": "X is required"}` / 400 instead.
    """

    def __init__(self, field_label):
        self.field_label = field_label
        super().__init__(f"{field_label} is required")


def require_fields(data, fields):
    """Check that each (key, label) in `fields` is present and non-blank
    in `data`. Raises MissingFieldError naming the first one that's
    missing -- a blank string ("") counts as missing, matching what the
    frontend's own required-field check treats as empty."""
    for key, label in fields:
        value = data.get(key)
        if value is None or (isinstance(value, str) and not value.strip()):
            raise MissingFieldError(label)
