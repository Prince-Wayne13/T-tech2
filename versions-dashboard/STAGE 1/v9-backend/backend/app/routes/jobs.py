from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import AuditLog, Job
from ..utils import parse_date
from .common import apply_search, list_response

bp = Blueprint("jobs", __name__)


def next_job_ref():
    last = Job.query.order_by(Job.id.desc()).first()
    return f"JOB-{((last.id if last else 0) + 1):04d}"


def serialize_job(job):
    return job.to_dict() | {
        "machine_name": job.machine.name if job.machine else None,
        "machine_category": job.machine.category if job.machine else job.service_category,
    }


@bp.get("")
def list_jobs():
    query = Job.query
    status = request.args.get("status")
    if status and status.lower() != "all":
        query = query.filter(Job.status == status.lower())
    query = apply_search(query, Job, ["job_ref", "client_name", "title"])
    return jsonify(list_response(query.order_by(Job.created_at.desc()), serialize_job))


@bp.post("")
def create_job():
    data = request.get_json() or {}
    job = Job(
        job_ref=data.get("job_ref") or next_job_ref(),
        machine_id=data.get("machine_id"),
        service_category=data.get("service_category"),
        client_name=data["client_name"],
        title=data["title"],
        status=data.get("status", "queued"),
        priority=data.get("priority", "medium"),
        pages=data.get("pages", 0),
        copies=data.get("copies", 1),
        progress=data.get("progress", 0),
        due_date=parse_date(data.get("due_date")),
        notes=data.get("notes"),
    )
    db.session.add(job)
    db.session.flush()
    db.session.add(AuditLog(action=f"Created job {job.job_ref}", entity_type="job", entity_id=job.id))
    db.session.commit()
    return jsonify(serialize_job(job)), 201


@bp.get("/<int:job_id>")
def get_job(job_id):
    return jsonify(serialize_job(Job.query.get_or_404(job_id)))
