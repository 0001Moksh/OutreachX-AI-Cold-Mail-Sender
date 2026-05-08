from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
import os

from dotenv import load_dotenv

load_dotenv()


def _csv_env(name: str, default: str) -> list[str]:
    raw_value = os.getenv(name, default)
    return [item.strip() for item in raw_value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    app_name: str = "OutreachX Deva API"
    database_url: str = os.getenv("DATABASE_URL", "")
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    groq_model: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    groq_temperature: float = float(os.getenv("GROQ_TEMPERATURE", "0.2"))
    supabase_jwt_secret: str = os.getenv("SUPABASE_JWT_SECRET", "") or os.getenv("JWT_SECRET", "")
    allowed_origins: list[str] = tuple(
        _csv_env(
            "ALLOWED_ORIGINS",
            "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001",
        )
    )
    memory_limit: int = int(os.getenv("DEVA_MEMORY_LIMIT", "8"))
    context_limit: int = int(os.getenv("DEVA_CONTEXT_LIMIT", "5"))


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
