# path: backend/app/models.py

from datetime import date, datetime
from decimal import Decimal

from .extensions import db


class TimestampMixin:
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )


class SerializableMixin:
    def to_dict(self):
        data = {}
        for column in self.__table__.columns:
            value = getattr(self, column.name)
            if isinstance(value, (datetime, date)):
                value = value.isoformat()
            if isinstance(value, Decimal):
                value = float(value)
            data[column.name] = value
        return data


class Client(TimestampMixin, SerializableMixin, db.Model):
    __tablename__ = "clients"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), nullable=False, index=True)
    phone = db.Column(db.String(40))
    email = db.Column(db.String(160))
    address = db.Column(db.String(255))
    notes = db.Column(db.Text)


class Vendor(TimestampMixin, SerializableMixin, db.Model):
    __tablename__ = "vendors"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), nullable=False, index=True)
    category = db.Column(db.String(80))
    phone = db.Column(db.String(40))
    email = db.Column(db.String(160))
    balance = db.Column(db.Numeric(14, 2), default=0)
    status = db.Column(db.String(30), default="current", index=True)


class ProductionMachine(TimestampMixin, SerializableMixin, db.Model):
    __tablename__ = "production_machines"

    id = db.Column(db.Integer, primary_key=True)
    machine_ref = db.Column(db.String(40), unique=True, nullable=False, index=True)
    name = db.Column(db.String(160), nullable=False, index=True)
    category = db.Column(db.String(80), nullable=False, index=True)
    capability = db.Column(db.String(255))
    status = db.Column(db.String(30), default="active", index=True)
    image_path = db.Column(db.String(255))
    notes = db.Column(db.Text)


class PricingItem(TimestampMixin, SerializableMixin, db.Model):
    __tablename__ = "pricing_items"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(60), unique=True, nullable=False, index=True)
    name = db.Column(db.String(180), nullable=False, index=True)
    category = db.Column(db.String(80), nullable=False, index=True)
    machine_id = db.Column(db.Integer, db.ForeignKey("production_machines.id"))
    unit = db.Column(db.String(40), nullable=False, default="unit")
    price = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    cost_estimate = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    currency = db.Column(db.String(10), default="MWK", nullable=False)
    active = db.Column(db.Boolean, default=True, nullable=False, index=True)
    notes = db.Column(db.Text)

    machine = db.relationship("ProductionMachine", backref="pricing_items")


class Job(TimestampMixin, SerializableMixin, db.Model):
    __tablename__ = "jobs"

    id = db.Column(db.Integer, primary_key=True)
    job_ref = db.Column(db.String(40), unique=True, nullable=False, index=True)
    client_id = db.Column(db.Integer, db.ForeignKey("clients.id"))
    client_name = db.Column(db.String(160), nullable=False)
    title = db.Column(db.String(180), nullable=False)
    machine_id = db.Column(db.Integer, db.ForeignKey("production_machines.id"))
    service_category = db.Column(db.String(80))
    status = db.Column(db.String(30), default="queued", index=True)
    priority = db.Column(db.String(30), default="medium")
    pages = db.Column(db.Integer, default=0)
    copies = db.Column(db.Integer, default=1)
    progress = db.Column(db.Integer, default=0)
    completed_count = db.Column(db.Integer, default=0, nullable=False)
    total_count = db.Column(db.Integer, default=0, nullable=False)
    due_date = db.Column(db.Date)
    notes = db.Column(db.Text)

    client = db.relationship("Client", backref="jobs")
    machine = db.relationship("ProductionMachine", backref="jobs")
    invoice = db.relationship(
        "Invoice",
        back_populates="job",
        uselist=False,
        cascade="all, delete-orphan",
    )
    payments = db.relationship(
        "Payment",
        back_populates="job",
        cascade="all, delete-orphan",
        order_by="Payment.paid_on.asc()",
    )
    sales = db.relationship(
        "Sale",
        back_populates="job",
        cascade="all, delete-orphan",
    )


class Invoice(TimestampMixin, SerializableMixin, db.Model):
    __tablename__ = "invoices"

    id = db.Column(db.Integer, primary_key=True)
    invoice_ref = db.Column(db.String(40), unique=True, nullable=False, index=True)
    job_id = db.Column(db.Integer, db.ForeignKey("jobs.id"), nullable=True, unique=True, index=True)
    client_id = db.Column(db.Integer, db.ForeignKey("clients.id"))
    client_name = db.Column(db.String(160), nullable=False)
    title = db.Column(db.String(180), nullable=False)
    status = db.Column(db.String(30), default="draft", index=True)
    amount = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    discount_amount = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    tax_rate = db.Column(db.Numeric(6, 4), nullable=False, default=0)
    currency = db.Column(db.String(10), default="MWK", nullable=False)
    issued_on = db.Column(db.Date)
    due_on = db.Column(db.Date)
    paid_on = db.Column(db.Date)
    purchase_order = db.Column(db.String(80))
    payment_terms = db.Column(db.String(120), default="Due on receipt")
    notes = db.Column(db.Text)

    client = db.relationship("Client", backref="invoices")
    job = db.relationship("Job", back_populates="invoice")
    line_items = db.relationship(
        "InvoiceLineItem",
        back_populates="invoice",
        cascade="all, delete-orphan",
        order_by="InvoiceLineItem.position.asc()",
    )
    payments = db.relationship(
        "Payment",
        back_populates="invoice",
        cascade="all, delete-orphan",
        order_by="Payment.paid_on.asc()",
    )


class InvoiceLineItem(TimestampMixin, SerializableMixin, db.Model):
    __tablename__ = "invoice_line_items"

    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey("invoices.id"), nullable=False, index=True)
    position = db.Column(db.Integer, default=1, nullable=False)
    description = db.Column(db.String(255), nullable=False)
    product_type = db.Column(db.String(80), index=True)
    machine_id = db.Column(db.Integer, db.ForeignKey("production_machines.id"))
    pricing_item_id = db.Column(db.Integer, db.ForeignKey("pricing_items.id"))
    quantity = db.Column(db.Numeric(12, 2), nullable=False, default=1)
    unit = db.Column(db.String(40), default="item")
    unit_price = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    production_notes = db.Column(db.String(255))

    invoice = db.relationship("Invoice", back_populates="line_items")
    machine = db.relationship("ProductionMachine", backref="invoice_line_items")
    pricing_item = db.relationship("PricingItem", backref="invoice_line_items")

    def line_total(self):
        return (self.quantity or 0) * (self.unit_price or 0)

    def to_dict(self):
        data = super().to_dict()
        data["line_total"] = float(self.line_total())
        return data


class Payment(TimestampMixin, SerializableMixin, db.Model):
    __tablename__ = "payments"

    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey("invoices.id"), nullable=True, index=True)
    job_id = db.Column(db.Integer, db.ForeignKey("jobs.id"), nullable=True, index=True)
    payment_ref = db.Column(db.String(40), unique=True, nullable=False, index=True)
    amount = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    method = db.Column(db.String(60), default="bank_transfer")
    paid_on = db.Column(db.Date, nullable=False)
    received_by = db.Column(db.String(120))
    notes = db.Column(db.Text)

    invoice = db.relationship("Invoice", back_populates="payments")
    job = db.relationship("Job", back_populates="payments")


class Proposal(TimestampMixin, SerializableMixin, db.Model):
    __tablename__ = "proposals"

    id = db.Column(db.Integer, primary_key=True)
    proposal_ref = db.Column(db.String(40), unique=True, nullable=False, index=True)
    client_id = db.Column(db.Integer, db.ForeignKey("clients.id"))
    client_name = db.Column(db.String(160), nullable=False)
    title = db.Column(db.String(180), nullable=False)
    status = db.Column(db.String(30), default="draft", index=True)
    discount_amount = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    currency = db.Column(db.String(10), default="MWK", nullable=False)
    valid_until = db.Column(db.Date)
    contact = db.Column(db.String(160))
    # Item 6: free text, editable at any status. Will later feed "Prepared by"
    # display on proposal documents; no such display wired in this pass.
    prepared_by = db.Column(db.String(160))
    notes = db.Column(db.Text)
    converted_invoice_id = db.Column(
        db.Integer,
        db.ForeignKey("invoices.id"),
        nullable=True,
        unique=True,
    )

    client = db.relationship("Client", backref="proposals")
    # backref=backref(...) with uselist=False on BOTH sides: the plain string-form
    # backref used previously only sets uselist=False on the forward accessor
    # (Proposal.converted_invoice); the reverse accessor (Invoice.source_proposal)
    # defaults to a list unless uselist=False is passed explicitly for that side too.
    # That mismatch is what caused `invoice.source_proposal.proposal_ref` to fail
    # with "'InstrumentedList' object has no attribute 'proposal_ref'" in production —
    # source_proposal was actually a list, never a scalar, despite the relationship
    # looking like a working one-to-one on a read-through of the code.
    converted_invoice = db.relationship(
        "Invoice",
        backref=db.backref("source_proposal", uselist=False),
        uselist=False,
    )
    line_items = db.relationship(
        "ProposalLineItem",
        back_populates="proposal",
        cascade="all, delete-orphan",
        order_by="ProposalLineItem.position.asc()",
    )


class ProposalLineItem(TimestampMixin, SerializableMixin, db.Model):
    __tablename__ = "proposal_line_items"

    id = db.Column(db.Integer, primary_key=True)
    proposal_id = db.Column(db.Integer, db.ForeignKey("proposals.id"), nullable=False, index=True)
    position = db.Column(db.Integer, default=1, nullable=False)
    description = db.Column(db.String(255), nullable=False)
    amount = db.Column(db.Numeric(14, 2), nullable=False, default=0)

    proposal = db.relationship("Proposal", back_populates="line_items")


class ExpenseCategory(TimestampMixin, SerializableMixin, db.Model):
    """Item 3: lookup table for expense categories, with a vendor_related flag
    marking whether a category represents money owed to a vendor (materials,
    ink, installation) vs. not (utilities, transport reimbursement, in-house
    maintenance). Expense.category stays a free-text string column for
    backward compatibility with existing rows/seed data and the current
    frontend, which only ever sent plain strings - this table is additive,
    matched by name, not a replacement/migration of that column.
    """
    __tablename__ = "expense_categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False, index=True)
    vendor_related = db.Column(db.Boolean, default=False, nullable=False)
    notes = db.Column(db.Text)


class Expense(TimestampMixin, SerializableMixin, db.Model):
    __tablename__ = "expenses"

    id = db.Column(db.Integer, primary_key=True)
    expense_ref = db.Column(db.String(40), unique=True, nullable=False, index=True)
    vendor_id = db.Column(db.Integer, db.ForeignKey("vendors.id"), nullable=True, index=True)
    category = db.Column(db.String(100), nullable=False, index=True)
    category_id = db.Column(db.Integer, db.ForeignKey("expense_categories.id"), nullable=True, index=True)
    title = db.Column(db.String(180), nullable=False)
    amount = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    expense_date = db.Column(db.Date, nullable=False)
    paid_on = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(30), default="pending", index=True)
    submitted_by = db.Column(db.String(120))
    notes = db.Column(db.Text)

    vendor = db.relationship("Vendor", backref="expenses")
    expense_category = db.relationship("ExpenseCategory", backref="expenses")


class Advance(TimestampMixin, SerializableMixin, db.Model):
    __tablename__ = "advances"

    id = db.Column(db.Integer, primary_key=True)
    advance_ref = db.Column(db.String(40), unique=True, nullable=False, index=True)
    recipient = db.Column(db.String(160), nullable=False)
    amount = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    status = db.Column(db.String(30), default="open", index=True)
    issued_on = db.Column(db.Date)
    settled_on = db.Column(db.Date)
    notes = db.Column(db.Text)


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    actor = db.Column(db.String(120), default="system")
    action = db.Column(db.String(255), nullable=False)
    entity_type = db.Column(db.String(80), index=True)
    entity_id = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "actor": self.actor,
            "action": self.action,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "created_at": self.created_at.isoformat(),
        }


class ExportJob(TimestampMixin, SerializableMixin, db.Model):
    __tablename__ = "export_jobs"

    id = db.Column(db.Integer, primary_key=True)
    export_ref = db.Column(db.String(40), unique=True, nullable=False, index=True)
    name = db.Column(db.String(180), nullable=False)
    format = db.Column(db.String(30), nullable=False)
    records = db.Column(db.Integer, default=0)
    file_path = db.Column(db.String(255))
    status = db.Column(db.String(30), default="processing", index=True)
    generated_by = db.Column(db.String(120))
    notes = db.Column(db.Text)


class Staff(TimestampMixin, SerializableMixin, db.Model):
    """Item 5: simple staff directory. Will later populate "Prepared by",
    "Assigned printer", Petty Cash staff selection, and the To-Do List - none
    of those UI surfaces are wired in this pass.
    """
    __tablename__ = "staff"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), nullable=False, index=True)
    role = db.Column(db.String(80), index=True)
    active = db.Column(db.Boolean, default=True, nullable=False, index=True)
    notes = db.Column(db.Text)


class Sale(TimestampMixin, SerializableMixin, db.Model):
    """Item 7: every Sale must reference an existing Job (nullable=False FK) -
    no standalone entries. `amount` is intentionally NOT a plain editable
    column from the frontend's point of view; it is written only by
    services.sales.sync_sale_amount(), derived from the linked Job's Invoice
    payment status. The column still exists (rather than being computed
    on read only) so it can be queried/reported on directly without joining
    through Job->Invoice->Payments every time.
    """
    __tablename__ = "sales"

    id = db.Column(db.Integer, primary_key=True)
    sale_ref = db.Column(db.String(40), unique=True, nullable=False, index=True)
    job_id = db.Column(db.Integer, db.ForeignKey("jobs.id"), nullable=False, index=True)
    description = db.Column(db.String(255))
    notes = db.Column(db.Text)
    amount = db.Column(db.Numeric(14, 2), nullable=False, default=0)

    job = db.relationship("Job", back_populates="sales")

    @property
    def client_name(self):
        return self.job.client_name if self.job else None


class PettyCash(TimestampMixin, SerializableMixin, db.Model):
    """Item 8: three entry types.
    - top_up: increases the running balance.
    - staff_expense: decreases the running balance.
    - sales_cash_used: does NOT affect the balance directly (cash was already
      collected as a Sale, this just records how it was spent), but must
      auto-create a mirrored Expense row tagged "Petty Cash" - see
      services.petty_cash.record_petty_cash_entry() for that side effect,
      which is deliberately not duplicated here in the model layer.
    `linked_expense_id` records that mirrored Expense so the two rows stay
    traceable to each other without guessing by amount/date.
    """
    __tablename__ = "petty_cash_entries"

    ENTRY_TYPES = ("top_up", "staff_expense", "sales_cash_used")

    id = db.Column(db.Integer, primary_key=True)
    entry_ref = db.Column(db.String(40), unique=True, nullable=False, index=True)
    entry_type = db.Column(db.String(30), nullable=False, index=True)
    amount = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    staff_id = db.Column(db.Integer, db.ForeignKey("staff.id"), nullable=True, index=True)
    linked_expense_id = db.Column(db.Integer, db.ForeignKey("expenses.id"), nullable=True, index=True)
    notes = db.Column(db.Text)

    staff = db.relationship("Staff", backref="petty_cash_entries")
    linked_expense = db.relationship("Expense", backref="petty_cash_source")