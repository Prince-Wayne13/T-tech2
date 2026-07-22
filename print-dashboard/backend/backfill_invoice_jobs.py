from app import create_app
from app.schema_migrations import upgrade_job_invoice_flow


if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        result = upgrade_job_invoice_flow()
        print(f"Upgraded Job->Invoice flow schema/data: {result}")
