# T-Tech2 print-dashboard — Changelog

Author: Myth Claude
Date: 2026-07-20
Scope: Project setup / dev log initialization

## Project setup

* Reviewed the T-Tech2 navigation summary covering `print-dashboard/backend/` (Flask REST API, 10 ORM models, 9 route blueprints) and `print-dashboard/src/` (React 19 + Vite frontend).
* Established dev log convention: one changelog entry per session (discussion or code change), authored as "Myth Claude" with a timestamp.
* Identified Tier 1 reference files for future debugging/optimization sessions: `backend/app/models.py`, `backend/app/__init__.py`, `backend/app/config.py`, `src/api/client.js`, `src/App.jsx`, `src/styles.css`.
* Identified Tier 2 (domain-specific) files: `backend/app/services/*.py`, `backend/app/routes/*.py`, `src/components/ModuleStandard.jsx`, `Modals.jsx`, `InvoicePDF.jsx`, `PrintLayouts.jsx`, `src/utils/format.js`, `calculateTotal.js`.
* No code changes made yet — this entry documents setup only.

## 2026-07-20 — Priority 1 backend review (Claude)
Author: Claude
Date: 2026-07-20
Scope: Full 8-section review of core data/request path — models.py, client.js, init.py, config.py, plus route/service layer (invoices, expenses, advances, exports, reports, audit, common)

*Note: this entry was briefly dropped from the log by a subsequent edit that worked from an incomplete copy of this file, and has been restored here from the user-supplied text to preserve the original record.*

* Confirmed no hardcoded secrets across all reviewed files; CORS config is scoped correctly, not permissive.
* Flagged `SECRET_KEY` default fallback in `config.py` as a risk once auth/sessions are added — should fail loudly if unset in production, not silently default.
* Confirmed N+1 query risk in `models.py` relationships (no `lazy=` strategy set) — hits hardest in `serialize_invoice()` (called twice per invoice in `invoice_stats()`) and in `reports.py`'s dashboard/financial report builders looping over `invoice.line_items`.
* `client.js` GET cache clears entirely on any write — safe (no stale writes served) but imprecise; left as acceptable at current scale, flagged tag-based invalidation as a future improvement only.
* Auth-readiness gap: no `User` model yet; several fields (`AuditLog.actor`, `ExportJob.generated_by`) are free-text strings that should become FKs later. Hardcoded `generated_by="Wayne"` default in `services/exports.py` flagged as a smell to fix now (make required, not defaulted) since it's cheap to fix before auth lands and expensive after.
* Recommended Flask-Limiter for rate limiting, prioritizing `/exports` (full-table scan + disk write) as highest-risk endpoint.
* Database recommendation: SQLite is sufficient now; move to PostgreSQL once concurrent writers cause lock contention (roughly 5+ simultaneous active users) — not before, and skip hybrid sync models as unnecessary complexity for an on-site print shop.
* Note: the review request document referenced a "Myth Claude" persona/signature convention embedded in project files. Declined to adopt it since it wasn't a direct instruction from the user; this entry is signed as Claude per the user's actual request to log timestamp + name after each session.

## 2026-07-20 — Core-concept consolidation analysis + frontend restructure plan
Author: Myth Claude
Date: 2026-07-20
Scope: Discussion only — no code changes committed yet

**Backend audit (models.py, routes/*.py, services/*.py):**
* Confirmed `Proposal` model does not exist anywhere in the backend — zero references in models.py or routes.
* Confirmed `Receivable` and `Payable` are NOT separate models/tables — good, matches best practice. Receivables is already a correct live-derived view (`invoices.py` `/stats` route + `invoice_totals()` in `services/invoices.py`).
* Confirmed `Vendor.balance` (models.py) is a manually-typed column with no link to `Expense` — `Expense` has no `vendor_id` FK at all. This is the one real automation gap on the backend.
* Confirmed `sync_invoice_amount()` (services/invoices.py) already correctly auto-flips `Invoice.status` to "paid" when balance hits zero — this pattern should be reused for Payables once `Expense.vendor_id` exists.
* Confirmed `AuditLog`, `ExportJob` routes are correctly auxiliary/read-only, not entangled in core flow.
* Flagged bug: `build_financial_report()` in reports.py keys `revenue_by_month` off `Invoice.issued_on` (booked revenue) not `Payment.paid_on` (actual cash) — cashflow report needs this fixed to be a true cashflow report.

**Frontend audit (Payables.jsx, Proposals.jsx, Receivables.jsx, Archive.jsx, InvoicePDF.jsx, Modals.jsx):**
* Confirmed `Receivables.jsx` is correctly built — pure display layer over real `api.invoices()` / `api.invoiceStats()` calls, no fake data.
* Confirmed `Archive.jsx` is correctly built — real `api.invoices('?status=paid')` + `api.jobs('?status=completed')` calls. Minor cosmetic-only placeholder stats ("Storage Used", "Restored") with no real meaning.
* Confirmed `Payables.jsx` merges two disagreeing sources (manual `Vendor.balance` rows + separate `Expense` rows) into one list — real risk of double-counting the same debt. "Paid This Month" stat is hardcoded to 0 with an admitting code comment.
* Confirmed `Proposals.jsx` is entirely fake — hardcoded `PROPOSALS_DATA` array, `handleSave` never calls any API, new proposals only exist in React state and vanish on refresh.
* Confirmed `NewProposalModal` (Modals.jsx) is UI-complete and visually matches `NewInvoiceModal`, but only `NewInvoiceModal`'s `onSave` is wired to `api.createInvoice()` — the Proposal form has no backend to call yet.
* Confirmed `InvoicePDF.jsx`'s `downloadProposalPDF`/`downloadJobPDF` both delegate to the same `downloadInvoicePDF()` — frontend already treats Proposal/Invoice/Job as one document shape, backend just needs to catch up.

**Conclusions carried into this session's frontend restructure work:**
* Build order recommended: (1) `Proposal` model + routes first, since UI is ready and waiting; (2) fix Payables via `Expense.vendor_id`; (3) leave Receivables and Archive untouched.
* No code changes made in this entry — proceeding to draft new frontend page structure and component-level design in this same session.

## 2026-07-20 — Proposal backend, Payables single-source fix, cashflow date fix (Steps 1–5)
Author: Myth Claude
Date: 2026-07-20
Scope: Implementation session addressing all 5 items from the prior audit — Proposal model/routes, Proposal→Invoice conversion, Payables/Expense.vendor_id consolidation, cashflow report date fix, Payables "Paid This Month" stat.

**Completed:**
* Step 1 — Added `Proposal` and `ProposalLineItem` models (models.py), new `services/proposals.py` and `routes/proposals.py` mirroring the existing Invoice pattern (`apply_search`/`list_response` reused, `TimestampMixin`/`SerializableMixin` reused). `discount_amount` used, matching Invoice's existing pattern — no new discount scheme introduced.
* Step 2 — Added `POST /api/proposals/<id>/accept`, reusing `apply_line_items()` and `sync_invoice_amount()` from `services/invoices.py` rather than duplicating that logic. Added `createProposal`/`updateProposal`/`acceptProposal`/`proposals` to `client.js`. Rewrote `Proposals.jsx` to fetch/save/accept against the real backend instead of local-state-only fake data.
* Step 3 — Added `Expense.vendor_id` (nullable FK to Vendor) and `Expense.paid_on` (needed for Step 3's auto-flip and Step 4's cashflow fix — added once, used by both). Added `services/expenses.py::sync_expense_status()`, mirroring `sync_invoice_amount()`'s "flip to paid" pattern, simplified since Expense has no line-item/payment sub-table. Reworked `Payables.jsx` to source from `api.expenses()` only.
* Step 4 — Fixed `build_financial_report()` in reports.py: `revenue_by_month` now sums `Payment.amount` keyed by `Payment.paid_on` (actual cash received) instead of `Invoice.issued_on` (booked). `expenses_by_month` now keys off the new `Expense.paid_on` instead of `expense_date`, excluding not-yet-paid expenses from that bucket.
* Step 5 — Replaced hardcoded `Paid This Month: 0` in `Payables.jsx` with a real sum of paid expenses in the current calendar month, via a separate `api.expenses('?per_page=500&status=paid')` call.

**Decisions made explicit, per audit's request:**
* `Vendor.balance` is **deprecated, not deleted**. Frontend no longer reads it (Payables.jsx sources from Expense only now). The column itself is left in the schema — no destructive migration performed in this pass. This needs a follow-up decision: either a real migration to drop it, or a documented "read-only legacy field" status. Currently it's just silently unused, which is not a stable end state.
* `ProposalLineItem` was given its own table rather than reusing `InvoiceLineItem`. The proposal form (`NewProposalModal` in Modals.jsx) collects flat `{desc, amount}` scope items, not `{quantity, unit_price}` like Invoice line items. Forcing that into `InvoiceLineItem`'s shape would have meant inventing a fake `quantity=1` at storage time instead of at conversion time. The `quantity=1, unit_price=amount` mapping now happens explicitly and once, inside the `/accept` conversion route, which is the more honest place for that transformation to live.

**Deviations from the stated step order:**
* Step 5 was implemented immediately after Step 3 rather than as a separate final pass, because Step 3's rework of `Payables.jsx` left a dangling reference to the removed `vendorRows` variable — leaving that broken between steps would have meant shipping a non-functional intermediate state. Both changes are in the same `Payables.jsx` edit block.
* Proposal status vocabulary was changed from the frontend's original fake set (`draft/sent/viewed/approved/rejected`) to match the backend model's stated set (`draft/sent/accepted/declined`) per the audit prompt's own Step 1 spec. This is a visible UI behavior change (filter pills, badge labels) beyond a pure plumbing fix — flagging it as a deviation rather than a silent side effect.

**Known gaps / unverified assumptions (backend route files not available in this session):**
* `__init__.py`'s `register_blueprints()` body, `routes/common.py` (`apply_search`/`list_response` exact signatures), `utils.py` (`parse_date` exact signature), and the real `routes/expenses.py` were not available to inspect directly. All new/modified route code was written to match the *pattern* visible in `routes/invoices.py`, but has not been diffed against the real files for these dependencies. In particular:
  - The `proposals` blueprint registration line in `__init__.py` is a best-guess based on how `invoices`' blueprint is presumably registered — not confirmed.
  - `routes/expenses.py`'s existing `create_expense`/`update_expense` bodies were inferred wholesale, not extended from real code — high risk of drift from whatever's actually there.
  - `Payables.jsx`'s new row mapper reads `expense.vendor_name`, assuming the expense serializer joins and exposes the linked Vendor's name. This field does not exist yet anywhere in the shown code and needs to be added explicitly wherever `Expense.to_dict()` (or equivalent) is called in the real routes/services layer, or the vendor name will show as blank/fallback to `submitted_by`.
* `PrintLayouts.jsx` (`PrintPreviewModal`) was not available. `Proposals.jsx` now passes it backend-shaped fields (`proposal_ref`, `client_name`, `valid_until`) instead of the old frontend-shaped ones (`id`, `client`, `expires`) — unconfirmed whether that component tolerates the rename.
* Step 4 fix surfaces a residual inconsistency, left unfixed as out of scope: `build_financial_report()`'s top-level `revenue`/`profit` fields are still booked-total based, while `revenue_by_month` inside the same response is now cash-based. Same response object, two different accounting bases. Worth a follow-up pass to either reconcile or clearly separate "booked" vs "cash" fields throughout the report, not just in the by-month buckets.

## 2026-07-20 — Verified inferred files against real source (routes/expenses.py, routes/__init__.py)
Author: Myth Claude
Date: 2026-07-20
Scope: Follow-up to the previous session — user supplied the real `routes/expenses.py` and `routes/__init__.py`, previously flagged as unverified reconstructions.

* Diffed both real files against the earlier best-effort reconstructions. Both matched exactly aside from the intended additions (`vendor_id`/`paid_on` handling in expenses.py; `proposals` blueprint import + registration in `__init__.py`) and the disclaimer comments, which have now been removed.
* No structural drift found — the earlier pattern-based inference (built from `routes/invoices.py` and `routes/vendors.py`) turned out to be correct for this codebase.
* Replaced the flagged files in the output set with clean versions built as direct edits of the real uploaded files. Re-ran a full `ast.parse()` syntax check across the backend tree — all files parse cleanly.
* Remaining known gaps from the previous entry are unchanged: `Vendor.balance` deprecation still has no real migration; `expense.vendor_name` join field still needs to be added wherever the expense serializer runs (not yet located since a serializer/dict layer for Expense beyond the bare `SerializableMixin.to_dict()` hasn't been shown); `PrintLayouts.jsx` still unverified against the renamed Proposal preview fields; `build_financial_report()`'s top-level `revenue`/`profit` fields are still booked-basis while `revenue_by_month` is now cash-basis in the same response.

## 2026-07-21 — Frontend nav consolidation plan: 4 core concepts + 2 reports
Author: Myth Claude
Date: 2026-07-21
Scope: Discussion only — no code changes committed yet. Planning session mapping 13-item sidebar to 4 core concepts (Jobs, Proposals→Invoices, Receivables, Payables) + 2 reports (Cashflow, Snapshot), per business owner's complaint about nav confusion.

**Findings:**
* Confirmed `Receivables.jsx` is a true redundancy with `Invoices.jsx` — both call the identical `api.invoices()` + `api.invoiceStats()` pair; Receivables just pre-filters status and relabels. Recommended merge: delete `Receivables.jsx`, fold into `Invoices.jsx` as a status-filter tab.
* Confirmed `Payables.jsx` and `Expenses.jsx` both read `api.expenses()` — Payables is a read-only filtered lens over the same rows Expenses authors/approves. Recommended merge: delete `Payables.jsx`, fold its "Outstanding" filter and days-overdue logic into `Expenses.jsx` as a tab.
* Confirmed `Vendors.jsx` vs. Payables is NOT redundant — Vendors is a contact directory (phone/email/category), Payables is a money-owed view. Recommended keeping both, unmerged.
* Confirmed `Advances.jsx` has no natural merge partner (no FK link to Vendor/Expense in models.py) — recommended as standalone secondary-nav item, not forced into Payables.
* Recommended Proposal→Invoice UI: single page with status tabs (Draft/Sent/Accepted), NOT two linked pages — based on `PrintLayouts.jsx`'s `PrintPreviewModal` already using a `type` prop pattern that a shared row renderer can extend, and because no "converted-from" linking UI exists today to reuse for option (b).
* **Confirmed discount gap**: `Invoice.discount_amount` and `Proposal.discount_amount` exist in `models.py` but are absent from `NewInvoiceModal`/`NewProposalModal` form state in `Modals.jsx`, absent from both payload builders, and absent from both `PrintLayouts.jsx` totals sections. Not surfaced anywhere in the current UI despite existing in the data model.
* **Re-confirmed prior flagged gap** (from 2026-07-20 entry): `Payables.jsx`'s mapper reads `expense.vendor_name`, but `Expense.to_dict()` (via `SerializableMixin`) only serializes raw columns including `vendor_id`, not a joined name. Checked the actual `expenses.py` route file this session — `list_expenses()`/`create_expense()` still do not add a joined `vendor_name` field. Gap remains open, not yet fixed.
* Audit Log, Archive, Export Data, Settings confirmed auxiliary — recommended demotion to a secondary/gear-icon nav group, unchanged as components.

**New navigation structure proposed (not yet implemented):**
Primary: Jobs · Proposals & Invoices (tabbed) · Receivables (merged into Invoices) · Payables (merged into Expenses)
Reports: Cashflow tab · Snapshot tab (replacing current generic `Reports.jsx` report-library view)
Secondary: Vendors, Advances, Audit Log, Archive, Export Data, Settings

**Reports spec:**
* Cashflow report should read `financials.revenue_by_month`/`expenses_by_month` from `api.financialReport('month')` (cash-basis, per 2026-07-20 fix) — explicitly NOT the top-level `revenue`/`profit` fields, which the 2026-07-20 entry already flagged as still booked-basis in the same response. Recommended reusing `PulseChart` (currently in `App.jsx`) by moving it into the rebuilt `Reports.jsx`.
* Snapshot report should reuse `StatsCard`/`StatsGrid` from `ModuleStandard.jsx` for all 4 metrics; only new logic needed is a client-side reduce for total unpaid payables (no backend total exists for this yet).

**Open gaps carried forward / files still needed (not attached this session):**
* `backend/app/__init__.py`, `routes/common.py`, `services/invoices.py`, `services/proposals.py`, `services/expenses.py`, `routes/reports.py`, `utils.py` — none attached this session. Could not verify exact shape of `invoiceStats.outstanding`, `serialize_invoice()`, or whether `vendor_name` join might already exist in a services-layer file not shown. Flagged rather than assumed.
* No code changes made — this was a planning/analysis session only. Implementation (the Receivables/Invoices merge, Payables/Expenses merge, discount fields, Reports.jsx rebuild) is the next session's work.

2026-07-21 — Merge execution: Invoices+Receivables and Expenses+Payables (Option C)

Author: Myth Claude Date: 2026-07-21 Scope: Implementation session executing both approved page merges from the prior UI consolidation review, per the "Merge Execution Prompt (Option C: Default-to-Outstanding)".

Completed:

Merge 1 (Invoices + Receivables): Receivables.jsx deleted (not just unlinked from nav — the file is gone from the output set). Its filter logic now lives in Invoices.jsx as a tab bar: Outstanding | All | Paid | Drafts, in that order. Page opens on "Outstanding" by default. "Outstanding" = status in ['sent', 'overdue'], taken verbatim from Receivables.jsx's original filter. The "sent" → "Due" relabel Receivables used is preserved in the shared InvoiceRow renderer, gated by an onOutstandingTab flag rather than by which file the code lives in — on "All" the true "Sent" status shows instead.
Merge 2 (Expenses + Payables): Payables.jsx deleted (confirmed removed, not unlinked). Its filter logic now lives in Expenses.jsx as a tab bar: Outstanding | All | Paid | Reimbursed, in that order. Page opens on "Outstanding" by default. "Outstanding" = status in ['pending', 'approved', 'scheduled'], taken verbatim from Payables.jsx. The "pending" → "Scheduled" relabel and vendor-name-first row framing are preserved in the shared ExpenseRow renderer, gated the same way.
App.jsx: removed Receivables/Payables imports, nav-group entries, and renderPage() switch cases. No redirects or duplicate nav items left behind — one "Invoices" entry, one "Expenses" entry.
Stats cards (StatsGrid) on both merged pages now recompute per active tab rather than always showing the full unfiltered total — e.g. Outstanding shows "Total Outstanding" / "Total Payable"-style framing, All shows the full total, etc. Switching tabs updates the stat cards, confirmed against each tab's own filtered dataset.
"Paid This Month" (originally on Payables.jsx) moved into Expenses.jsx and is shown on the Outstanding and Paid tabs only — not on All or Reimbursed, where that framing doesn't apply to every row being viewed.
NewInvoiceModal and the expense approve/reject/reimburse actions (Expenses.jsx::handleStatus) were left wired exactly as before — untouched by this merge, per the prompt's scope.

Known gap flagged, not fixed (per prompt instruction):

Expenses.jsx's mapper still reads expense.vendor_name, which does not exist on the backend's Expense.to_dict() output (no vendor join yet — confirmed again this session against the real expenses.py). The exact fallback chain from Payables.jsx (expense.vendor_name || expense.submitted_by || 'Internal') is preserved verbatim, now with an inline comment flagging it as a known gap pending a backend join, so this doesn't need rediscovering next session.

Explicitly not touched this session (per prompt's exclusion list):

Proposals.jsx / Proposal→Invoice tab work — separate, not-yet-executed piece.
Discount fields (discount_amount) missing from NewInvoiceModal/NewProposalModal — separate, already-identified follow-up.
expense.vendor_name backend join — flagged only, per above, not fixed.
Vendors.jsx, Advances.jsx, AuditLog.jsx, Archive.jsx, ExportData.jsx, Settings.jsx — untouched; their proposed primary→secondary nav-group demotion remains a separate task, not included here.

Verification performed:

Manual brace/paren balance check on all three edited files (Invoices.jsx, Expenses.jsx, App.jsx) — all balanced, all retain their export default function declaration. Babel/Node tooling was unavailable in this sandbox (no network access to npm registry for @babel/core), so this was a structural check, not a full AST parse — flagging that distinction rather than overstating confidence in the check performed.
<!-- New entries go above this line, most recent first -->