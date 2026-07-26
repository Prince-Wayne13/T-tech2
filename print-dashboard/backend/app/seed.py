# path: backend/app/seed.py

from datetime import date, datetime, time, timedelta
from decimal import Decimal
import random

from .extensions import db
from .models import (
    Advance,
    AuditLog,
    Client,
    Expense,
    ExpenseCategory,
    ExportJob,
    Invoice,
    Job,
    Material,
    MaterialTransaction,
    Payment,
    PettyCash,
    PricingItem,
    ProductionMachine,
    Proposal,
    ProposalLineItem,
    Sale,
    Staff,
    Vendor,
)
from .schema_migrations import ensure_default_capabilities_seed
from .services.invoices import apply_line_items, apply_payments, sync_invoice_amount
from .services.jobs import create_invoice_for_job
from .services.proposals import apply_proposal_line_items
from .services.sales import create_sale_for_job
from .services.petty_cash import record_petty_cash_entry


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
        for model in [ExportJob, AuditLog, PettyCash, Sale, Advance, Expense, ExpenseCategory, Payment, ProposalLineItem, Proposal, MaterialTransaction, Material, Invoice, Job, PricingItem, ProductionMachine, Vendor, Staff, Client]:
            db.session.query(model).delete()
        db.session.commit()

    if Client.query.first():
        return {"seeded": False, "message": "Mock data already exists."}

    today = date.today()
    start_date = date(2026, 4, 1)

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

    staff_members = [
        Staff(name="Vivienne", role="Production"),
        Staff(name="Victor", role="Production"),
        Staff(name="Adam", role="Production"),
        Staff(name="Chisomo", role="Production"),
        Staff(name="Galfken", role="Production"),
    ]
    db.session.add_all(staff_members)
    db.session.flush()

    machines = [
        ProductionMachine(machine_ref="MCH-DTF-01", name="DTF Print & Heat Press Line", category="DTF Apparel", capability="T-shirts, hoodies, caps, diaries and fabric transfers", image_path="/machines/dtf.svg", notes="Includes DTF printer, powdering/curing workflow and heat pressing machines."),
        ProductionMachine(machine_ref="MCH-LF-01", name="Large Format Printer", category="Large Format", capability="Banners, stickers, vinyl, contra vision and window frosting", image_path="/machines/large-format.svg"),
        ProductionMachine(machine_ref="MCH-KM-01", name="Konica Minolta Digital Press", category="Digital Print", capability="Documents, flyers, booklets, magazines and fast paper printing", image_path="/machines/digital-press.svg"),
        ProductionMachine(machine_ref="MCH-BIND-01", name="Book Binder & Cutter Line", category="Finishing", capability="Books, magazines, newspapers, trimming and binding", image_path="/machines/binder-cutter.svg"),
        ProductionMachine(machine_ref="MCH-SUB-01", name="Sublimation Station", category="Sublimation", capability="Mugs, cups, plates and coated gift items", image_path="/machines/sublimation.svg"),
        ProductionMachine(machine_ref="MCH-UVDTF-01", name="UV DTF Printer", category="UV DTF", capability="Pens, key holders, labels, hard-surface branding and gift items", image_path="/machines/uv-dtf.svg"),
        ProductionMachine(machine_ref="MCH-EMB-01", name="Embroidery Machine", category="Embroidery", capability="Fabric embroidery and branded apparel", status="active", image_path="/machines/embroidery.svg", notes="Activated: real embroidery pricing now available (logo, caps, front chest, cotton carrier bag, fishing jacket)."),
        ProductionMachine(machine_ref="MCH-SWT-01", name="Automatic Sweater Machine", category="Apparel", capability="Future sweater production automation", status="planned", image_path="/machines/sweater.svg", notes="Planned future machine."),
    ]
    db.session.add_all(machines)
    db.session.flush()

    # Priority 2 (Machine Management): reuse the same capability defaults
    # and category-based attachment used by schema_migrations.py's upgrade
    # path, rather than duplicating a second capability list here that could
    # drift out of sync with it.
    ensure_default_capabilities_seed()

    machine_by_ref = {machine.machine_ref: machine for machine in machines}
    # Prices below marked "price list" come directly from the physical T-Tech
    # price list the user photographed and provided (2026-07-25 session).
    # Where a price-list category didn't map cleanly to one of the 8 seeded
    # machines, the machine was chosen by the user's explicit instruction this
    # session ("guess which machines would be suited") — see dev-log.md for
    # the full mapping table and reasoning per item.
    pricing_items = [
        PricingItem(code="DTF-TSHIRT-A4", name="DTF T-shirt print A4 area", category="DTF Apparel", machine_id=machine_by_ref["MCH-DTF-01"].id, unit="print", price=8500, cost_estimate=3200),
        PricingItem(code="DTF-CAP", name="DTF cap branding", category="DTF Apparel", machine_id=machine_by_ref["MCH-DTF-01"].id, unit="cap", price=6500, cost_estimate=2500),
        PricingItem(code="DTF-DIARY", name="DTF diary branding", category="DTF Apparel", machine_id=machine_by_ref["MCH-DTF-01"].id, unit="diary", price=7500, cost_estimate=2800),
        PricingItem(code="DTF-TSHIRT-TINT", name="T-shirt tinting (inclusive)", category="DTF Apparel", machine_id=machine_by_ref["MCH-DTF-01"].id, unit="shirt", price=22000, cost_estimate=9500),
        PricingItem(code="LF-BANNER-SQM", name="PVC banner print", category="Large Format", machine_id=machine_by_ref["MCH-LF-01"].id, unit="sqm", price=18000, cost_estimate=7800),
        PricingItem(code="LF-STICKER-SQM", name="Vinyl sticker print", category="Large Format", machine_id=machine_by_ref["MCH-LF-01"].id, unit="sqm", price=22000, cost_estimate=9000),
        PricingItem(code="LF-FROST-SQM", name="Window frosting film", category="Large Format", machine_id=machine_by_ref["MCH-LF-01"].id, unit="sqm", price=28000, cost_estimate=12500),
        PricingItem(code="LF-CONTRA-SQM", name="Contra vision print", category="Large Format", machine_id=machine_by_ref["MCH-LF-01"].id, unit="sqm", price=30000, cost_estimate=14000),
        PricingItem(code="LF-ROLLUP", name="Roll-up banner (price list)", category="Large Format", machine_id=machine_by_ref["MCH-LF-01"].id, unit="banner", price=250000, cost_estimate=110000),
        PricingItem(code="LF-STICKER-A4", name="A4 vinyl stickers, per pack (price list)", category="Large Format", machine_id=machine_by_ref["MCH-LF-01"].id, unit="pack", price=4000, cost_estimate=1700),
        PricingItem(code="LF-STICKER-A5", name="A5 vinyl stickers, per pack (price list)", category="Large Format", machine_id=machine_by_ref["MCH-LF-01"].id, unit="pack", price=2500, cost_estimate=1050),
        PricingItem(code="LF-STICKER-A3", name="A3 vinyl stickers, per pack (price list)", category="Large Format", machine_id=machine_by_ref["MCH-LF-01"].id, unit="pack", price=7000, cost_estimate=3000),
        PricingItem(code="LF-FOAMBOARD", name="Foam board printing (price list)", category="Large Format", machine_id=machine_by_ref["MCH-LF-01"].id, unit="board", price=80000, cost_estimate=35000),
        PricingItem(code="LF-ALU-A1", name="A1 aluminium frame with print (price list)", category="Large Format", machine_id=machine_by_ref["MCH-LF-01"].id, unit="frame", price=85000, cost_estimate=38000),
        PricingItem(code="KM-A4-BW", name="A4 black and white document print", category="Digital Print", machine_id=machine_by_ref["MCH-KM-01"].id, unit="page", price=150, cost_estimate=55),
        PricingItem(code="KM-A4-COLOR", name="A4 colour document print", category="Digital Print", machine_id=machine_by_ref["MCH-KM-01"].id, unit="page", price=650, cost_estimate=260),
        PricingItem(code="KM-FLYER-A5", name="A5 flyer full colour", category="Digital Print", machine_id=machine_by_ref["MCH-KM-01"].id, unit="flyer", price=210, cost_estimate=95),
        PricingItem(code="KM-CARD-50", name="Business cards, 50/pack (price list)", category="Digital Print", machine_id=machine_by_ref["MCH-KM-01"].id, unit="pack", price=50000, cost_estimate=21000),
        PricingItem(code="KM-CARD-100", name="Business cards, 100/pack (price list)", category="Digital Print", machine_id=machine_by_ref["MCH-KM-01"].id, unit="pack", price=100000, cost_estimate=42000),
        PricingItem(code="KM-INVOICE-BOOK", name="Invoice book A5 (price list)", category="Digital Print", machine_id=machine_by_ref["MCH-KM-01"].id, unit="book", price=25000, cost_estimate=11000),
        PricingItem(code="KM-RECEIPT-BOOK", name="Receipt book A5 (price list)", category="Digital Print", machine_id=machine_by_ref["MCH-KM-01"].id, unit="book", price=25000, cost_estimate=11000),
        PricingItem(code="FIN-BIND", name="Book binding", category="Finishing", machine_id=machine_by_ref["MCH-BIND-01"].id, unit="book", price=3500, cost_estimate=1200),
        PricingItem(code="SUB-MUG", name="Sublimation mug print", category="Sublimation", machine_id=machine_by_ref["MCH-SUB-01"].id, unit="mug", price=7500, cost_estimate=3300),
        PricingItem(code="SUB-PLATE", name="Sublimation plate print", category="Sublimation", machine_id=machine_by_ref["MCH-SUB-01"].id, unit="plate", price=9500, cost_estimate=4300),
        PricingItem(code="SUB-MUG-NORMAL", name="Normal mug, min order 5 (price list)", category="Sublimation", machine_id=machine_by_ref["MCH-SUB-01"].id, unit="mug", price=11000, cost_estimate=4800),
        PricingItem(code="SUB-TRAVEL-JUG", name="Sublimation travelling jug (price list)", category="Sublimation", machine_id=machine_by_ref["MCH-SUB-01"].id, unit="jug", price=20000, cost_estimate=8800),
        PricingItem(code="UVDTF-PEN", name="UV DTF pen branding", category="UV DTF", machine_id=machine_by_ref["MCH-UVDTF-01"].id, unit="pen", price=1800, cost_estimate=650),
        PricingItem(code="UVDTF-KEY", name="UV DTF key holder branding", category="UV DTF", machine_id=machine_by_ref["MCH-UVDTF-01"].id, unit="key holder", price=2500, cost_estimate=900),
        PricingItem(code="UV-A5", name="UV printing A5, 21x29cm (price list)", category="UV DTF", machine_id=machine_by_ref["MCH-UVDTF-01"].id, unit="print", price=12500, cost_estimate=5500),
        PricingItem(code="UV-A3", name="UV printing A3, 29x42cm (price list)", category="UV DTF", machine_id=machine_by_ref["MCH-UVDTF-01"].id, unit="print", price=17000, cost_estimate=7500),
        PricingItem(code="UV-A1", name="UV printing A1, 59x84cm (price list)", category="UV DTF", machine_id=machine_by_ref["MCH-UVDTF-01"].id, unit="print", price=35000, cost_estimate=15500),
        PricingItem(code="EMB-LOGO", name="Embroidery logo, small (price list)", category="Embroidery", machine_id=machine_by_ref["MCH-EMB-01"].id, unit="logo", price=6000, cost_estimate=2500),
        PricingItem(code="EMB-CAP", name="Embroidery caps (price list)", category="Embroidery", machine_id=machine_by_ref["MCH-EMB-01"].id, unit="cap", price=5000, cost_estimate=2100),
        PricingItem(code="EMB-FRONT-CHEST", name="Embroidery front chest (price list)", category="Embroidery", machine_id=machine_by_ref["MCH-EMB-01"].id, unit="piece", price=8000, cost_estimate=3400),
        PricingItem(code="EMB-JACKET", name="Embroidery fishing jacket (price list)", category="Embroidery", machine_id=machine_by_ref["MCH-EMB-01"].id, unit="jacket", price=12000, cost_estimate=5200),
    ]
    db.session.add_all(pricing_items)
    db.session.flush()
    pricing_by_code = {item.code: item for item in pricing_items}

    # ── JOBS: ~10–16 per month Apr 2026 → today ─────────────────────────────
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
        jobs_this_month = random.randint(10, 16)
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
                # Fix (seed.py job-count bug, flagged 2026-07-26): total_count was
                # never set here, so it defaulted to 0 and Jobs.jsx's ProgressCell
                # (hasCounts = totalCount > 0) always fell back to the generic
                # progress-percent bar instead of showing "X of Y units" for any
                # seeded job from this block. tmpl["copies"] is already the natural
                # per-job unit count (same figure the invoice/job templates use
                # elsewhere), so it's reused here rather than inventing a new number.
                # completed_count is derived from progress% against that total so
                # the "X of Y" label and the bar fill stay visually consistent -
                # a "finishing" job at 82% progress shows ~82% of its units done,
                # not an arbitrary unrelated figure.
                total_count=tmpl["copies"],
                completed_count=round(tmpl["copies"] * progress / 100),
                due_date=job_date + timedelta(days=random.randint(2, 10)),
                assigned_staff_id=random.choice(staff_members).id,
                notes="",
            )
            job.created_at = as_datetime(job_date)
            job.updated_at = as_datetime(min(job_date + timedelta(days=random.randint(1, 8)), today))
            jobs.append(job)
            job_counter += 1
        next_month = (current.replace(day=28) + timedelta(days=4)).replace(day=1)
        current = next_month

    db.session.add_all(jobs)

    # ── INVOICES: ~8–13 per month Apr 2026 → today ──────────────────────────
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
    sales = []
    inv_counter = 5001
    current = start_date
    while current <= today:
        month_end = (current.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
        month_end = min(month_end, today)
        invoices_this_month = random.randint(8, 13)
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
                # Fix (seed.py job-count bug, flagged 2026-07-26): this job is
                # always fully finished (status="finished", progress=100), so
                # completed_count == total_count is the correct state, not two
                # unset zeros. total_count is summed from the same line_items
                # this invoice was just built from (the raw dict list, quantity
                # key), matching the unit count actually billed.
                total_count=sum(li["quantity"] for li in line_items),
                completed_count=sum(li["quantity"] for li in line_items),
                due_date=due_on,
                assigned_staff_id=random.choice(staff_members).id,
                notes="Synthetic job created from invoice seed data.",
            )
            invoice_job.created_at = as_datetime(issued_on)
            invoice_job.updated_at = as_datetime(paid_on or min(due_on, today))
            invoice.job = invoice_job
            db.session.add(invoice_job)
            db.session.flush()
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
            # Item 7 (backend priority list): one Sale per invoice-backed job,
            # amount derived (not hand-set) from the same payment/total split
            # invoice_totals() computes — create_sale_for_job() requires
            # invoice.job/payments to already be attached, which is why this
            # call sits after sync_invoice_amount() and the payment.job
            # assignment above, not before.
            sale = create_sale_for_job(invoice_job, description=invoice.title, notes="Seeded from invoice data.")
            db.session.add(sale)
            sale.created_at = invoice.created_at
            sale.updated_at = invoice.updated_at
            sales.append(sale)
            inv_counter += 1
        next_month = (current.replace(day=28) + timedelta(days=4)).replace(day=1)
        current = next_month

    db.session.add_all(invoices)

    # ── EXPENSES: ~8–12 per month Apr 2026 → today ──────────────────────────
    # vendor_name maps each template to one of the 4 seeded Vendor rows by category fit
    # (Paperline Supplies = paper/card stock; InkPro Malawi = ink/consumables; FlexMaster
    # Media = banner vinyl; SignFit Installations = mounting/installation labour). Templates
    # with no natural vendor fit (utilities, fuel reimbursement, in-house maintenance/technician
    # work) legitimately omit vendor_name — not every expense should be forced onto a vendor.
    # ExpenseCategory is an additive lookup table matched by name (see model
    # docstring) — Expense.category stays free text, this doesn't replace it.
    expense_categories = [
        ExpenseCategory(name="Materials", vendor_related=True, notes="Paper, card stock, banner vinyl, sublimation blanks."),
        ExpenseCategory(name="Ink & Consumables", vendor_related=True, notes="Ink sets, DTF powder/film, UV adhesive laminate."),
        ExpenseCategory(name="Installation", vendor_related=True, notes="On-site mounting and branding installation labour."),
        ExpenseCategory(name="Maintenance", vendor_related=False, notes="In-house technician work, service kits, drum units."),
        ExpenseCategory(name="Utilities", vendor_related=False, notes="Electricity, water, prepaid tokens."),
        ExpenseCategory(name="Transport", vendor_related=False, notes="Fuel reimbursement, vehicle hire."),
        ExpenseCategory(name="Petty Cash", vendor_related=False, notes="Mirrored expenses generated by PettyCash top-ups and cash-in-hand spend."),
    ]
    db.session.add_all(expense_categories)
    db.session.flush()

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
    # 'paid' added alongside the existing statuses (2026-07-26): previously
    # absent from this list entirely, meaning no seeded expense ever had
    # status='paid' or a paid_on date - the Cash Flow report's expenses_by_month
    # (services/reports.py, keyed off Expense.paid_on) had nothing to read for
    # expenses, ever, regardless of which month was selected. 'reimbursed' also
    # never got a paid_on here despite representing real cash paid out - fixed
    # below alongside 'paid', both using the same date-after-expense-date
    # pattern already used for invoice payments elsewhere in this file.
    expense_statuses = ["approved", "paid", "paid", "reimbursed", "pending"]

    expenses = []
    exp_counter = 2001
    current = start_date
    while current <= today:
        month_end = (current.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
        month_end = min(month_end, today)
        exps_this_month = random.randint(8, 12)
        used_days = spread_days(current, month_end, exps_this_month, force_first=current == start_date)
        for day_offset in used_days:
            exp_date = current + timedelta(days=day_offset)
            if exp_date > today:
                break
            tmpl = random.choice(expense_templates)
            amount = random.randint(*tmpl["amount_range"])
            amount = round(amount / 1000) * 1000
            status = random.choice(expense_statuses)
            # paid_on only makes sense once money has actually moved - approved
            # (not yet paid) and pending/rejected correctly get no paid_on,
            # same "paid_on is the source of truth for cash movement" rule the
            # Cash Flow report itself already relies on (see reports.py).
            paid_on = None
            if status in ("paid", "reimbursed"):
                paid_on = min(exp_date + timedelta(days=random.randint(1, 10)), today)
            expense = Expense(
                expense_ref=f"EXP-{exp_counter}",
                vendor_id=vendor_by_name[tmpl["vendor_name"]].id if tmpl.get("vendor_name") else None,
                category=tmpl["category"],
                title=tmpl["title"],
                amount=amount,
                expense_date=exp_date,
                paid_on=paid_on,
                status=status,
                submitted_by=tmpl["submitted_by"],
            )
            expense.created_at = as_datetime(exp_date)
            expense.updated_at = as_datetime(paid_on or exp_date)
            expenses.append(expense)
            exp_counter += 1
        next_month = (current.replace(day=28) + timedelta(days=4)).replace(day=1)
        current = next_month

    db.session.add_all(expenses)
    db.session.flush()

    # ── PETTY CASH: ~2 top-ups + ~2 staff spends per month, via the real
    # record_petty_cash_entry() helper (services/petty_cash.py) rather than
    # hand-built PettyCash/Expense rows — this keeps the mirrored-Expense
    # side effect correct (top_up and sales_cash_used both create a linked
    # Expense row in the real code, despite the model docstring's older
    # claim that top_up doesn't; the code, not the docstring, is what
    # petty_cash_balance() actually relies on, so seeding follows the code).
    petty_cash_entries = []
    current = start_date
    while current <= today:
        month_end = (current.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
        month_end = min(month_end, today)
        pc_count = random.randint(3, 5)
        used_days = spread_days(current, month_end, pc_count, force_first=current == start_date)
        for i, day_offset in enumerate(used_days):
            pc_date = current + timedelta(days=day_offset)
            if pc_date > today:
                break
            staff_member = random.choice(staff_members)
            if i % 2 == 0:
                entry = record_petty_cash_entry(
                    "top_up",
                    round(random.randint(50000, 150000) / 5000) * 5000,
                    staff_id=staff_member.id,
                    notes="Monthly petty cash top-up.",
                    submitted_by="Accounts",
                    expense_date=pc_date,
                )
            else:
                entry = record_petty_cash_entry(
                    "staff_expense",
                    round(random.randint(5000, 40000) / 1000) * 1000,
                    staff_id=staff_member.id,
                    notes=random.choice([
                        "Airtime and data for client follow-ups.",
                        "Tea and office refreshments.",
                        "Small tools and stationery top-up.",
                        "Bike taxi fare for urgent delivery.",
                    ]),
                    submitted_by=staff_member.name,
                    expense_date=pc_date,
                )
            entry.created_at = as_datetime(pc_date)
            entry.updated_at = as_datetime(pc_date)
            petty_cash_entries.append(entry)
        next_month = (current.replace(day=28) + timedelta(days=4)).replace(day=1)
        current = next_month

    # ── ADVANCES: ~3–5 per month Apr 2026 → today ───────────────────────────
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
        adv_count = random.randint(3, 5)
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

    # ── PROPOSALS: draft/sent/accepted/declined, mirroring the real
    # accept_proposal() conversion flow (routes/proposals.py) for accepted
    # ones rather than hand-setting converted_invoice_id, so the
    # uselist=False one-to-one Invoice.source_proposal relationship (see
    # dev-log.md incident notes) is exercised the same way production does.
    proposal_line_pools = [
        [
            {"description": "Corporate rebrand: business cards", "quantity": 500, "unit": "cards", "unit_price": 500},
            {"description": "Letterhead and envelope design", "quantity": 1, "unit": "service", "unit_price": 65000},
        ],
        [
            {"description": "Product launch banners x3", "quantity": 3, "unit": "banners", "unit_price": 250000},
            {"description": "A4 flyers for launch event", "quantity": 2000, "unit": "flyers", "unit_price": 210},
        ],
        [
            {"description": "Branded staff uniforms (embroidered)", "quantity": 40, "unit": "pieces", "unit_price": 8000},
        ],
        [
            {"description": "Annual report design and print", "quantity": 250, "unit": "booklets", "unit_price": 4800},
        ],
        [
            {"description": "Trade show gift mugs and pens", "quantity": 200, "unit": "sets", "unit_price": 9200},
        ],
        [
            {"description": "Window frosting for new branch", "quantity": 18, "unit": "panels", "unit_price": 28000},
            {"description": "Site survey and installation", "quantity": 1, "unit": "service", "unit_price": 140000},
        ],
    ]
    proposal_titles = [
        "Corporate rebrand package", "Product launch print package", "Staff uniform branding",
        "Annual report design & print", "Trade show merchandise package", "Branch fit-out signage",
    ]
    proposal_statuses = ["draft", "sent", "sent", "accepted", "accepted", "declined"]

    proposals = []
    prop_counter = 1
    current = start_date
    while current <= today:
        month_end = (current.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
        month_end = min(month_end, today)
        prop_count = random.randint(2, 4)
        used_days = spread_days(current, month_end, prop_count, force_first=current == start_date)
        for day_offset in used_days:
            issued_on = current + timedelta(days=day_offset)
            if issued_on > today:
                break
            client = random.choice(clients)
            line_items = random.choice(proposal_line_pools)
            status = random.choice(proposal_statuses)
            valid_until = issued_on + timedelta(days=random.randint(14, 30))
            staff_member = random.choice(staff_members)

            proposal = Proposal(
                proposal_ref=f"PROP-{prop_counter:04d}",
                client_id=client.id,
                client_name=client.name,
                title=random.choice(proposal_titles),
                status=status if status != "accepted" else "draft",  # set to accepted only after conversion below, matching accept_proposal()'s own ordering
                currency="MWK",
                valid_until=valid_until,
                contact=client.phone,
                priority=random.choice(priorities),
                assigned_staff_id=staff_member.id,
                prepared_by=staff_member.name,
                notes="Prices valid for the period stated above. 50% deposit required to commence production.",
            )
            apply_proposal_line_items(proposal, line_items)
            proposal.created_at = as_datetime(issued_on)
            proposal.updated_at = as_datetime(issued_on)
            for item in proposal.line_items:
                item.created_at = as_datetime(issued_on)
                item.updated_at = as_datetime(issued_on)
            db.session.add(proposal)
            db.session.flush()

            if status == "accepted":
                converted_job = Job(
                    job_ref=f"JOB-PROP-{prop_counter}",
                    client_id=proposal.client_id,
                    client_name=proposal.client_name,
                    title=proposal.title,
                    status="completed",
                    priority=proposal.priority,
                    progress=100,
                    total_count=len(proposal.line_items),
                    # Fix (seed.py job-count bug, flagged 2026-07-26): total_count
                    # was already set here (matching accept_proposal()'s own
                    # line-item-count convention in routes/proposals.py - not
                    # changed to a unit-quantity sum, to stay consistent with the
                    # real accept flow's behavior), but completed_count was never
                    # set, so a "completed" job was showing "0 of N" instead of
                    # "N of N". status="completed"/progress=100 means fully done.
                    completed_count=len(proposal.line_items),
                    due_date=proposal.valid_until,
                    assigned_staff_id=proposal.assigned_staff_id,
                    notes=proposal.notes,
                )
                converted_invoice = create_invoice_for_job(
                    converted_job,
                    f"INV-PROP-{prop_counter}",
                    [
                        {"description": item.description, "quantity": float(item.quantity), "unit": item.unit, "unit_price": float(item.unit_price)}
                        for item in proposal.line_items
                    ],
                    discount_amount=proposal.discount_amount,
                    currency=proposal.currency,
                    notes=proposal.notes,
                )
                # create_invoice_for_job() hardcodes issued_on=date.today() (real
                # "today" at call time) since in production a proposal is accepted
                # whenever a user clicks the button — there's no historical date to
                # use. For seeding, that would bunch every converted invoice on the
                # actual seed-run date instead of spreading across the window, so
                # it's overridden here to a date shortly after the proposal was
                # issued instead, matching how the rest of this file backdates data.
                converted_paid_on = valid_until + timedelta(days=random.randint(1, 5)) if valid_until + timedelta(days=random.randint(1, 5)) <= today else None
                converted_issued = min(valid_until, today)
                converted_invoice.issued_on = converted_issued
                converted_invoice.due_on = converted_issued + timedelta(days=14)
                converted_job.created_at = as_datetime(converted_issued)
                converted_job.updated_at = as_datetime(converted_paid_on or converted_issued)
                converted_invoice.created_at = as_datetime(converted_issued)
                converted_invoice.updated_at = as_datetime(converted_paid_on or converted_issued)
                if converted_paid_on:
                    apply_payments(converted_invoice, [{"amount": float(sum(i.amount for i in proposal.line_items) - proposal.discount_amount), "method": random.choice(payment_methods), "paid_on": converted_paid_on, "received_by": random.choice(payment_receivers)}])
                    sync_invoice_amount(converted_invoice)
                    for payment in converted_invoice.payments:
                        payment.job = converted_job
                        payment.created_at = as_datetime(converted_paid_on)
                        payment.updated_at = as_datetime(converted_paid_on)
                db.session.add(converted_job)
                db.session.add(converted_invoice)
                db.session.flush()
                proposal.status = "accepted"
                proposal.converted_invoice_id = converted_invoice.id
                converted_sale = create_sale_for_job(converted_job, description=proposal.title, notes="Seeded from accepted-proposal conversion.")
                db.session.add(converted_sale)
                converted_sale.created_at = converted_invoice.created_at
                converted_sale.updated_at = converted_invoice.updated_at
                sales.append(converted_sale)
            else:
                proposal.status = status

            proposals.append(proposal)
            prop_counter += 1
        next_month = (current.replace(day=28) + timedelta(days=4)).replace(day=1)
        current = next_month

    # (sales are added to the session individually at creation time above,
    # both in the invoice loop and in the accepted-proposal conversion block)

    # ── LOYAL CLIENT, BIG ORDER, REAL DISCOUNT ──────────────────────────────
    # Nyasa Fresh Foods appears repeatedly across the seeded invoice pool above
    # (chosen at random per invoice like every other client) — this adds one
    # additional, clearly-oversized invoice for them with a substantial
    # discount_amount, so the "loyal client gets a deal" case the user asked
    # to see is unambiguous in the UI rather than something you have to
    # infer from a pattern across many rows.
    loyal_client = next(c for c in clients if c.name == "Nyasa Fresh Foods")
    loyal_issued_on = today - timedelta(days=6)
    loyal_due_on = loyal_issued_on + timedelta(days=14)
    loyal_line_items = [
        {"description": "Branded retail shelf stickers, full store rollout", "product_type": "Large Format", "machine_id": machine_by_ref["MCH-LF-01"].id, "pricing_item_id": pricing_by_code["LF-STICKER-SQM"].id, "quantity": 60, "unit": "sqm", "unit_price": 22000},
        {"description": "Freezer and cold-room decals, all branches", "product_type": "Large Format", "machine_id": machine_by_ref["MCH-LF-01"].id, "quantity": 48, "unit": "decals", "unit_price": 9500},
        {"description": "Promotional rollup banners x6", "product_type": "Large Format", "machine_id": machine_by_ref["MCH-LF-01"].id, "pricing_item_id": pricing_by_code["LF-ROLLUP"].id, "quantity": 6, "unit": "banners", "unit_price": 250000},
        {"description": "Staff branded caps (embroidered)", "product_type": "Embroidery", "machine_id": machine_by_ref["MCH-EMB-01"].id, "pricing_item_id": pricing_by_code["EMB-CAP"].id, "quantity": 60, "unit": "caps", "unit_price": 5000},
    ]
    loyal_subtotal = sum(li["unit_price"] * li["quantity"] for li in loyal_line_items)
    loyal_discount = round(loyal_subtotal * 0.12 / 1000) * 1000  # 12% loyalty discount, rounded to a clean thousand
    loyal_invoice = Invoice(
        invoice_ref="INV-LOYAL-0001",
        client_id=loyal_client.id,
        client_name=loyal_client.name,
        title="Full-store rebrand rollout — loyalty pricing",
        status="paid",
        discount_amount=loyal_discount,
        tax_rate=0,
        currency="MWK",
        issued_on=loyal_issued_on,
        due_on=loyal_due_on,
        payment_terms="14 days",
        notes=f"Loyal client (repeat orders since {start_date.strftime('%B %Y')}). 12% loyalty discount applied to full-store rollout.",
    )
    apply_line_items(loyal_invoice, loyal_line_items)
    loyal_job = Job(
        job_ref="JOB-LOYAL-0001",
        client_id=loyal_client.id,
        client_name=loyal_client.name,
        title=loyal_invoice.title,
        service_category="Backfilled Invoice Job",
        status="finished",
        priority="high",
        progress=100,
        # Fix (seed.py job-count bug, flagged 2026-07-26): same pattern as the
        # other invoice-backed "finished" job above - fully done, so
        # completed_count == total_count, summed from loyal_line_items'
        # quantity key rather than left at the unset default of 0/0.
        total_count=sum(li["quantity"] for li in loyal_line_items),
        completed_count=sum(li["quantity"] for li in loyal_line_items),
        due_date=loyal_due_on,
        assigned_staff_id=staff_members[0].id,
        notes="Full-store rollout for a repeat client — see invoice notes for loyalty discount.",
    )
    loyal_invoice.job = loyal_job
    loyal_paid_on = loyal_issued_on + timedelta(days=3)
    apply_payments(loyal_invoice, [{"amount": float(loyal_subtotal - loyal_discount), "method": "bank_transfer", "paid_on": loyal_paid_on, "received_by": "Accounts"}])
    for payment in loyal_invoice.payments:
        payment.job = loyal_job
        payment.created_at = as_datetime(loyal_paid_on)
        payment.updated_at = as_datetime(loyal_paid_on)
    sync_invoice_amount(loyal_invoice)
    loyal_job.created_at = as_datetime(loyal_issued_on)
    loyal_job.updated_at = as_datetime(loyal_paid_on)
    loyal_invoice.created_at = as_datetime(loyal_issued_on)
    loyal_invoice.updated_at = as_datetime(loyal_paid_on)
    for item in loyal_invoice.line_items:
        item.created_at = as_datetime(loyal_issued_on)
        item.updated_at = as_datetime(loyal_paid_on)
    db.session.add(loyal_job)
    db.session.add(loyal_invoice)
    db.session.flush()
    loyal_sale = create_sale_for_job(loyal_job, description=loyal_invoice.title, notes="Loyalty-discount rollout order.")
    loyal_sale.created_at = loyal_invoice.created_at
    loyal_sale.updated_at = loyal_invoice.updated_at
    db.session.add(loyal_sale)
    invoices.append(loyal_invoice)
    jobs.append(loyal_job)
    sales.append(loyal_sale)

    # ── MATERIALS (periodic inventory ledger) ────────────────────────────────
    # Wayne's ask: "bought this much, used this much, made this much" per
    # material, reconciled month-end against a physical count. Material rows
    # are the stock items; MaterialTransaction rows are the ledger (purchase/
    # usage/adjustment/count) that material_stock_summary() and
    # build_materials_reconciliation() derive on_hand and consumption from -
    # see services/materials.py and services/reports.py for the math this
    # data is meant to exercise. Tied to the real seeded vendors/machines/jobs
    # above rather than invented in isolation, so Revenue Generated and the
    # per-job usage links in Materials.jsx actually resolve to something.
    materials = [
        Material(material_ref="MAT-0001", name="SRA3 Card Stock 300gsm", category="Paper & card stock", machine_id=machine_by_ref["MCH-KM-01"].id, vendor_id=vendor_by_name["Paperline Supplies"].id, unit="ream", unit_cost=18500, reorder_point=15, notes="250 sheets/ream, primary stock for business cards and flyers."),
        Material(material_ref="MAT-0002", name="PVC Banner Vinyl (13oz)", category="Banner vinyl", machine_id=machine_by_ref["MCH-LF-01"].id, vendor_id=vendor_by_name["FlexMaster Media"].id, unit="sqm", unit_cost=4200, reorder_point=40, notes="Standard outdoor banner stock."),
        Material(material_ref="MAT-0003", name="Self-Adhesive Vinyl - White Gloss", category="Large format ink", machine_id=machine_by_ref["MCH-LF-01"].id, vendor_id=vendor_by_name["FlexMaster Media"].id, unit="sqm", unit_cost=5800, reorder_point=30, notes="Stickers, contra vision backing, general cut vinyl."),
        Material(material_ref="MAT-0004", name="CMYK Large-Format Ink Set", category="Large format ink", machine_id=machine_by_ref["MCH-LF-01"].id, vendor_id=vendor_by_name["InkPro Malawi"].id, unit="L", unit_cost=32000, reorder_point=8, notes="4-colour set, shared across banner/sticker/frosting jobs."),
        Material(material_ref="MAT-0005", name="Sublimation Mug Blanks (11oz)", category="Paper & card stock", machine_id=machine_by_ref["MCH-SUB-01"].id, vendor_id=vendor_by_name["Paperline Supplies"].id, unit="unit", unit_cost=2600, reorder_point=50, notes="White ceramic, standard stock mug."),
        Material(material_ref="MAT-0006", name="DTF Powder", category="Large format ink", machine_id=machine_by_ref["MCH-DTF-01"].id, vendor_id=vendor_by_name["InkPro Malawi"].id, unit="kg", unit_cost=15500, reorder_point=5, notes="Hot-melt adhesive powder for DTF transfers."),
    ]
    db.session.add_all(materials)
    db.session.flush()
    material_by_ref = {material.material_ref: material for material in materials}

    # Jobs whose machine/category naturally consumes each material, so usage
    # rows link to a real Job (and therefore a real Invoice) rather than
    # floating unattributed - this is what lets "Revenue Generated" on the
    # Materials directory card resolve to a non-zero figure.
    jobs_by_machine_ref = {}
    for job in jobs:
        jobs_by_machine_ref.setdefault(job.machine_id, []).append(job)
    machine_ref_by_id = {machine.id: ref for ref, machine in machine_by_ref.items()}

    material_transactions = []

    def month_starts(from_date, to_date):
        cursor = date(from_date.year, from_date.month, 1)
        out = []
        while cursor <= to_date:
            out.append(cursor)
            nxt = (cursor.replace(day=28) + timedelta(days=4)).replace(day=1)
            cursor = nxt
        return out

    all_months = month_starts(start_date, today)
    current_month_start = date(today.year, today.month, 1)

    for material in materials:
        candidate_jobs = [job for job in jobs_by_machine_ref.get(material.machine_id, []) if job.status != "cancelled"]
        on_hand_running = Decimal("0")
        for i, m_start in enumerate(all_months):
            m_end = min((m_start.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1), today)
            is_current_month = m_start == current_month_start

            # Purchase early in the month - restock roughly what the month is
            # expected to consume plus a buffer, so on_hand stays positive and
            # "days remaining" projections are meaningful rather than trivially
            # zero.
            purchase_qty = Decimal(str(random.randint(40, 90))) if material.unit in ("sqm", "ream") else Decimal(str(random.randint(3, 10)))
            purchase_date = min(m_start + timedelta(days=random.randint(1, 4)), today)
            material_transactions.append(MaterialTransaction(
                material_id=material.id, transaction_type="purchase", quantity=purchase_qty,
                unit_cost=material.unit_cost, transaction_date=purchase_date,
                notes=f"Restock from {material.vendor.name}" if material.vendor else "Restock",
            ))
            on_hand_running += purchase_qty

            # Usage rows: one per candidate job that actually falls in this
            # month, each with an output_quantity/description - this is the
            # literal "from this much vinyl, made this much stickers" figure.
            month_jobs = [job for job in candidate_jobs if job.created_at and m_start <= job.created_at.date() <= m_end]
            for job in month_jobs[:4]:  # cap per month so on_hand doesn't run negative on a busy month
                usage_qty = Decimal(str(round(random.uniform(1.5, 6.0), 2))) if material.unit in ("sqm",) else Decimal(str(random.randint(1, 3))) if material.unit in ("ream", "kg", "L") else Decimal(str(random.randint(5, 20)))
                if usage_qty > on_hand_running:
                    continue
                output_qty = job.total_count or job.copies or 0
                job_machine_ref = machine_ref_by_id.get(job.machine_id)
                output_label = {
                    "MCH-LF-01": "sqm of banners produced" if material.category == "Banner vinyl" else "stickers/banners produced",
                    "MCH-KM-01": "cards/flyers produced",
                    "MCH-SUB-01": "mugs produced",
                    "MCH-DTF-01": "garments produced",
                }.get(job_machine_ref, "units produced")
                material_transactions.append(MaterialTransaction(
                    material_id=material.id, transaction_type="usage", quantity=usage_qty,
                    transaction_date=min(job.created_at.date() + timedelta(days=1), today),
                    job_id=job.id,
                    output_quantity=output_qty if output_qty else None,
                    output_description=output_label if output_qty else None,
                    notes=f"Used on {job.job_ref}",
                ))
                on_hand_running -= usage_qty

            # Occasional waste/spoilage adjustment (negative) - misprints,
            # cutting mistakes, damaged stock - roughly one every couple of
            # months, small relative to purchase volume so it reads as
            # realistic spoilage rather than dominating the ledger.
            if i % 3 == 1 and on_hand_running > 5:
                waste_qty = Decimal(str(round(random.uniform(0.5, 2.5), 2))) if material.unit == "sqm" else Decimal("1")
                material_transactions.append(MaterialTransaction(
                    material_id=material.id, transaction_type="adjustment", quantity=-waste_qty,
                    transaction_date=min(m_start + timedelta(days=random.randint(10, 20)), today),
                    notes="Spoilage - misprint/cutting waste",
                ))
                on_hand_running -= waste_qty

            # Month-end physical count for every month except the current one
            # (leaves this month genuinely "not yet counted", so the
            # Month-End Report's unreconciled-count flag has something real
            # to show rather than being permanently empty). Small deliberate
            # variance most months, so the reconciliation table has a
            # non-trivial count-variance case to display too, not just
            # perfect matches.
            if not is_current_month:
                variance = Decimal(str(random.choice([0, 0, 0, 1, -1, 2]))) if material.unit != "sqm" else Decimal(str(random.choice([0, 0, 0.5, -0.75, 1.2])))
                counted_qty = max(on_hand_running + variance, Decimal("0"))
                material_transactions.append(MaterialTransaction(
                    material_id=material.id, transaction_type="count", quantity=counted_qty,
                    transaction_date=m_end,
                    notes="Month-end physical count",
                ))

    for txn in material_transactions:
        txn.created_at = as_datetime(txn.transaction_date)
        txn.updated_at = as_datetime(txn.transaction_date)
    db.session.add_all(material_transactions)
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
        "proposals": len(proposals),
        "sales": len(sales),
        "petty_cash_entries": len(petty_cash_entries),
        "expense_categories": len(expense_categories),
        "materials": len(materials),
        "material_transactions": len(material_transactions),
    }