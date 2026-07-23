# T-Tech2 Work Orders — Reordered (Backend-First)

Domain flow: Proposals → Jobs → Invoices → Payments, plus Vendors, Expenses,
Machines, Reports, Audit. Backend: Flask + SQLAlchemy + SQLite. Frontend:
React 19 + Vite.

Rule for every prompt below: work through items one at a time, verify each
actually works before moving to the next, report back per item rather than
batching silently, and log every session in dev-log.md with a timestamp and
"Sam Claude."

---

## Prompt 4 — Foundational backend changes (schema + core bug fixes)

These touch models.py and are prerequisites for almost everything after
this prompt. Do these first, in this order, since later items assume the
fields/tables below already exist.

1. **Fix: Job due date doesn't sync with Proposal due date.** When a
   proposal's due date changes, or when a job is created from a proposal,
   the job's due date should reflect it. Trace the current
   accept-proposal / job-creation path and fix at the source rather than
   patching in the frontend.
2. **Fix: "Update payment" throws an error.** Investigate and fix the
   payment update flow end to end (route, service, and any frontend call
   site involved).
3. **Add `ExpenseCategory` vendor-linking support.** Add a way to mark a
   category as "vendor-related" (money owed to a vendor) vs. not. This can
   be a new small table or a flag on however categories are currently
   represented — inspect current category handling in expenses.py before
   choosing. No UI yet, this prompt is schema + service layer only.
4. **Add job progress fields.** `completed_count` / `total_count` (or
   equivalent) on `Job`. No UI yet — just the columns, service helper to
   update them, and a route to patch them. Completed count must be allowed
   to exceed total (reprints) without breaking anything downstream.
5. **Add `Staff` model.** Simple table: name + role/type column. No UI yet.
   This will later populate "Prepared by," "Assigned printer," Petty Cash
   staff selection, and the To-Do List.
6. **Add `Proposal.prepared_by` and `Job.notes` columns.** Free text for
   now; both editable at any time regardless of proposal/job status.
7. **Add `Sale` model**, tied 1:1 or 1:many to `Job` (every sales entry
   must reference an existing job — no standalone entries). Fields:
   client (via job), description, notes, amount. Amount should be
   *derived* from the linked job's invoice/payment status (fully paid vs.
   partially paid), not manually entered — wire the derivation logic here
   even though the page comes later.
8. **Add `PettyCash` model.** Entries table supporting three types:
   Top-up, Staff Expense, Sales Cash Used. Top-up increases a running
   balance; Staff Expense decreases it; Sales Cash Used does *not* affect
   the balance but must auto-create a mirrored `Expense` row tagged
   "Petty Cash." Build the model + service logic for all three types now;
   page comes later.

**Do not touch:** Sales page, Petty Cash page, Job Queue/scheduling UI —
those are later prompts. This prompt is models/services/routes only,
no new pages.

---

## Prompt 5 — Reporting & analytics backend (aggregation endpoints only)

Depends entirely on Prompt 4 being merged (vendor links, Sale model, Staff
model, etc.). This is read-only aggregation work — new service functions
and routes, no new pages yet.

1. **Vendor report endpoint.** Per vendor, per month and per year: total
   spent, and which service/category was used most. Built on
   `Expense.vendor_id` (already exists).
2. **Client report endpoint.** Per client: total purchased, recurring-
   client detection (e.g. clients with invoices in 3+ distinct months, or
   similar — confirm threshold before finalizing). Built on
   `Invoice.client_id` (already exists).
3. **Monthly projections endpoint.** Derived from what's already in the
   system — open/sent proposals not yet expired, plus recent recurring-
   client patterns from item 2. Not a manual input field, a computed
   projection.
4. **Sales vs. Expenses monthly balance endpoint.** Uses the new `Sale`
   model (Prompt 4, item 7) against existing `Expense` data, grouped by
   month.
5. **Machine/category revenue report endpoint.** "How much has DTF made
   this month" style breakdown — group `InvoiceLineItem` by `machine_id`
   (or `product_type` where `machine_id` is null) and sum revenue per
   month/year.

**Explicitly excluded from this prompt:** the banner/material
stock-and-runout advisory (buy 50 sqm, track usage, estimate profit and
depletion date). That needs a new stock/inventory concept that doesn't
exist yet — it's scoped separately in Prompt 8 below so this prompt can
ship without it.

---

## Prompt 6 — New pages (Sales, Petty Cash) + report pages

Depends on Prompts 4 and 5. This is where the backend work becomes visible.

1. **Sales page.** List view of `Sale` entries: client, description,
   notes, amount. Filterable by payment status (full / partial). No manual
   amount entry — pulled from the linked job as built in Prompt 4.
2. **Petty Cash page.** Single "Add Entry" action, one modal, type selector
   (Top-up / Staff Expense / Sales Cash Used) per Prompt 4's model. Running
   log/table, color-coded by entry type, filterable by month. PDF export
   styled consistently with the existing Audit Log export look, output as
   PDF not HTML. Add an "Add Petty Cash Expense" quick action on the
   dashboard (defaulting to Staff Expense type).
3. **Report pages/tabs** for the four endpoints from Prompt 5 (Vendor,
   Client, Monthly Projections, Sales vs. Expenses, Machine Revenue) —
   likely as additional tabs on the existing `Reports.jsx`, following the
   same pattern as the current Cashflow/Snapshot tabs.
4. **Expense modal: conditional vendor picker.** When the selected expense
   category is marked vendor-related (Prompt 4, item 3), show a vendor
   picker (existing vendor, or add-new-inline). Categories not marked
   vendor-related skip this step entirely.

Ask before assuming anything not specified above (exact PDF layout, vendor
picker UX details, recurring-client threshold).

---

## Prompt 7 — Small UI/UX features (low backend risk)

Independent, mostly frontend, can be done in any order within the prompt.

1. New Proposal modal contact-selection fix — needs the current broken
   behavior described or reproduced first; ask if unclear from code.
2. Jobs list sortable by priority.
3. "Mark Finished" button/action on jobs.
4. Invoice pipeline: show total invoiced and total still owed (total minus
   payments received), at both summary and per-invoice level.
5. Proposal `valid_until`: replace date picker with an "N days" numeric
   input that computes and stores the real expiry date.
6. Job progress bar UI: increment-based entry (e.g. "20 of 40 diaries
   done"), visual fill capped at 100% even when completed count exceeds
   total, but real numbers still shown.
7. Wire the Prompt 4 Staff list into every staff-attribution dropdown:
   Prepared By, Assigned Printer, and any other free-text staff field.
8. "Download Today's To-Do List" — printable/downloadable list of all
   active (in-session) jobs, each showing job details and allocated staff.
   Start with all in-session jobs regardless of due date, one staff field
   per job, simple clean printable layout. Flag design questions back
   rather than guessing.

---

## Prompt 8 — Material/stock tracking + profit & depletion advisory

New concept, scoped on its own since it needs a model that doesn't exist
yet (no purchase-quantity or consumption tracking anywhere currently).
Do this after Prompt 5's machine revenue report exists, since the profit
math depends on it.

1. **Add `MaterialStock` model** (or similar): links to `Vendor` and/or
   `PricingItem`, tracks purchased quantity, unit, purchase date, and a
   derived running "remaining" figure based on consumption.
2. **Consumption tracking.** Decide and implement how usage is recorded —
   most likely derived from `InvoiceLineItem` quantities tied to a
   material/pricing item, confirm mapping before building.
3. **Profit-per-material/machine advisory.** For a given stock batch (e.g.
   "50 sqm banner vinyl"): revenue attributed to that material, estimated
   cost from `PricingItem.cost_estimate`, estimated profit.
4. **Depletion estimate.** Based on recent usage frequency, estimate when
   the current stock batch will run out. Confirm the averaging window
   (e.g. trailing 30 days) before implementing.

Ask before assuming the consumption-mapping logic or the depletion
averaging window — this prompt has the most open design questions of the
set.

---

## Blocked — do not start

**Job Queue / big-job capacity scheduling.** Blocked on defining what
distinguishes a "big job" from a "small job." Revisit once that
classification rule is confirmed. Should eventually integrate with the
Prompt 7 To-Do List once unblocked.
