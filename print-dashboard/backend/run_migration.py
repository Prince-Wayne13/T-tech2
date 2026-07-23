# path: backend/run_migration.py
#
# One-off script to fix the current "no such table: staff" / "no such column:
# expenses.category_id" errors. Run this once from the backend/ directory:
#
#     python run_migration.py
#
# Safe to re-run — every step in schema_migrations.py is idempotent (checks
# before altering), so running this twice does nothing harmful the second
# time.

from app import create_app
from app.schema_migrations import run_full_upgrade

app = create_app()

with app.app_context():
    result = run_full_upgrade()
    print("Migration complete:")
    for section, detail in result.items():
        print(f"  {section}: {detail}")