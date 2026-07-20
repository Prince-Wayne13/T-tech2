from datetime import datetime


def parse_date(value):
    if not value:
        return None
    if hasattr(value, "isoformat"):
        return value
    return datetime.strptime(value, "%Y-%m-%d").date()
