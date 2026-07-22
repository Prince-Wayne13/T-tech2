admin page.
..gets to see every sctivity the app did...whether deleted invoices filtered and flagged changed figures all that...
...Graphs and analysis
...
reports
....need downloadable pdf and xls type data...it should auto generate monthly coverage every last da of the month
....
That makes sense — let me capture that as a spec note. Since there's no actual project file to append to yet, here's the note in a clean form you can drop into your project docs (or tell me where to save it and I'll create the actual file).

---

**Note: Vendors page — balance display**

Vendors represent suppliers (who we owe), the counterpart to Clients (who owe us).

Each vendor row should show an **outstanding balance** — the total amount currently owed to that supplier. This should **not** be a stored/static field (that's why `Vendor.balance` as a raw column was flagged for removal — stored balances drift out of sync with reality). Instead, it should be **computed/derived** at read-time (or cached and recalculated on write) from the sum of that vendor's associated expenses that are:

- approved but not yet paid, and/or
- unpaid/outstanding by whatever status logic the Expenses module uses (e.g. status ∈ {approved, unpaid} excluding {paid, reimbursed, rejected})

So on the Vendors list:
- Each row shows: vendor name, contact info, status, and **Outstanding Balance** = sum of unpaid amounts across all expenses tied to that vendor.
- Clicking into a vendor could show the breakdown (which expenses make up that total), not just the number.

This keeps the number always accurate instead of requiring manual updates whenever an expense is paid.

---

Want me to actually create this as a file (e.g. `/mnt/project/notes/vendors-balance-spec.md` or similar) so it persists, along with the log file convention you mentioned earlier? If you tell me the path/filename you want to use for the ongoing change log, I'll create both now and start appending timestamped entries under "zcodex claude" from here on.