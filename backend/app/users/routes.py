from fastapi import APIRouter, Depends
from sqlalchemy import func, inspect, select, text
from sqlalchemy.orm import Session

from app.db import engine, get_db
from app.users.models import User

router = APIRouter()


@router.get("/test-db")
def test_db(db: Session = Depends(get_db)) -> dict[str, object]:
    db.execute(text("SELECT 1"))
    table_names = inspect(engine).get_table_names()
    user_count = db.scalar(select(func.count()).select_from(User)) or 0
    return {
        "status": "ok",
        "database": "connected",
        "users_table": "ok" if "users" in table_names else "missing",
        "user_count": user_count,
    }
