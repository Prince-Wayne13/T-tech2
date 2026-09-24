# Diagnostics Findings: Proposal, Quotation PDF, Money Flow, Backup/Merge

Date checked: 2026-09-24

Scope: diagnostics of proposal/job/invoice line-item amounts, proposal PDF dates, sales/expense/payment reporting, backup/merge traceability, and terminal-style debug logging.

## Status Summary

Fixed/implemented:
- 1, 2, 3, 4, 5, 6, and 9 are fixed or guarded in code.
- Backup schedule is now fixed daily at 09:00, 11:00, and 14:00.
- Synced/imported records show a `New from sync` origin dot when their `device_id` differs from this laptop.

Still worth talking about:
- 7. Expense report basis/category mismatch.
- 8. Machine revenue/product mix after real sync verification.
- 13. Sales stored amount may need resync after restore/merge.

Probably meh / watch only:
- 12. Backend proposal document payload is currently dead code because frontend PDFs are the live path.
- Broader proposal redundant fields cleanup after Finding 9's dangerous accept-path bug is fixed.
- True unread/acknowledged sync dots. Current dot is an origin marker, not a clearable unread state.
- Service picker default pricing/rate is intentionally later because real prices depend on quantity, square meters, materials, installation, etc.
- Machine auto-assignment is acceptable for now because new services are meant to attach to an appropriate machine automatically.

## Fixed / Implemented

### ~~1. Proposal PDF date is blank because quotations read invoice-style date fields~~

Status: Fixed.

Evidence:
- `src/components/InvoicePDF.jsx:242` defines `QuotationDocument`.
- In the quotation metadata, `src/components/InvoicePDF.jsx` prints `fmtDate(proposal?.issued_on || proposal?.issued)`.
- Proposals do not have `issued_on`; backend proposals have `created_at` and `valid_until` instead (`backend/app/models.py`, `Proposal` model).
- Backend proposal document builder only includes `valid_until`, not an issue/date-created field (`backend/app/services/proposals.py:72-84`).

Impact:
- Downloaded proposal/quotation PDFs can show a blank or `-` date, while invoices correctly show `issued_on`.

Likely fix direction:
- For proposal PDFs, use `proposal.created_at` as the quotation date, falling back to today only for unsaved preview data.
- Optionally add an explicit `issued_on` or `quotation_date` to `build_proposal_document()` if the backend document endpoint becomes the source of truth.

Fix applied:
- `QuotationDocument` now reads `created_at`/`createdAt` when invoice-style `issued_on`/`issued` fields are absent, falling back to today only for unsaved data.
- `build_proposal_document()` now includes proposal `created_at` in its billing payload so the dormant backend document path carries a quotation date too.

### ~~2. Proposal edit flow can corrupt line-item rates by using line total as rate fallback~~

Status: Fixed for frontend edit/save paths; backend accept-path hardening remains covered by Finding 9.

Evidence:
- `src/components/Modals.jsx:579` initializes edit items with:
  - `rate: item.rate || item.unit_price || item.amount || 0`
- Backend proposal line items store both `unit_price` and `amount` (`backend/app/models.py`, `ProposalLineItem`).
- Backend computes `amount` from `quantity * unit_price` if no amount is sent (`backend/app/services/proposals.py:44-67`).

Impact:
- If a saved proposal line has a missing/zero `unit_price` but has `amount`, reopening/editing treats the whole line amount as the per-unit rate.
- Example: quantity `10`, saved amount `50,000`, missing rate -> edit form rate becomes `50,000`; saving again sends `unit_price=50,000`, causing total `500,000`.
- This is not exactly "amounts vanish"; it is a nearby amount-drift bug that can make proposal figures unreliable after edits.

Likely fix direction:
- During proposal edit initialization, use `unit_price`/`rate` only for rate. Do not fall back to `amount` unless quantity is `1`.
- Add a test/save roundtrip for quantity greater than 1.

Fix applied:
- Proposal edit initialization no longer treats a line `amount` as the per-unit `rate`.
- If an imported/legacy line has `amount` but no usable `unit_price`, the frontend derives the displayed/saved rate as `amount / quantity`, preserving the line total without multiplying it by quantity.
- `buildProposalPayload()` applies the same `amount / quantity` guard when it has to serialize amount-only line data.

### ~~3. Backup merge excludes proposal and invoice detail rows, breaking traceability~~

Status: Implemented in merge preview/apply; needs one real cross-device verification run before closing operationally.

Evidence:
- `backend/app/merge_apply.py` explicitly lists these as not yet safe:
  - `proposals`
  - `invoice_line_items`
  - `proposal_line_items`
- `merge_preview.py` includes `proposals` in `REF_KEYED_TABLES`, so preview can report proposals, but apply does not actually merge them.
- `invoices`, `payments`, `jobs`, `expenses`, `sales`, and `petty_cash_entries` are applied, but line-item tables are not.
- A real merge test from a device with an invoice totaling MK 116,000 from two line items into an empty device produced the invoice, payment, and job, but zero invoice line items.

Impact:
- After applying a backup from another device, invoice headers and payment rows may exist without the invoice service rows that explain the amount.
- Machine revenue, product mix, quantity produced, and PDF line items depend on `invoice_line_items`; those reports can undercount or show blank service breakdowns after merge.
- Proposal totals depend on `proposal_line_items`; synced proposals are not currently applied at all.
- In the reproduced merge, financial revenue still showed MK 116,000, but machine revenue was empty and `product_mix` was `{}` because the service rows were absent.
- The loss can be silent: `proposals` may receive a skip notice, but raw `invoice_line_items` and `proposal_line_items` do not reliably appear in merge results because preview is driven by ref/name-keyed tables.
- This is the biggest traceability risk for "every figure is traceable and reflected."

Likely fix direction:
- Add stable refs to `invoice_line_items` and `proposal_line_items`, or merge them through parent refs plus `position`.
- Add proposals to apply with FK translations for client, converted invoice, machine/capability, and assigned staff policy.
- Add consistency checks after merge: invoice total vs line-item sum, proposal total vs line-item sum, payment totals vs invoice totals.

Fix applied:
- `proposals` are now in the safe merge apply set, with client, converted invoice, machine, and capability FK translation. Staff assignment remains local and is not copied.
- `merge_preview.py` now reports `invoice_line_items` and `proposal_line_items` by parent ref plus line position.
- `merge_apply.py` now applies invoice/proposal line items after their parent invoices/proposals are available, translating machine and pricing item FKs.

Remaining verification:
- Run a real two-device merge using an invoice with multiple service rows and confirm:
  - invoice line item count arrives,
  - proposal line item count arrives,
  - machine revenue and product mix are populated,
  - invoice/payment totals still balance.

### ~~4. Invoice amount can become detached from line items after cross-device merge~~

Status: Guarded in code; needs real cross-device verification with Finding 3.

Evidence:
- `Invoice.amount` is stored on the invoice header.
- Normal local create/update calls `sync_invoice_amount()` after applying line items (`backend/app/routes/invoices.py:49-52`, `100-105`).
- Merge now applies invoice headers and `invoice_line_items` by parent invoice ref plus line position.
- `invoice_totals()` falls back to stored `invoice.amount` only when an invoice has no line items (`backend/app/services/invoices.py:24-26`).

Impact:
- A merged invoice may retain the correct header amount, so summary totals look okay, but the services behind that amount are missing.
- Any report that relies on line items, not header amount, will disagree with financial totals.

Likely fix direction:
- Do not consider invoice sync complete until line items are merged too.
- Add a reconciliation report that flags invoices where `amount != sum(line_items) - discount`, especially after merge.

Status:
- Partially addressed: invoice totals and job previews now fall back to the stored invoice total when legacy/imported rows have missing or zero line-item totals.
- `invoice_line_items` now merge with their parent invoice, so source-line traceability should be preserved for new syncs.
- `serialize_invoice()` now includes a `line_consistency` block comparing stored header amount against line subtotal minus discount, allowing imported/merged mismatches to be surfaced or checked.
- Still needs a real cross-device test to confirm the line rows arrive and the money cards/reports balance after Apply Sync.

### ~~5. Job preview service amount can show MK 0 while total/payment is correct~~

Status: Display/persistence guard done; bulk historical data repair not auto-applied.

Evidence:
- Example from production: `JOB-CCB7-0003` had `invoice.amount = 500` and a `MK 500` payment, but no invoice line items.
- The Job Preview service table therefore showed the service row amount as `MK 0`, while subtotal/total/payment still showed `MK 500`.

Impact:
- This is the concrete "amount vanishing" symptom: the money total survives, but the service/detail row no longer explains it.

Fix applied:
- `JobTicketPrintLayout` now repairs the displayed service amount from the known job/invoice total when a legacy/imported job has a missing/zero service amount.
- `invoice_totals()` now falls back to stored invoice amount when line-item subtotal is zero but invoice amount is positive.
- `apply_line_items()` now preserves incoming `amount`/`line_total` by converting it into `unit_price` when `unit_price` is missing or zero.

Remaining caveat:
- Existing production rows with no invoice line items are not bulk-mutated automatically. A separate approved repair pass can recreate historical line rows if desired.
- When `apply_line_items()` converts an incoming line amount into a unit price, it rounds to 2 decimals. If the amount does not divide evenly by quantity, the reconstructed line can drift by a few tambala.
- The frontend display repair is a single/missing-line heuristic. Jobs with two or more zero-priced/missing service lines still need source-line repair, not just preview fallback.

### ~~6. Terminal debug log backup behavior now exports the readable log to Drive~~

Status: Done.

Evidence:
- The terminal-style Audit Log screen is backed by the `debug_events` database table.
- Normal backup zips snapshot the full SQLite database as `app.db`, so `debug_events` is included inside the database backup.
- `backend/app/backup_scheduler.py` now also exports `debug_events` to a readable `TTechStudio-terminal-debug-YYYY-MM-DD-HHMM.log` file.
- That readable terminal log is written into the backup zip beside `app.db` and copied separately into `TTechStudio-Logs/<device_id>/` on the detected Drive/sync folder.
- Manual backup API responses now include `debug_log_copy_path`, so the exact synced log path can be shown/debugged.

Impact:
- The log that shows frontend actions, request bodies, backend responses, status codes, durations, and errors is now the log being backed up to Drive in readable form.
- The older backend runtime log can still be copied too, but it is no longer the only human-readable log available in Drive backups.

Remaining caveat:
- Cross-device merge/apply still does not import `debug_events` from another device. This is intentional unless full debug-history sync is required, because debug logs can grow quickly and are not business records.
- After a successful backup/export, the live `debug_events` table is rotated so the Audit page keeps only a small recent tail locally while the full readable log remains in the backup/Drive log file.
- The readable `.log` export is capped to the newest 5000 debug events. The backup zip's `app.db` snapshot still contains the full `debug_events` table as of backup time, before rotation.

### ~~9. Proposal amount fields are stored redundantly~~

Status: Accept-path multiplier fixed; broader redundant-field cleanup remains a watch item.

Evidence:
- `ProposalLineItem` stores `quantity`, `unit_price`, and `amount`.
- `proposal_totals()` sums `item.amount`, not `quantity * unit_price`.
- `accept_proposal()` converts proposal lines using `unit_price` first, falling back to `amount`.
- The old accept path sent `unit_price: float(item.unit_price or item.amount or 0)` into invoice creation.
- Reproduced case: a proposal line saved with quantity `10`, amount `50,000`, and missing/zero `unit_price` totaled MK 50,000 as a proposal, but accepting it created a MK 500,000 invoice.
- Normal UI creation does not trigger this path because `buildProposalPayload()` sends `unit_price`; this requires an API call, script, imported row, or corrupted/legacy row.

Fix applied:
- `accept_proposal()` now uses `unit_price` when present, otherwise derives unit price as `amount / quantity`.
- The reproduced quantity `10`, amount `50,000`, missing-rate row should now convert to an invoice line of MK 5,000 x 10 = MK 50,000, not MK 500,000.

Remaining caveat:
- Proposal lines still store redundant `quantity`, `unit_price`, and `amount`. That is less urgent now that the dangerous accept-path multiplier is fixed.

### ~~Backup schedule~~

Status: Done.

Fix applied:
- `backend/app/backup_scheduler.py` now runs automatic backups at `09:00`, `11:00`, and `14:00`.

## Still Worth Discussing

### 7. Financial report mixes accounting bases in category totals

Evidence:
- Top-level `expenses` only counts paid expenses with `status in PAID_STATUSES and paid_on` (`backend/app/services/reports.py`).
- But `expense_totals_by_category` adds every expense regardless of paid/unpaid/rejected status (`backend/app/services/reports.py`).
- In a reproduced report, category totals came to MK 470,000 while the top-level `expenses` figure was MK 100,000.
- The report's `basis.expenses` label says `"booked"`, but the value currently returned is paid-only.

Impact:
- The same report can say total expenses are paid-only, while category totals include pending/unpaid vendor bills and rejected expenses.
- This can make backup/reconciliation look wrong even when rows are present.

Likely fix direction:
- Return separate category totals for booked expenses and cash-paid expenses, or filter category totals with the same rule as top-level `expenses`.
- Correct the `basis.expenses` label, or split the top-level values into explicit booked and cash-paid fields.

Priority note:
- This is real, but it is a reporting clarity issue rather than data loss. Worth fixing because it can make cards disagree and confuse money review.

### 8. Machine revenue and product mix after sync

Evidence:
- Machine revenue is built only by iterating `invoice.line_items` (`backend/app/services/reports.py:203-208`).
- Product mix also depends on `invoice.line_items` (`backend/app/services/reports.py:105-106`).
- Merge now applies `invoice_line_items`; this finding remains a watch item until the real two-device sync test confirms machine revenue/product mix populate correctly.

Impact:
- Revenue dashboard can show invoice revenue, while machine/product reports show zero or undercounted revenue.

Likely fix direction:
- Run real sync verification first. If line items arrive, this may be considered resolved without separate code changes.

### ~~10. Service picker never fills a default price/rate~~

Status: Deferred intentionally.

Evidence:
- `src/components/Modals.jsx` defines the hardcoded `SERVICES` list with `name` and `unit`, but no `price` or `rate`.
- `ServiceDropdown` only calls `onSelect(service)`.
- `AddItemBar` requires `Number(form.rate) > 0` before the service can be added.
- `NewProposalModal` and `NewJobModal` `handleServiceSelect()` reset quantity to `1`, but do not set a price/rate from the selected service.

Impact:
- If a user expects choosing a service to bring its amount/rate with it, the amount appears to "vanish" because the selected service has no price attached and the rate field stays blank.
- The earlier "stale rate carries over" suspicion is not currently supported for the normal add flow, because `addItem()` clears the rate after adding an item.
- This is more of a UX/data-entry bug than a persistence bug, but it directly matches the complaint that adding services and amounts feels unreliable.

Likely fix direction:
- Connect the service picker to real pricing items and set the rate automatically, or clearly leave rate as a required manual entry.
- Add a visible/manual override price field either way.

Priority note:
- Deferred to later pricing work. Real prices depend on quantity, square meters, materials, installation, and other context, so a default rate could be misleading right now.

### ~~11. Machine auto-assignment can attach the wrong machine to a newly added service~~

Status: Watch only for now.

Evidence:
- `NewProposalModal` and `NewJobModal` both call `api.machines(...)` inside `handleServiceSelect()` and later write `form.machineId` when the response returns.
- Added line items capture `machineId: form.machineId || null` at the moment the Add button is clicked.
- There is no request token/cancellation check to ensure the machine response still belongs to the currently selected service.
- `machineId` is never cleared when a new item/service is selected.

Impact:
- On a slow machine lookup, an older service selection can finish after the user has already selected another service.
- The stale response can overwrite `form.machineId`, so the next added line can carry the wrong machine assignment.
- There is also a deterministic, no-race version: if the next service has no available matching machine, the new line silently inherits the previous line's machine.
- This probably does not zero the amount itself, but it can corrupt service-to-machine traceability in jobs/proposals.

Likely fix direction:
- Track the selected service/category request and ignore stale machine lookup responses.
- Clear the draft machine assignment at the start of every service selection.
- Store the auto-assigned machine on the selected service draft rather than one shared `form.machineId`.

Priority note:
- User confirmed the intended behavior is that a newly added service auto-attaches to a machine. No immediate change unless real usage shows wrong machine assignments.

### 13. Sales amounts are derived but stored, so old rows may need resync after restores

Evidence:
- `Sale.amount` is stored.
- `sync_sale_amount()` derives it from linked job/invoice payments (`backend/app/services/sales.py:34`).
- `list_sales()` serializes rows without forcing a resync first.
- `sync_sale_amount()` is called on sale create, single-sale get, sale update, and known job-payment paths, but not during sales listing.
- Merge applies stored `sales.amount` and applies `payments` before `sales`, but this has not yet been tested with restore/merge data to prove whether stale sale amounts remain.

Impact:
- If a restore/merge changes payments after a sale row was stored, the sale amount may be stale until the sale is individually read/updated or a sync path touches it.

Likely fix direction:
- On sales list/report generation, derive amount live or batch-resync sales after payment merge.

Priority note:
- `list_sales()` now resyncs stored Sale amounts from linked job/invoice payments before returning the list, so stale values should self-correct when the Sales page loads.

## Implemented Product Decisions

### Startup machine/category defaults

Status: Done.

Decision:
- Standard machines and standard expense categories should initialize automatically at app startup, not require a manual Settings click.

Fix applied:
- Added startup defaults service that inserts missing default machines and expense categories idempotently.
- Startup runs the defaults after database migrations.
- Existing rows are not overwritten, so user edits are preserved.

### Payment visibility and sales meaning

Status: Implemented in UI/backend labels.

Decision:
- Invoice total/booked value is what the customer owes.
- Payments are cash actually received.
- Jobs and Invoices should show total, paid, and balance.
- Sales should emphasize cash collected, with booked invoice value shown separately.

Fix applied:
- Jobs rows now show total, paid, and owed.
- Invoice rows now show invoice total, paid, and owed.
- Sales rows now show cash collected, booked invoice value, and owed balance.
- Sales summary cards now separate `Cash Collected`, `Booked Value`, and `Still Owed`.
- Sales list now resyncs derived sale amounts from payment records before returning.

## Meh / Watch List

### 12. Proposal list endpoint does not include backend document payload

Evidence:
- Proposal rows are serialized without `include_document=True` in list/get routes.
- PDF download uses frontend data directly rather than backend `build_proposal_document()`.
- Current route scan found no proposal route passing `include_document=True`; `build_proposal_document()` is effectively dead code right now.

Impact:
- There are two document shapes: backend proposal document and frontend PDF component. They can drift, as seen with the missing date.

Likely fix direction:
- Either use one normalized frontend PDF payload, or add a proposal document endpoint similar to invoices.

Priority note:
- Meh for now. The frontend PDF path is the live one, and Finding 1 already fixed the date issue there.

## Suggested Next Diagnostics

1. Create an invoice with line items and payments, run a backup merge dry-run/apply between two sample DBs, then check:
   - invoice header amount
   - invoice line item count
   - payment total
   - machine revenue
   - product mix
2. Add a "money consistency" diagnostic endpoint/script that reports:
   - invoices where stored amount differs from line item subtotal minus discount
   - proposals where stored line amount differs from quantity times unit price
   - invoices/proposals with zero line items but nonzero totals
   - sales where stored amount differs from linked invoice paid/total rule
   - expense category totals split by paid vs unpaid
3. Test restore/merge sale amounts after payment changes to decide whether sales should be resynced post-merge or derived live.

## Sync/Backup UX Features To Keep

- Synced records should remain visually marked as new/from sync. The app already shows an imported dot for records whose `device_id` differs from this laptop on Jobs, Invoices, Proposals, Expenses, Sales, Petty Cash, and Advances; the tooltip now says `New from sync`.
- A future unread/acknowledged state should let the user clear the dot after opening/reviewing the synced record. Current behavior is an origin marker, not a true read/unread tracker.
- After Apply Sync, the result summary should clearly show counts for jobs, invoices, payments, proposals, invoice line items, proposal line items, expenses, sales, and skipped/conflict rows.
- Dashboard/report money cards should refresh after sync and balance against the merged details. Add post-sync checks for invoice total vs line items, proposal total vs line items, payments vs invoice paid total, and sales amount vs linked invoice paid/total.
- Conflicts should stay reviewable instead of silently overwriting this laptop's data.

## Checked From External AI Notes But Not Added As Bugs

- Backend `dict.get("quantity", item.get("qty", 1))` fallback in `apply_proposal_line_items()` is not a current live bug for the existing proposal form, because `Proposals.jsx` sends `quantity` and `unit_price` explicitly.
- Proposal edit loading does currently read backend `unit_price`, so the simple create/edit roundtrip does not automatically wipe amounts. The remaining risk is the line-total-as-rate fallback described above, plus the service picker UX issues.
- Legacy proposal-line migration does not appear to corrupt old rows in the tested case, although amount/rate drift remains reproducible when malformed rows enter through API/script/import paths.
- Exact line citations in this document may drift as code changes; treat file/function names and evidence text as authoritative unless a line number is rechecked in the current tree.
