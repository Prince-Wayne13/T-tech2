# Implementation Prompt: Proposal → Job → Invoice Restructure

Paste this whole prompt into a session that has the backend files attached
(at minimum: `models.py`, `routes/proposals.py`, `routes/jobs.py`,
`routes/invoices.py`, `services/proposals.py`, `services/invoices.py`,
`services/jobs.py` if it exists, `api/client.js`, and the frontend files
`Proposals.jsx`, `Jobs.jsx`, `Invoices.jsx`, `Modals.jsx`, `App.jsx`,
`utils/format.js`, `utils/calculateTotal.js`). Do not attempt this without
those files — read them first and confirm actual field names/relationships
before writing any code. If any of these files are missing, stop and ask
for them rather than guessing at their shape (a prior guessed-relationship
bug in this codebase — the `source_proposal` `AttributeError` documented in
dev-log.md, 2026-07-22 — is exactly the failure mode to avoid repeating).

## Business logic being implemented

Current flow: Proposal (accept) → Invoice directly. Jobs are separate and
unrelated to Proposals/Invoices.

New flow: **Proposal → Job → Invoice**, specifically:

1. **Walk-in customer with no proposal** starts directly as a **Job** (skip
   Proposal entirely — this path already exists today, just confirm it's
   unaffected).
2. **Proposal, when accepted**, creates a **Job** instead of an Invoice
   directly. The Job is auto-created and immediately set to an
   **"In Session"** status — no manual setup step, no pre-filled form for
   review. Copy the proposal's client, title, line items/scope, and any
   other relevant fields straight across at creation time.
3. **Job status** becomes a real production-status field with these values:
   **In Session / Finished / Cancelled**. (Existing Job statuses today are
   queued/printing/finished/cancelled — reconcile with this new vocabulary;
   "In Session" likely replaces or maps onto queued+printing as a single
   combined "work is happening" state — read `models.py`'s current `Job`
   status field and decide the exact mapping, documenting the decision in
   dev-log.md rather than silently overwriting the existing vocabulary.)
4. **Payment tracking lives on the Job**, not manually on the Invoice. Add
   a **Payment ledger**: a list of individual payment entries per Job (date,
   amount, method — mirroring the shape already used by
   `RecordPaymentModal` in `Modals.jsx`, which already collects
   `date`/`amount`/`method`/`ref`/`notes` but today has no backend endpoint
   wired to it — confirm this and reuse that shape rather than inventing a
   new one). This is a genuine one-to-many relationship (new
   `PaymentEntry`-style model/table with a FK to `Job`), not a single
   running-total field.
5. **"Update Payment" becomes a real, reachable action on the Job** — add a
   button/action on `JobRow` in `Jobs.jsx` (and/or inside the Job preview)
   that opens `RecordPaymentModal` (already exists in `Modals.jsx`,
   currently orphaned — only reachable via the Dashboard's "Record Payment"
   Quick Action in `App.jsx`, which has no real backend wiring either).
   Wire its `onSave` to a new payment-recording endpoint that appends to
   that Job's payment ledger.
6. **Invoice becomes derived/read-only.** Stop allowing direct manual
   Invoice creation (`NewInvoiceModal`'s create path, `POST /api/invoices`
   as a user-facing action) as the primary way invoices come into being —
   instead, an Invoice should be automatically associated with/generated
   from a Job (likely at Job-creation time, so it exists from the start as
   "Not Paid", rather than only appearing once the Job is Finished — this
   matters because installment payments can start before the job is done).
   Invoice status is **computed, not manually set**, from the Job's payment
   ledger:
   - **Not Paid**: sum of payment entries = 0
   - **Partial**: 0 < sum of payment entries < job total
   - **Paid**: sum of payment entries >= job total
   Read `services/invoices.py`'s existing `sync_invoice_amount()` (referenced
   in dev-log.md as already implementing an analogous "auto-flip to paid
   when balance hits zero" pattern for the old direct-invoice flow) and
   extend/adapt that pattern rather than writing new status-sync logic from
   scratch.
7. Confirm whether Invoice should still be individually editable/deletable
   via the UI at all once this lands — per the spec, no: it should only be
   viewable/downloadable, showing paid/partial/not-paid, sourced from its
   Job. If `NewInvoiceModal`'s edit path is fully retired, decide whether to
   remove the "Edit" button from `InvoiceRow` in `Invoices.jsx` or leave it
   for adjusting notes/due-date-only. State the decision explicitly, don't
   leave it ambiguous.

## Existing Job→Invoice backfill requirement

Existing Invoices already in the system (created the old, direct way) need
to be **backfilled with synthetic Jobs** — i.e., write a one-time
migration/backfill script that, for every existing `Invoice` with no linked
Job, creates a corresponding `Job` record (status: `Finished`, since these
are presumably already-completed work) and links them via whatever new FK
this change introduces (e.g. `Invoice.job_id` or `Job.invoice_id`,
whichever direction makes more sense given the existing
`Proposal.converted_invoice_id` pattern — read that pattern first, it's
already used in this codebase for a similar link, and dev-log.md has a full
account of a bug caused by getting the relationship's `uselist` wrong on
that exact FK, worth reading before adding a new one of the same shape).
Also backfill each synthetic Job's payment ledger with a single payment
entry equal to the invoice's paid amount, so paid/partial/unpaid status
computes correctly for pre-existing data immediately after migration.

State plainly in dev-log.md whether this backfill runs via a Python script,
a Flask CLI command, or inside `seed.py`/`reset-mock-db` — whichever
matches how this project already handles one-off data changes (check
`seed.py` first, since prior sessions confirm it exists and is used for
resets).

## Date formatting — separate, smaller task, do in the same session

Change date formatting across the app to **dd/mm/yyyy** (not the US-style
formatting currently used in several places — e.g. `Invoices.jsx` and
others call `.toLocaleDateString('en-GB', ...)` in some spots already,
which is correct/British-style, but audit every date-producing call across
`utils/format.js` (`compactDate`, any other date helper), `Jobs.jsx`,
`Invoices.jsx`, `Expenses.jsx`, `Advances.jsx`, `Vendors.jsx`,
`Archive.jsx`, `AuditLog.jsx`, `Reports.jsx`, and `Modals.jsx`'s preview
frames, since several of these use `en-GB` already but at least one
(`Archive.jsx`'s `downloadArchive()`, `AuditLog.jsx`'s `downloadAudit()`)
uses `new Date().toLocaleDateString()` with no locale argument at all,
which is not guaranteed to produce dd/mm/yyyy — make it explicit everywhere
rather than relying on the browser's default locale. Confirm the year
should render as the real 4-digit year, not a hardcoded "2026".

## Two independent small UI fixes — do these too, low risk

1. **Remove the Download action from inside Preview modals entirely.**
   Currently several rows have both a standalone "Download" icon button
   *and* a Preview modal that may also expose a download/print action
   inside it (`PrintPreviewModal` in `PrintLayouts.jsx` — read this file
   first, it's the shared preview+print component used by Jobs, Invoices,
   and Proposals). Keep download as the row-level icon button only; strip
   any duplicate download/print trigger from inside the preview modal
   itself.
2. **Icon consistency: Invoices' preview icon should match Proposals'.**
   `Proposals.jsx`'s `ProposalRow` uses the `eye` icon
   (`D.eye = 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'`)
   for its Preview button. `Invoices.jsx`'s `InvoiceRow` currently uses
   `D.invoices` (the document/invoice icon) for its Preview button instead
   — change it to use the same eye icon `D.eye` for visual consistency
   between the two pages (note: `Invoices.jsx`'s local `D` object doesn't
   currently define an `eye` icon — add it using the exact same path string
   already used in `Proposals.jsx` and `Expenses.jsx`, don't invent a new
   path).

## What to explicitly leave alone

- Vendor page changes are being scoped separately — do not touch
  `Vendors.jsx` or vendor-related backend code in this pass.
- The Invoice-PDF discount inconsistency (`InvoicePDF.jsx` vs.
  `PrintLayouts.jsx`) — separate, already-flagged issue, out of scope here.
- `ProposalPrintLayout`'s `valid_until` display bug — separate, already-
  flagged issue (needs `PrintLayouts.jsx`, which this prompt also needs —
  if you have it, fix that bug too while you're in the file, but don't
  expand scope beyond that one-line fallback-chain fix plus whatever this
  prompt requires).

## Required process for this session

1. Read every file listed at the top before writing any code. Confirm
   actual field names, relationship directions, and existing status
   vocabularies — do not assume they match what's described above if the
   real file says otherwise. If something in this prompt conflicts with
   what a real file shows, the real file wins — flag the conflict in
   dev-log.md rather than silently picking one.
2. Make the backend model/migration changes first, verify with a structural
   check (AST parse if tooling is available, brace/paren balance at
   minimum), then the route/service layer, then wire the frontend last.
3. After implementation, update `dev-log.md` with a timestamped entry
   signed "zcodex claude", following this project's existing dev-log
   convention exactly (see prior entries for format/tone/level of detail
   expected — full sections for what changed, what was explicitly not
   touched, what's still open, and how it was verified).
4. Do not claim something works without having actually traced it against
   the real uploaded files — this codebase has a documented history (see
   dev-log.md, 2026-07-22 entries) of a claim being made about working code
   that turned out to be false on closer inspection. State confidence
   level honestly: "confirmed against real file" vs. "inferred from
   pattern, not independently verified."
