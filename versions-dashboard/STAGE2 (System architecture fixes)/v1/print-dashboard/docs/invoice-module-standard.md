# Invoice Module Reference Standard

Invoices are the reference implementation for operational modules in this dashboard. New and existing sidebar pages should use the same module contract unless a page is read-only by design.

## Required Page Structure

Every operational module should follow this order:

1. `ModuleHeader` for title, subtitle, and primary action.
2. `StatsGrid` with four concise business metrics.
3. `ModuleToolbar` for segmented filtering and search.
4. `RegisterCard` for loading, error, empty, and record list states.
5. A shared entry modal from `components/Modals.jsx`.
6. A preview modal or print preview modal.
7. `ModuleToast` for save, update, and failure feedback.

## Request Lifecycle

Pages should use the Invoice lifecycle:

1. Set `loading` and clear `error`.
2. Fetch backend rows through `api/*` helpers.
3. Normalize backend rows through a local `map*` function.
4. Save through `api.create*` or `api.update*`.
5. Close the modal, preview the saved record, show a toast, and refresh the list.
6. Never use `window.location.reload()` for CRUD refreshes.

## UX Contract

All sidebar modules should match Invoices for:

- Modal close behavior and footer actions.
- Compact form spacing and segmented controls.
- Search placeholder language: `Search client, title, or ID...` adapted only when the entity requires different nouns.
- List row actions: preview first, edit when mutable, export/share where useful.
- Loading, error, and empty states inside the register card.
- Toast messages for create/update/failure.

## Current Shared Implementation

The shared primitives live in `src/components/ModuleStandard.jsx`. `src/Invoices.jsx` is the canonical implementation.

Aligned modules:

- `src/Jobs.jsx`
- `src/Proposals.jsx`
- `src/Receivables.jsx`
- `src/Payables.jsx`
- `src/Expenses.jsx`
- `src/Vendors.jsx`
- `src/Advances.jsx`
- `src/Reports.jsx`
- `src/AuditLog.jsx`
- `src/Archive.jsx`
- `src/ExportData.jsx`

`Settings` remains a configuration page rather than an operating register, but it should still reuse the same modal/toast primitives when settings become editable.
