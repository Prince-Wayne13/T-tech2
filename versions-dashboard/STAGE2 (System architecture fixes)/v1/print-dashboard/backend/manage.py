from app import create_app
from app.extensions import db
from app.seed import seed_mock_data

app = create_app()


@app.cli.command("init-db")
def init_db():
    db.create_all()
    print("Database tables created.")


@app.cli.command("seed-mock")
def seed_mock():
    db.create_all()
    result = seed_mock_data()
    print(result["message"] if "message" in result else f"Seeded mock data: {result}")


@app.cli.command("reset-mock-db")
def reset_mock_db():
    db.drop_all()
    db.create_all()
    result = seed_mock_data(reset=True)
    print(f"Reset database and seeded mock data: {result}")


if __name__ == "__main__":
    app.run()
