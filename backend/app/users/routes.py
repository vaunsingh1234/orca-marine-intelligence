from fastapi import APIRouter, Depends
from sqlalchemy import func, inspect, select, text
from sqlalchemy.orm import Session

from app.db import engine, get_db
from app.users.models import User

router = APIRouter()


@router.get("/test-db")
def test_db(db: Session = Depends(get_db)) -> dict[str, object]:
    db.execute(text("SELECT 1"))
    table_names = set(inspect(engine).get_table_names())
    user_count = db.scalar(select(func.count()).select_from(User)) or 0
    dialect = engine.dialect.name
    using_sqlite = dialect == "sqlite"
    payload: dict[str, object] = {
        "status": "ok",
        "database": "connected",
        "dialect": dialect,
        "using_sqlite": using_sqlite,
        "users_table": "ok" if "users" in table_names else "missing",
        "locations_table": "ok" if "locations" in table_names else "missing",
        "vessels_table": "ok" if "vessels" in table_names else "missing",
        "user_count": user_count,
    }
    if not using_sqlite:
        payload["current_database"] = db.execute(text("SELECT current_database()")).scalar()
        if "locations" in table_names:
            payload["location_count"] = db.execute(text("SELECT COUNT(*) FROM locations")).scalar()
        if "vessels" in table_names:
            payload["vessel_count"] = db.execute(text("SELECT COUNT(*) FROM vessels")).scalar()
    return payload
