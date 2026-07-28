Summary — Cross-Device Backup & Restore, Progress So Far

Where this fits: implementing the two "Not Yet Built" items from your PDF status doc — cross-device backup/restore. Nothing below touches your real repo yet; everything is built and tested in a disposable clone, with files handed to you after each piece to drop in yourself.

✅ Built and tested (4 pieces)

1. Device Identity (device_identity.py, device_prompt.py — new files)
Each machine gets a permanent name + ID on first run (e.g. "Office PC" → OFFICE-PC-D9EE). A small popup window asks for the name once; never again after that. Two machines named identically still get different IDs — tested and confirmed.

2. Every record now tagged with its origin device (models.py, device_context.py)
Added a device_id column to all 20 data tables in one place, and a listener that auto-stamps it on every new/edited row, app-wide — no risk of a service file forgetting to do it. Found and fixed a real bug here (wrong event function signature) before calling it done.

3. Collision-safe reference numbers (ref_generator.py + 8 route/service files)
Your invoice, job, proposal, expense, material, and advance numbers were plain counters (last row + 1) — two offline devices could genuinely both create "INV-0005". Consolidated 13 duplicated definitions into one shared module and added a per-device prefix (JOB-4F32-0001). Confirmed via real HTTP requests through your actual API that two devices never collide, and existing old-style refs already in your database are left untouched.

4. Per-device backup folders (backup_scheduler.py, lifecycle.py, main.py)
Each machine now backs up into its own subfolder inside the shared Drive folder (TTechStudio-Backups/OFFICE-PC-4F32/...) instead of one shared pile. Wired device identity into the actual app startup sequence, including handling the very first run (show naming prompt → then boot normally).

Testing discipline throughout: every piece was actually run against realistic scenarios (multi-device simulations, corrupted files, duplicate names, fresh vs. repeat runs) — not just written and reviewed. Two real bugs were caught this way and fixed before delivery.

✗ Not yet started
The merge/restore engine itself — reading every device's subfolder, merging records by updated_at, "newest wins" with a conflict log for the losing device to review (your explicit decision from earlier)
Restore API endpoints (pick a backup, confirm, swap into place, relaunch)
Settings → Backups UI showing status and unresolved conflicts

The merge engine is the big remaining piece — everything built so far (device IDs, collision-safe refs, per-device folders) exists specifically to make that piece possible. Ready to continue into it whenever you are.