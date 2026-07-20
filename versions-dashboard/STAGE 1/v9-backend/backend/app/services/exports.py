from datetime import datetime
from pathlib import Path
import csv

from flask import current_app
from openpyxl import Workbook

from ..models import Expense, ExportJob, Invoice, Job


def dataset_rows(dataset):
    model_map = {
        "expenses": Expense,
        "invoices": Invoice,
        "jobs": Job,
    }
    model = model_map.get(dataset, Invoice)
    rows = [item.to_dict() for item in model.query.all()]
    return rows, dataset


def write_csv(file_path, rows):
    fieldnames = sorted({key for row in rows for key in row.keys()})
    with file_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def write_xlsx(file_path, rows):
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Export"
    fieldnames = sorted({key for row in rows for key in row.keys()})
    sheet.append(fieldnames)
    for row in rows:
        sheet.append([row.get(field) for field in fieldnames])
    workbook.save(file_path)


def create_export_file(dataset="financials", file_format="csv", generated_by="Wayne"):
    rows, dataset_name = dataset_rows(dataset)
    export_dir = Path(current_app.config["REPORT_EXPORT_DIR"])
    export_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    safe_format = file_format.lower()
    file_path = export_dir / f"{dataset_name}_{timestamp}.{safe_format}"

    if safe_format == "xlsx":
        write_xlsx(file_path, rows)
    else:
        safe_format = "csv"
        file_path = file_path.with_suffix(".csv")
        write_csv(file_path, rows)

    return ExportJob(
        export_ref=f"EXPORT-{timestamp}",
        name=f"{dataset_name.title()} Export",
        format=safe_format.upper(),
        records=len(rows),
        file_path=str(file_path),
        status="ready",
        generated_by=generated_by,
        notes="Generated from report service",
    )
