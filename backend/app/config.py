import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BACKEND_DIR / ".env"
load_dotenv(ENV_FILE, override=True)


def _csv_list(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


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
    ai_api_key: str
    ai_base_url: str
    ai_model: str

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
        groq_key = os.getenv("GROQ_API_KEY", "").strip()
        openai_key = os.getenv("OPENAI_API_KEY", "").strip()
        self.ai_api_key = (
            os.getenv("ORCA_AI_API_KEY", "").strip() or groq_key or openai_key
        )
        configured_base = os.getenv("ORCA_AI_BASE_URL", "").strip().rstrip("/")
        if configured_base:
            self.ai_base_url = configured_base
        elif groq_key and not openai_key:
            self.ai_base_url = "https://api.groq.com/openai/v1"
        else:
            self.ai_base_url = "https://api.openai.com/v1"
        configured_model = os.getenv("ORCA_AI_MODEL", "").strip()
        if configured_model:
            self.ai_model = configured_model
        elif "groq.com" in self.ai_base_url:
            self.ai_model = "llama-3.1-8b-instant"
        else:
            self.ai_model = "gpt-4o-mini"


settings = Settings()
