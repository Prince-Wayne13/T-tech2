from flask import Blueprint, jsonify, request, send_file

from ..extensions import db
from ..models import ExportJob
from ..services.exports import create_export_file
from .common import list_response

bp = Blueprint("exports", __name__)


@bp.get("")
def list_exports():
    return jsonify(list_response(ExportJob.query.order_by(ExportJob.created_at.desc())))


@bp.post("")
def create_export():
    data = request.get_json() or {}
    export_job = create_export_file(
        dataset=data.get("dataset", "financials"),
        file_format=data.get("format", "csv"),
        generated_by=data.get("generated_by", "Wayne"),
    )
    db.session.add(export_job)
    db.session.commit()
    return jsonify(export_job.to_dict()), 201


@bp.get("/<int:export_id>/download")
def download_export(export_id):
    export_job = ExportJob.query.get_or_404(export_id)
    return send_file(export_job.file_path, as_attachment=True)
