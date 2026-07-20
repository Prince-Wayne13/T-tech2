from datetime import date, timedelta

from .extensions import db
from .models import (
    Advance,
    AuditLog,
    Client,
    Expense,
    ExportJob,
    Invoice,
    Job,
    PricingItem,
    ProductionMachine,
    Vendor,
)
from .services.invoices import apply_line_items, apply_payments, sync_invoice_amount


def seed_mock_data(reset=False):
    if reset:
        for model in [ExportJob, AuditLog, Advance, Expense, Invoice, Job, PricingItem, ProductionMachine, Vendor, Client]:
            db.session.query(model).delete()
        db.session.commit()

    if Client.query.first():
        return {"seeded": False, "message": "Mock data already exists."}

    today = date.today()
    clients = [
        Client(name="Mwai Events", phone="+265 888 214 100", email="events@mwai.example", address="Blantyre CBD"),
        Client(name="Nyasa Fresh Foods", phone="+265 999 120 331", email="brand@nyasafresh.example", address="Limbe"),
        Client(name="Thrive Microfinance", phone="+265 888 779 044", email="ops@thrive.example", address="Victoria Avenue"),
        Client(name="Urban Threads Boutique", phone="+265 999 442 700", email="hello@urbanthreads.example", address="Chichiri"),
        Client(name="BluePeak Construction", phone="+265 888 901 222", email="procurement@bluepeak.example", address="Maselema"),
    ]
    db.session.add_all(clients)
    db.session.flush()

    vendors = [
        Vendor(name="Paperline Supplies", category="Paper & card stock", phone="+265 999 300 410", balance=825000, status="current"),
        Vendor(name="InkPro Malawi", category="Large format ink", phone="+265 888 900 111", balance=315000, status="current"),
        Vendor(name="FlexMaster Media", category="Banner vinyl", phone="+265 999 502 878", balance=0, status="current"),
        Vendor(name="SignFit Installations", category="Mounting & installation", phone="+265 888 141 511", balance=185000, status="watch"),
    ]
    db.session.add_all(vendors)

    machines = [
        ProductionMachine(machine_ref="MCH-DTF-01", name="DTF Print & Heat Press Line", category="DTF Apparel", capability="T-shirts, hoodies, caps, diaries and fabric transfers", image_path="/machines/dtf.svg", notes="Includes DTF printer, powdering/curing workflow and heat pressing machines."),
        ProductionMachine(machine_ref="MCH-LF-01", name="Large Format Printer", category="Large Format", capability="Banners, stickers, vinyl, contra vision and window frosting", image_path="/machines/large-format.svg"),
        ProductionMachine(machine_ref="MCH-KM-01", name="Konica Minolta Digital Press", category="Digital Print", capability="Documents, flyers, booklets, magazines and fast paper printing", image_path="/machines/digital-press.svg"),
        ProductionMachine(machine_ref="MCH-BIND-01", name="Book Binder & Cutter Line", category="Finishing", capability="Books, magazines, newspapers, trimming and binding", image_path="/machines/binder-cutter.svg"),
        ProductionMachine(machine_ref="MCH-SUB-01", name="Sublimation Station", category="Sublimation", capability="Mugs, cups, plates and coated gift items", image_path="/machines/sublimation.svg"),
        ProductionMachine(machine_ref="MCH-UVDTF-01", name="UV DTF Printer", category="UV DTF", capability="Pens, key holders, labels, hard-surface branding and gift items", image_path="/machines/uv-dtf.svg"),
        ProductionMachine(machine_ref="MCH-EMB-01", name="Embroidery Machine", category="Embroidery", capability="Fabric embroidery and branded apparel", status="planned", image_path="/machines/embroidery.svg", notes="Planned future machine."),
        ProductionMachine(machine_ref="MCH-SWT-01", name="Automatic Sweater Machine", category="Apparel", capability="Future sweater production automation", status="planned", image_path="/machines/sweater.svg", notes="Planned future machine."),
    ]
    db.session.add_all(machines)
    db.session.flush()

    machine_by_ref = {machine.machine_ref: machine for machine in machines}
    pricing_items = [
        PricingItem(code="DTF-TSHIRT-A4", name="DTF T-shirt print A4 area", category="DTF Apparel", machine_id=machine_by_ref["MCH-DTF-01"].id, unit="print", price=8500, cost_estimate=3200),
        PricingItem(code="DTF-CAP", name="DTF cap branding", category="DTF Apparel", machine_id=machine_by_ref["MCH-DTF-01"].id, unit="cap", price=6500, cost_estimate=2500),
        PricingItem(code="DTF-DIARY", name="DTF diary branding", category="DTF Apparel", machine_id=machine_by_ref["MCH-DTF-01"].id, unit="diary", price=7500, cost_estimate=2800),
        PricingItem(code="LF-BANNER-SQM", name="PVC banner print", category="Large Format", machine_id=machine_by_ref["MCH-LF-01"].id, unit="sqm", price=18000, cost_estimate=7800),
        PricingItem(code="LF-STICKER-SQM", name="Vinyl sticker print", category="Large Format", machine_id=machine_by_ref["MCH-LF-01"].id, unit="sqm", price=22000, cost_estimate=9000),
        PricingItem(code="LF-FROST-SQM", name="Window frosting film", category="Large Format", machine_id=machine_by_ref["MCH-LF-01"].id, unit="sqm", price=28000, cost_estimate=12500),
        PricingItem(code="LF-CONTRA-SQM", name="Contra vision print", category="Large Format", machine_id=machine_by_ref["MCH-LF-01"].id, unit="sqm", price=30000, cost_estimate=14000),
        PricingItem(code="KM-A4-BW", name="A4 black and white document print", category="Digital Print", machine_id=machine_by_ref["MCH-KM-01"].id, unit="page", price=150, cost_estimate=55),
        PricingItem(code="KM-A4-COLOR", name="A4 colour document print", category="Digital Print", machine_id=machine_by_ref["MCH-KM-01"].id, unit="page", price=650, cost_estimate=260),
        PricingItem(code="KM-FLYER-A5", name="A5 flyer full colour", category="Digital Print", machine_id=machine_by_ref["MCH-KM-01"].id, unit="flyer", price=210, cost_estimate=95),
        PricingItem(code="FIN-BIND", name="Book binding", category="Finishing", machine_id=machine_by_ref["MCH-BIND-01"].id, unit="book", price=3500, cost_estimate=1200),
        PricingItem(code="SUB-MUG", name="Sublimation mug print", category="Sublimation", machine_id=machine_by_ref["MCH-SUB-01"].id, unit="mug", price=7500, cost_estimate=3300),
        PricingItem(code="SUB-PLATE", name="Sublimation plate print", category="Sublimation", machine_id=machine_by_ref["MCH-SUB-01"].id, unit="plate", price=9500, cost_estimate=4300),
        PricingItem(code="UVDTF-PEN", name="UV DTF pen branding", category="UV DTF", machine_id=machine_by_ref["MCH-UVDTF-01"].id, unit="pen", price=1800, cost_estimate=650),
        PricingItem(code="UVDTF-KEY", name="UV DTF key holder branding", category="UV DTF", machine_id=machine_by_ref["MCH-UVDTF-01"].id, unit="key holder", price=2500, cost_estimate=900),
    ]
    db.session.add_all(pricing_items)
    db.session.flush()
    pricing_by_code = {item.code: item for item in pricing_items}

    jobs = [
        Job(job_ref="JOB-1001", client_id=clients[0].id, client_name=clients[0].name, title="A2 event posters and stage backdrop", machine_id=machine_by_ref["MCH-LF-01"].id, service_category="Large Format", status="printing", priority="high", pages=1, copies=250, progress=65, due_date=today + timedelta(days=2), notes="Use outdoor-safe ink for backdrop."),
        Job(job_ref="JOB-1002", client_id=clients[1].id, client_name=clients[1].name, title="Retail shelf stickers and freezer decals", machine_id=machine_by_ref["MCH-LF-01"].id, service_category="Large Format", status="finishing", priority="medium", pages=4, copies=1800, progress=82, due_date=today + timedelta(days=4), notes="Matte laminate on stickers."),
        Job(job_ref="JOB-1003", client_id=clients[2].id, client_name=clients[2].name, title="Loan campaign flyers", machine_id=machine_by_ref["MCH-KM-01"].id, service_category="Digital Print", status="queued", priority="medium", pages=2, copies=5000, progress=10, due_date=today + timedelta(days=7), notes="Client still reviewing final artwork."),
        Job(job_ref="JOB-1004", client_id=clients[3].id, client_name=clients[3].name, title="Window frosting and boutique branding", machine_id=machine_by_ref["MCH-LF-01"].id, service_category="Large Format", status="ready", priority="high", pages=1, copies=12, progress=100, due_date=today - timedelta(days=1), notes="Ready for installation."),
        Job(job_ref="JOB-1005", client_id=clients[4].id, client_name=clients[4].name, title="Site safety signage and UV DTF key holders", machine_id=machine_by_ref["MCH-UVDTF-01"].id, service_category="UV DTF", status="completed", priority="low", pages=1, copies=30, progress=100, due_date=today - timedelta(days=10), notes="Delivered to site office."),
    ]
    db.session.add_all(jobs)

    invoice_specs = [
        {
            "invoice_ref": "INV-5001",
            "client": clients[0],
            "title": "Event launch print package",
            "status": "sent",
            "issued_on": today - timedelta(days=6),
            "due_on": today + timedelta(days=8),
            "purchase_order": "ME-APR-221",
            "line_items": [
                {"description": "A2 full-colour event posters", "product_type": "Digital Print", "machine_id": machine_by_ref["MCH-KM-01"].id, "pricing_item_id": pricing_by_code["KM-A4-COLOR"].id, "quantity": 250, "unit": "prints", "unit_price": 1850},
                {"description": "3m x 2m stage backdrop banner", "product_type": "Large Format", "machine_id": machine_by_ref["MCH-LF-01"].id, "pricing_item_id": pricing_by_code["LF-BANNER-SQM"].id, "quantity": 1, "unit": "banner", "unit_price": 315000},
                {"description": "Artwork prepress and colour proof", "product_type": "Design & Prepress", "quantity": 1, "unit": "service", "unit_price": 65000},
            ],
            "payments": [{"amount": 200000, "method": "mobile_money", "paid_on": today - timedelta(days=3), "received_by": "Accounts"}],
        },
        {
            "invoice_ref": "INV-5002",
            "client": clients[1],
            "title": "Sticker and decal rollout",
            "status": "paid",
            "issued_on": today - timedelta(days=22),
            "due_on": today - timedelta(days=8),
            "paid_on": today - timedelta(days=6),
            "line_items": [
                {"description": "Waterproof product stickers", "product_type": "Large Format", "machine_id": machine_by_ref["MCH-LF-01"].id, "pricing_item_id": pricing_by_code["LF-STICKER-SQM"].id, "quantity": 1800, "unit": "stickers", "unit_price": 320},
                {"description": "Freezer vinyl decals", "product_type": "Large Format", "machine_id": machine_by_ref["MCH-LF-01"].id, "quantity": 24, "unit": "decals", "unit_price": 9500},
            ],
            "payments": [{"amount": 804000, "method": "bank_transfer", "paid_on": today - timedelta(days=6), "received_by": "Wayne"}],
        },
        {
            "invoice_ref": "INV-5003",
            "client": clients[2],
            "title": "Microloan campaign flyers",
            "status": "overdue",
            "issued_on": today - timedelta(days=35),
            "due_on": today - timedelta(days=15),
            "line_items": [
                {"description": "A5 double-sided flyers", "product_type": "Digital Print", "machine_id": machine_by_ref["MCH-KM-01"].id, "pricing_item_id": pricing_by_code["KM-FLYER-A5"].id, "quantity": 5000, "unit": "flyers", "unit_price": 210},
                {"description": "Copy cleanup and layout", "product_type": "Design & Prepress", "quantity": 1, "unit": "service", "unit_price": 55000},
            ],
            "payments": [],
        },
        {
            "invoice_ref": "INV-5004",
            "client": clients[3],
            "title": "Boutique window branding",
            "status": "paid",
            "issued_on": today - timedelta(days=16),
            "due_on": today - timedelta(days=2),
            "paid_on": today - timedelta(days=1),
            "line_items": [
                {"description": "Frosted window vinyl", "product_type": "Large Format", "machine_id": machine_by_ref["MCH-LF-01"].id, "pricing_item_id": pricing_by_code["LF-FROST-SQM"].id, "quantity": 12, "unit": "panels", "unit_price": 28000},
                {"description": "On-site installation", "product_type": "Installation", "quantity": 1, "unit": "service", "unit_price": 120000},
            ],
            "payments": [{"amount": 456000, "method": "cash", "paid_on": today - timedelta(days=1), "received_by": "Accounts"}],
        },
    ]

    invoices = []
    for spec in invoice_specs:
        invoice = Invoice(
            invoice_ref=spec["invoice_ref"],
            client_id=spec["client"].id,
            client_name=spec["client"].name,
            title=spec["title"],
            status=spec["status"],
            tax_rate=0,
            currency="MWK",
            issued_on=spec["issued_on"],
            due_on=spec["due_on"],
            paid_on=spec.get("paid_on"),
            purchase_order=spec.get("purchase_order"),
            payment_terms="14 days",
            notes="Thank you for choosing T-Tech for your print production.",
        )
        apply_line_items(invoice, spec["line_items"])
        apply_payments(invoice, spec["payments"])
        sync_invoice_amount(invoice)
        invoices.append(invoice)

    db.session.add_all(invoices)

    expenses = [
        Expense(expense_ref="EXP-2001", category="Materials", title="SRA3 card stock and matte laminate", amount=385000, expense_date=today - timedelta(days=5), status="approved", submitted_by="Production"),
        Expense(expense_ref="EXP-2002", category="Ink & Consumables", title="CMYK large-format ink set", amount=620000, expense_date=today - timedelta(days=9), status="approved", submitted_by="Print Room"),
        Expense(expense_ref="EXP-2003", category="Installation", title="Window branding installation labour", amount=90000, expense_date=today - timedelta(days=2), status="reimbursed", submitted_by="Field Team"),
        Expense(expense_ref="EXP-2004", category="Maintenance", title="Plotter blade and service kit", amount=175000, expense_date=today - timedelta(days=13), status="pending", submitted_by="Technician"),
    ]
    db.session.add_all(expenses)

    advances = [
        Advance(advance_ref="ADV-3001", recipient="Field Team", amount=150000, status="open", issued_on=today - timedelta(days=3), notes="Transport and installation consumables."),
        Advance(advance_ref="ADV-3002", recipient="Design Lead", amount=80000, status="settled", issued_on=today - timedelta(days=20), settled_on=today - timedelta(days=14), notes="Client proofing materials."),
    ]
    db.session.add_all(advances)

    db.session.add_all(
        [
            AuditLog(actor="system", action="Seeded professional print dashboard mock data", entity_type="system"),
            AuditLog(actor="Wayne", action="Marked INV-5002 as paid", entity_type="invoice"),
            AuditLog(actor="Production", action="Updated JOB-1002 to finishing", entity_type="job"),
        ]
    )
    db.session.commit()

    return {
        "seeded": True,
        "clients": len(clients),
        "vendors": len(vendors),
        "machines": len(machines),
        "pricing_items": len(pricing_items),
        "jobs": len(jobs),
        "invoices": len(invoices),
        "expenses": len(expenses),
    }
