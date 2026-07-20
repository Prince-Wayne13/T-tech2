# T-Tech Print Dashboard Backend

Modular Flask backend for the print dashboard.

## Local setup

```powershell
cd backend
py -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
flask --app manage.py init-db
flask --app manage.py seed-mock
flask --app manage.py run
```

The API runs at `http://localhost:5000/api`.

For a clean local demo database with fresh mock data:

```powershell
flask --app manage.py reset-mock-db
```

## Architecture

- `app/__init__.py` exposes the Flask application factory used locally and by WSGI.
- `app/routes/` contains small API blueprints by business area.
- `app/models.py` owns SQLAlchemy models for clients, print jobs, invoices, invoice line items, payments, expenses, suppliers and audit logs.
- `app/services/` contains business logic for invoice totals, invoice documents, reporting and exports.
- `app/seed.py` creates realistic printing-company mock data for local development.

Invoice endpoints now support professional line-item billing:

- `GET /api/invoices` returns invoices with totals, line items, payments and balance.
- `GET /api/invoices/<id>/document` returns a printable invoice payload with company profile, production summary, totals and banking details.
- `GET /api/invoices/stats` returns invoice KPIs.

Reports are generated from the database:

- `GET /api/reports/dashboard`
- `GET /api/reports/financials?period=month`
- `GET /api/reports`

## PythonAnywhere

Use `wsgi.py` as the WSGI entry point:

```python
from app import create_app
application = create_app("production")
```

Set environment variables in the PythonAnywhere web app config:

```txt
FLASK_ENV=production
SECRET_KEY=...
DATABASE_URL=...
CORS_ORIGINS=https://your-frontend-domain
COMPANY_NAME=...
COMPANY_PHONE=...
COMPANY_EMAIL=...
COMPANY_ADDRESS=...
```

SQLite is fine for early testing. For heavier use, switch `DATABASE_URL` to MySQL on PythonAnywhere.
