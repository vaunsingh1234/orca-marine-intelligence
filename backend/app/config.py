import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def _csv_list(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


BACKEND_DIR = Path(__file__).resolve().parent.parent


def _sqlalchemy_database_url(raw: str) -> str:
    if raw.startswith("postgres://"):
        raw = "postgresql+psycopg://" + raw[len("postgres://") :]
    elif raw.startswith("postgresql://"):
        raw = "postgresql+psycopg://" + raw[len("postgresql://") :]
    if raw.startswith("postgresql+") and "sslmode=" not in raw:
        separator = "&" if "?" in raw else "?"
        raw = f"{raw}{separator}sslmode=require"
    return raw


class Settings:
    app_name: str
    app_version: str
    cors_origins: list[str]
    database_url: str

    def __init__(self) -> None:
        self.app_name = os.getenv("APP_NAME", "ORCA Marine Intelligence API")
        self.app_version = os.getenv("APP_VERSION", "0.1.0")
        self.cors_origins = _csv_list(
            os.getenv(
                "CORS_ORIGINS",
                "http://localhost:5173,http://127.0.0.1:5173",
            )
        )
        default_db = (BACKEND_DIR / "orca.db").as_posix()
        self.database_url = _sqlalchemy_database_url(
            os.getenv("DATABASE_URL", f"sqlite:///{default_db}")
        )


settings = Settings()
