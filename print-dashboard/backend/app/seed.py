# path: backend/app/seed.py

from datetime import date, datetime, time, timedelta
import random

from .extensions import db
from .models import (
    Advance,
    AuditLog,
    Client,
    Expense,
    ExportJob,
    Invoice,
    Job,
    Payment,
    PricingItem,
    ProductionMachine,
    Proposal,
    ProposalLineItem,
    Vendor,
)
from .services.invoices import apply_line_items, apply_payments, sync_invoice_amount


def as_datetime(value):
    if isinstance(value, datetime):
        return value
    return datetime.combine(value, time(hour=9))


def spread_days(month_start, month_end, count, force_first=False):
    available = list(range((month_end - month_start).days + 1))
    if force_first and 0 in available:
        remaining = [day for day in available if day != 0]
        return sorted([0] + random.sample(remaining, min(count - 1, len(remaining))))
    return sorted(random.sample(available, min(count, len(available))))


def seed_mock_data(reset=False):
    random.seed(20250101)
    if reset:
        for model in [ExportJob, AuditLog, Advance, Expense, Payment, ProposalLineItem, Proposal, Invoice, Job, PricingItem, ProductionMachine, Vendor, Client]:
            db.session.query(model).delete()
        db.session.commit()

    if Client.query.first():
        return {"seeded": False, "message": "Mock data already exists."}

    today = date.today()
    start_date = date(2025, 1, 1)

    clients = [
        Client(name="Mwai Events", phone="+265 888 214 100", email="events@mwai.example", address="Blantyre CBD"),
        Client(name="Nyasa Fresh Foods", phone="+265 999 120 331", email="brand@nyasafresh.example", address="Limbe"),
        Client(name="Thrive Microfinance", phone="+265 888 779 044", email="ops@thrive.example", address="Victoria Avenue"),
        Client(name="Urban Threads Boutique", phone="+265 999 442 700", email="hello@urbanthreads.example", address="Chichiri"),
        Client(name="BluePeak Construction", phone="+265 888 901 222", email="procurement@bluepeak.example", address="Maselema"),
        Client(name="Malawi Revenue Authority", phone="+265 177", email="comms@mra.mw", address="Chichiri, Blantyre"),
        Client(name="National Bank of Malawi", phone="+265 888 840 000", email="marketing@natbank.mw", address="Victoria Avenue, Blantyre"),
        Client(name="Shoprite Malawi", phone="+265 999 200 100", email="brand@shoprite.mw", address="Chichiri Mall, Blantyre"),
        Client(name="Airtel Malawi", phone="+265 888 000 100", email="marketing@airtel.mw", address="Livingstone Avenue, Blantyre"),
        Client(name="Mulanje Peaks Tourism", phone="+265 999 312 540", email="info@mulanjepeak.mw", address="Mulanje"),
        Client(name="Zodiak Broadcasting", phone="+265 888 343 000", email="ads@zodiak.mw", address="Ginnery Corner, Blantyre"),
        Client(name="Malawi Savings Bank", phone="+265 888 920 100", email="ops@msb.mw", address="Henderson Street, Blantyre"),
        Client(name="Sunbird Tourism", phone="+265 888 620 100", email="events@sunbird.mw", address="Lilongwe"),
        Client(name="Standard Bank Malawi", phone="+265 888 388 888", email="marketing@standardbank.mw", address="Glyn Jones Road, Blantyre"),
        Client(name="Chibuku Products Ltd", phone="+265 999 441 200", email="brand@chibuku.mw", address="Limbe, Blantyre"),
        Client(name="Rab Processors", phone="+265 888 571 000", email="procurement@rab.mw", address="Makata Industrial, Blantyre"),
        Client(name="Illovo Sugar Malawi", phone="+265 999 631 000", email="comms@illovo.mw", address="Limbe"),
        Client(name="Malawi Polytechnic", phone="+265 888 220 388", email="registry@poly.mw", address="Chichiri, Blantyre"),
        Client(name="Kamuzu University of Health Sciences", phone="+265 888 316 000", email="admin@kuhes.ac.mw", address="Blantyre"),
        Client(name="Peoples Trading Centre", phone="+265 999 541 300", email="marketing@ptc.mw", address="Blantyre CBD"),
    ]
    db.session.add_all(clients)
    db.session.flush()

    # Vendor.balance was removed (see dev-log.md) — unpaid amounts are sourced
    # entirely from Expense rows via Expense.vendor_id in Payables/Expenses.
    vendors = [
        Vendor(name="Paperline Supplies", category="Paper & card stock", phone="+265 999 300 410", status="current"),
        Vendor(name="InkPro Malawi", category="Large format ink", phone="+265 888 900 111", status="current"),
        Vendor(name="FlexMaster Media", category="Banner vinyl", phone="+265 999 502 878", status="current"),
        Vendor(name="SignFit Installations", category="Mounting & installation", phone="+265 888 141 511", status="watch"),
    ]
    db.session.add_all(vendors)
    db.session.flush()
    vendor_by_name = {vendor.name: vendor for vendor in vendors}

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

    # ── JOBS: ~4–6 per month Jan 2025 → today ──────────────────────────────
    job_templates = [
        {"title": "Event posters and stage backdrop", "machine_ref": "MCH-LF-01", "category": "Large Format", "pages": 1, "copies": 250},
        {"title": "Retail shelf stickers and freezer decals", "machine_ref": "MCH-LF-01", "category": "Large Format", "pages": 4, "copies": 1800},
        {"title": "Loan campaign flyers", "machine_ref": "MCH-KM-01", "category": "Digital Print", "pages": 2, "copies": 5000},
        {"title": "Window frosting and boutique branding", "machine_ref": "MCH-LF-01", "category": "Large Format", "pages": 1, "copies": 12},
        {"title": "Site safety signage and UV DTF key holders", "machine_ref": "MCH-UVDTF-01", "category": "UV DTF", "pages": 1, "copies": 30},
        {"title": "Corporate branded T-shirts", "machine_ref": "MCH-DTF-01", "category": "DTF Apparel", "pages": 1, "copies": 100},
        {"title": "Annual report booklets", "machine_ref": "MCH-KM-01", "category": "Digital Print", "pages": 48, "copies": 300},
        {"title": "Promotional mugs for AGM", "machine_ref": "MCH-SUB-01", "category": "Sublimation", "pages": 1, "copies": 150},
        {"title": "Billboard vinyl wrap", "machine_ref": "MCH-LF-01", "category": "Large Format", "pages": 1, "copies": 1},
        {"title": "Branded caps for staff", "machine_ref": "MCH-DTF-01", "category": "DTF Apparel", "pages": 1, "copies": 80},
        {"title": "Sublimation plates for awards", "machine_ref": "MCH-SUB-01", "category": "Sublimation", "pages": 1, "copies": 50},
        {"title": "UV DTF pen branding for event", "machine_ref": "MCH-UVDTF-01", "category": "UV DTF", "pages": 1, "copies": 200},
        {"title": "Conference ID card lanyards", "machine_ref": "MCH-LF-01", "category": "Large Format", "pages": 1, "copies": 400},
        {"title": "DTF diary covers for staff", "machine_ref": "MCH-DTF-01", "category": "DTF Apparel", "pages": 1, "copies": 120},
        {"title": "Booklet binding for academic papers", "machine_ref": "MCH-BIND-01", "category": "Finishing", "pages": 80, "copies": 60},
        {"title": "Contra vision window graphics", "machine_ref": "MCH-LF-01", "category": "Large Format", "pages": 1, "copies": 8},
        {"title": "A4 colour brochures", "machine_ref": "MCH-KM-01", "category": "Digital Print", "pages": 4, "copies": 2000},
        {"title": "UV DTF key holders for promo", "machine_ref": "MCH-UVDTF-01", "category": "UV DTF", "pages": 1, "copies": 500},
        {"title": "Branded hoodies for sports team", "machine_ref": "MCH-DTF-01", "category": "DTF Apparel", "pages": 1, "copies": 60},
        {"title": "A5 black and white exam papers", "machine_ref": "MCH-KM-01", "category": "Digital Print", "pages": 8, "copies": 3000},
    ]

    statuses_historical = ["completed", "completed", "completed", "ready", "cancelled"]
    priorities = ["high", "medium", "medium", "low"]
    actors = ["Wayne", "Production", "Accounts", "Design Lead", "Field Team", "Print Room"]

    jobs = []
    job_counter = 1001
    current = start_date
    while current <= today:
        month_end = (current.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
        month_end = min(month_end, today)
        jobs_this_month = random.randint(4, 6)
        used_days = spread_days(current, month_end, jobs_this_month, force_first=current == start_date)
        for day_offset in used_days:
            job_date = current + timedelta(days=day_offset)
            if job_date > today:
                break
            tmpl = random.choice(job_templates)
            client = random.choice(clients)
            is_recent = (today - job_date).days <= 14
            if is_recent:
                status = random.choice(["queued", "printing", "finishing", "ready", "completed"])
                progress = {"queued": 10, "printing": random.randint(30, 70), "finishing": random.randint(75, 90), "ready": 100, "completed": 100}[status]
            else:
                status = random.choice(statuses_historical)
                progress = 100
            job = Job(
                job_ref=f"JOB-{job_counter}",
                client_id=client.id,
                client_name=client.name,
                title=tmpl["title"],
                machine_id=machine_by_ref[tmpl["machine_ref"]].id,
                service_category=tmpl["category"],
                status=status,
                priority=random.choice(priorities),
                pages=tmpl["pages"],
                copies=tmpl["copies"],
                progress=progress,
                due_date=job_date + timedelta(days=random.randint(2, 10)),
                notes="",
            )
            job.created_at = as_datetime(job_date)
            job.updated_at = as_datetime(min(job_date + timedelta(days=random.randint(1, 8)), today))
            jobs.append(job)
            job_counter += 1
        next_month = (current.replace(day=28) + timedelta(days=4)).replace(day=1)
        current = next_month

    db.session.add_all(jobs)

    # ── INVOICES: ~3–5 per month Jan 2025 → today ──────────────────────────
    invoice_line_pools = [
        [
            {"description": "A4 full-colour event posters", "product_type": "Digital Print", "machine_id": machine_by_ref["MCH-KM-01"].id, "pricing_item_id": pricing_by_code["KM-A4-COLOR"].id, "quantity": 250, "unit": "prints", "unit_price": 1850},
            {"description": "Stage backdrop banner 3m x 2m", "product_type": "Large Format", "machine_id": machine_by_ref["MCH-LF-01"].id, "pricing_item_id": pricing_by_code["LF-BANNER-SQM"].id, "quantity": 1, "unit": "banner", "unit_price": 315000},
        ],
        [
            {"description": "Waterproof product stickers", "product_type": "Large Format", "machine_id": machine_by_ref["MCH-LF-01"].id, "pricing_item_id": pricing_by_code["LF-STICKER-SQM"].id, "quantity": 1800, "unit": "stickers", "unit_price": 320},
            {"description": "Freezer vinyl decals", "product_type": "Large Format", "machine_id": machine_by_ref["MCH-LF-01"].id, "quantity": 24, "unit": "decals", "unit_price": 9500},
        ],
        [
            {"description": "A5 double-sided campaign flyers", "product_type": "Digital Print", "machine_id": machine_by_ref["MCH-KM-01"].id, "pricing_item_id": pricing_by_code["KM-FLYER-A5"].id, "quantity": 5000, "unit": "flyers", "unit_price": 210},
            {"description": "Layout and copy cleanup", "product_type": "Design & Prepress", "quantity": 1, "unit": "service", "unit_price": 55000},
        ],
        [
            {"description": "Frosted window vinyl panels", "product_type": "Large Format", "machine_id": machine_by_ref["MCH-LF-01"].id, "pricing_item_id": pricing_by_code["LF-FROST-SQM"].id, "quantity": 12, "unit": "panels", "unit_price": 28000},
            {"description": "On-site installation", "product_type": "Installation", "quantity": 1, "unit": "service", "unit_price": 120000},
        ],
        [
            {"description": "Branded DTF T-shirts", "product_type": "DTF Apparel", "machine_id": machine_by_ref["MCH-DTF-01"].id, "pricing_item_id": pricing_by_code["DTF-TSHIRT-A4"].id, "quantity": 100, "unit": "prints", "unit_price": 8500},
        ],
        [
            {"description": "Sublimation mugs for AGM", "product_type": "Sublimation", "machine_id": machine_by_ref["MCH-SUB-01"].id, "pricing_item_id": pricing_by_code["SUB-MUG"].id, "quantity": 150, "unit": "mugs", "unit_price": 7500},
        ],
        [
            {"description": "DTF branded caps", "product_type": "DTF Apparel", "machine_id": machine_by_ref["MCH-DTF-01"].id, "pricing_item_id": pricing_by_code["DTF-CAP"].id, "quantity": 80, "unit": "caps", "unit_price": 6500},
            {"description": "Artwork and layout", "product_type": "Design & Prepress", "quantity": 1, "unit": "service", "unit_price": 35000},
        ],
        [
            {"description": "UV DTF pen branding", "product_type": "UV DTF", "machine_id": machine_by_ref["MCH-UVDTF-01"].id, "pricing_item_id": pricing_by_code["UVDTF-PEN"].id, "quantity": 200, "unit": "pens", "unit_price": 1800},
            {"description": "UV DTF key holders", "product_type": "UV DTF", "machine_id": machine_by_ref["MCH-UVDTF-01"].id, "pricing_item_id": pricing_by_code["UVDTF-KEY"].id, "quantity": 500, "unit": "key holders", "unit_price": 2500},
        ],
        [
            {"description": "Annual report booklets", "product_type": "Digital Print", "machine_id": machine_by_ref["MCH-KM-01"].id, "pricing_item_id": pricing_by_code["KM-A4-COLOR"].id, "quantity": 300, "unit": "booklets", "unit_price": 4500},
            {"description": "Book binding", "product_type": "Finishing", "machine_id": machine_by_ref["MCH-BIND-01"].id, "pricing_item_id": pricing_by_code["FIN-BIND"].id, "quantity": 300, "unit": "books", "unit_price": 3500},
        ],
        [
            {"description": "PVC banner prints", "product_type": "Large Format", "machine_id": machine_by_ref["MCH-LF-01"].id, "pricing_item_id": pricing_by_code["LF-BANNER-SQM"].id, "quantity": 6, "unit": "banners", "unit_price": 18000},
        ],
        [
            {"description": "A4 BW exam papers", "product_type": "Digital Print", "machine_id": machine_by_ref["MCH-KM-01"].id, "pricing_item_id": pricing_by_code["KM-A4-BW"].id, "quantity": 3000, "unit": "pages", "unit_price": 150},
        ],
        [
            {"description": "Sublimation award plates", "product_type": "Sublimation", "machine_id": machine_by_ref["MCH-SUB-01"].id, "pricing_item_id": pricing_by_code["SUB-PLATE"].id, "quantity": 50, "unit": "plates", "unit_price": 9500},
        ],
    ]

    invoice_titles = [
        "Event launch print package", "Sticker and decal rollout", "Campaign flyer batch",
        "Window branding package", "Corporate apparel order", "AGM merchandise package",
        "Staff branded caps order", "Promotional gifts package", "Annual report print run",
        "Branch signage rollout", "Exam paper bulk print", "Awards sublimation package",
        "Quarterly stationery order", "Conference branding package", "Brand refresh print run",
    ]

    payment_methods = ["mobile_money", "bank_transfer", "cash"]
    payment_receivers = ["Accounts", "Wayne", "Front Desk"]

    invoices = []
    inv_counter = 5001
    current = start_date
    while current <= today:
        month_end = (current.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
        month_end = min(month_end, today)
        invoices_this_month = random.randint(3, 5)
        used_days = spread_days(current, month_end, invoices_this_month, force_first=current == start_date)
        for day_offset in used_days:
            issued_on = current + timedelta(days=day_offset)
            if issued_on > today:
                break
            due_on = issued_on + timedelta(days=14)
            client = random.choice(clients)
            line_items = random.choice(invoice_line_pools)
            days_since_due = (today - due_on).days

            if due_on > today:
                status = random.choice(["draft", "sent"])
            elif days_since_due <= 30:
                status = random.choice(["paid", "paid", "sent", "overdue"])
            else:
                status = random.choice(["paid", "paid", "overdue"])

            paid_on = None
            payments = []
            if status == "paid":
                paid_on = due_on - timedelta(days=random.randint(0, 5))
                total_estimate = sum(li["unit_price"] * li["quantity"] for li in line_items)
                payments = [{"amount": total_estimate, "method": random.choice(payment_methods), "paid_on": paid_on, "received_by": random.choice(payment_receivers)}]
            elif status == "sent" and due_on > today - timedelta(days=7):
                total_estimate = sum(li["unit_price"] * li["quantity"] for li in line_items)
                deposit = round(total_estimate * 0.5 / 1000) * 1000
                payments = [{"amount": deposit, "method": random.choice(payment_methods), "paid_on": issued_on + timedelta(days=2), "received_by": random.choice(payment_receivers)}]

            invoice = Invoice(
                invoice_ref=f"INV-{inv_counter}",
                client_id=client.id,
                client_name=client.name,
                title=random.choice(invoice_titles),
                status=status,
                tax_rate=0,
                currency="MWK",
                issued_on=issued_on,
                due_on=due_on,
                paid_on=paid_on,
                payment_terms="14 days",
                notes="Thank you for choosing T-Tech for your print production.",
            )
            apply_line_items(invoice, line_items)
            apply_payments(invoice, payments)
            invoice_job = Job(
                job_ref=f"JOB-INV-{inv_counter}",
                client_id=client.id,
                client_name=client.name,
                title=invoice.title,
                service_category="Backfilled Invoice Job",
                status="finished",
                priority="medium",
                progress=100,
                due_date=due_on,
                notes="Synthetic job created from invoice seed data.",
            )
            invoice_job.created_at = as_datetime(issued_on)
            invoice_job.updated_at = as_datetime(paid_on or min(due_on, today))
            invoice.job = invoice_job
            for payment in invoice.payments:
                payment.job = invoice_job
            sync_invoice_amount(invoice)
            invoice.created_at = as_datetime(issued_on)
            invoice.updated_at = as_datetime(paid_on or min(due_on, today))
            for item in invoice.line_items:
                item.created_at = as_datetime(issued_on)
                item.updated_at = invoice.updated_at
            for payment in invoice.payments:
                payment.created_at = as_datetime(payment.paid_on)
                payment.updated_at = as_datetime(payment.paid_on)
            invoices.append(invoice)
            inv_counter += 1
        next_month = (current.replace(day=28) + timedelta(days=4)).replace(day=1)
        current = next_month

    db.session.add_all(invoices)

    # ── EXPENSES: ~3–5 per month Jan 2025 → today ──────────────────────────
    # vendor_name maps each template to one of the 4 seeded Vendor rows by category fit
    # (Paperline Supplies = paper/card stock; InkPro Malawi = ink/consumables; FlexMaster
    # Media = banner vinyl; SignFit Installations = mounting/installation labour). Templates
    # with no natural vendor fit (utilities, fuel reimbursement, in-house maintenance/technician
    # work) legitimately omit vendor_name — not every expense should be forced onto a vendor.
    expense_templates = [
        {"category": "Materials", "title": "SRA3 card stock and matte laminate", "amount_range": (280000, 450000), "submitted_by": "Production", "vendor_name": "Paperline Supplies"},
        {"category": "Ink & Consumables", "title": "CMYK large-format ink set", "amount_range": (500000, 750000), "submitted_by": "Print Room", "vendor_name": "InkPro Malawi"},
        {"category": "Installation", "title": "Window branding installation labour", "amount_range": (70000, 130000), "submitted_by": "Field Team", "vendor_name": "SignFit Installations"},
        {"category": "Maintenance", "title": "Plotter blade and service kit", "amount_range": (120000, 220000), "submitted_by": "Technician"},
        {"category": "Materials", "title": "PVC banner vinyl roll", "amount_range": (300000, 600000), "submitted_by": "Production", "vendor_name": "FlexMaster Media"},
        {"category": "Ink & Consumables", "title": "DTF powder and transfer film", "amount_range": (180000, 350000), "submitted_by": "Print Room", "vendor_name": "InkPro Malawi"},
        {"category": "Utilities", "title": "Electricity prepaid token", "amount_range": (80000, 160000), "submitted_by": "Accounts"},
        {"category": "Transport", "title": "Delivery fuel reimbursement", "amount_range": (40000, 90000), "submitted_by": "Field Team"},
        {"category": "Materials", "title": "Sublimation mugs and blanks", "amount_range": (200000, 400000), "submitted_by": "Production", "vendor_name": "Paperline Supplies"},
        {"category": "Maintenance", "title": "Digital press drum unit replacement", "amount_range": (350000, 700000), "submitted_by": "Technician"},
        {"category": "Ink & Consumables", "title": "UV DTF ink and adhesive laminate", "amount_range": (250000, 500000), "submitted_by": "Print Room", "vendor_name": "InkPro Malawi"},
        {"category": "Transport", "title": "Site installation vehicle hire", "amount_range": (60000, 120000), "submitted_by": "Field Team", "vendor_name": "SignFit Installations"},
    ]
    expense_statuses = ["approved", "approved", "approved", "reimbursed", "pending"]

    expenses = []
    exp_counter = 2001
    current = start_date
    while current <= today:
        month_end = (current.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
        month_end = min(month_end, today)
        exps_this_month = random.randint(3, 5)
        used_days = spread_days(current, month_end, exps_this_month, force_first=current == start_date)
        for day_offset in used_days:
            exp_date = current + timedelta(days=day_offset)
            if exp_date > today:
                break
            tmpl = random.choice(expense_templates)
            amount = random.randint(*tmpl["amount_range"])
            amount = round(amount / 1000) * 1000
            expense = Expense(
                expense_ref=f"EXP-{exp_counter}",
                vendor_id=vendor_by_name[tmpl["vendor_name"]].id if tmpl.get("vendor_name") else None,
                category=tmpl["category"],
                title=tmpl["title"],
                amount=amount,
                expense_date=exp_date,
                status=random.choice(expense_statuses),
                submitted_by=tmpl["submitted_by"],
            )
            expense.created_at = as_datetime(exp_date)
            expense.updated_at = as_datetime(exp_date)
            expenses.append(expense)
            exp_counter += 1
        next_month = (current.replace(day=28) + timedelta(days=4)).replace(day=1)
        current = next_month

    db.session.add_all(expenses)

    # ── ADVANCES: ~1–2 per month Jan 2025 → today ──────────────────────────
    advance_templates = [
        {"recipient": "Field Team", "notes": "Transport and installation consumables."},
        {"recipient": "Design Lead", "notes": "Client proofing materials."},
        {"recipient": "Print Room", "notes": "Emergency ink and consumables purchase."},
        {"recipient": "Accounts", "notes": "Petty cash for office supplies."},
        {"recipient": "Production", "notes": "Materials procurement advance."},
        {"recipient": "Sales Rep", "notes": "Client visit fuel and transport."},
    ]

    advances = []
    adv_counter = 3001
    current = start_date
    while current <= today:
        month_end = (current.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
        month_end = min(month_end, today)
        adv_count = random.randint(1, 2)
        used_days = spread_days(current, month_end, adv_count, force_first=current == start_date)
        for day_offset in used_days:
            issued_on = current + timedelta(days=day_offset)
            if issued_on > today:
                break
            tmpl = random.choice(advance_templates)
            amount = round(random.randint(40000, 200000) / 5000) * 5000
            days_old = (today - issued_on).days
            if days_old > 21:
                status = random.choice(["settled", "settled", "open"])
                settled_on = issued_on + timedelta(days=random.randint(7, 21)) if status == "settled" else None
            else:
                status = "open"
                settled_on = None
            advance = Advance(
                advance_ref=f"ADV-{adv_counter}",
                recipient=tmpl["recipient"],
                amount=amount,
                status=status,
                issued_on=issued_on,
                settled_on=settled_on,
                notes=tmpl["notes"],
            )
            advance.created_at = as_datetime(issued_on)
            advance.updated_at = as_datetime(settled_on or issued_on)
            advances.append(advance)
            adv_counter += 1
        next_month = (current.replace(day=28) + timedelta(days=4)).replace(day=1)
        current = next_month

    db.session.add_all(advances)
    db.session.flush()

    # ── AUDIT LOGS ─────────────────────────────────────────────────────────
    audit_entries = [
        AuditLog(actor="system", action="Seeded professional print dashboard mock data", entity_type="system", created_at=as_datetime(start_date)),
    ]
    for inv in invoices:
        if inv.status == "paid":
            audit_entries.append(AuditLog(actor=random.choice(actors), action=f"Marked {inv.invoice_ref} as paid", entity_type="invoice", entity_id=inv.id, created_at=as_datetime(inv.paid_on) if inv.paid_on else inv.updated_at))
    for job in jobs:
        if job.status in ("finishing", "completed", "ready"):
            audit_entries.append(AuditLog(actor=random.choice(actors), action=f"Updated {job.job_ref} to {job.status}", entity_type="job", entity_id=job.id, created_at=job.updated_at))

    db.session.add_all(audit_entries)
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
        "advances": len(advances),
    }
