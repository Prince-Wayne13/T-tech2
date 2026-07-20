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

<!-- New entries go above this line, most recent first -->