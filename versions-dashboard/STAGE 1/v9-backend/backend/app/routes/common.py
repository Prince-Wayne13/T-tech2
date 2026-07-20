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
