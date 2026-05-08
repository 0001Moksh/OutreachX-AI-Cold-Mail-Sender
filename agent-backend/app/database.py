from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime
import json
from typing import Any, Iterator
import uuid

from sqlalchemy import create_engine, text
from sqlalchemy.engine import RowMapping
from sqlalchemy.orm import Session, sessionmaker

from .config import get_settings

settings = get_settings()

engine = create_engine(settings.database_url, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


@contextmanager
def session_scope() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def _rows_to_dicts(rows: list[RowMapping]) -> list[dict[str, Any]]:
    return [dict(row) for row in rows]


def _first_or_none(row: RowMapping | None) -> dict[str, Any] | None:
    return dict(row) if row is not None else None


def _jsonb_value(value: Any) -> str:
    return json.dumps(value if value is not None else {}, default=str)


def get_user_profile(user_id: str) -> dict[str, Any] | None:
    with session_scope() as db:
        row = db.execute(
            text(
                """
                SELECT id, email, full_name, phone, role, resume_uploaded, is_verified, status,
                       created_at, updated_at
                FROM users
                WHERE id = :user_id
                """
            ),
            {"user_id": user_id},
        ).mappings().first()
        return _first_or_none(row)


def list_assets(user_id: str, limit: int = 5) -> list[dict[str, Any]]:
    with session_scope() as db:
        rows = db.execute(
            text(
                """
                SELECT id, name, asset_type, source_type, description, file_url, tags, is_verified, created_at
                FROM assets
                WHERE user_id = :user_id
                ORDER BY created_at DESC
                LIMIT :limit
                """
            ),
            {"user_id": user_id, "limit": limit},
        ).mappings().all()
        return _rows_to_dicts(rows)


def list_templates(user_id: str, limit: int = 5) -> list[dict[str, Any]]:
    with session_scope() as db:
        rows = db.execute(
            text(
                """
                SELECT id, name, description, subject_line, is_ai_generated, tags, variables, preview_url, created_at
                FROM templates
                WHERE user_id = :user_id
                ORDER BY created_at DESC
                LIMIT :limit
                """
            ),
            {"user_id": user_id, "limit": limit},
        ).mappings().all()
        return _rows_to_dicts(rows)


def list_campaigns(user_id: str, limit: int = 5) -> list[dict[str, Any]]:
    with session_scope() as db:
        rows = db.execute(
            text(
                """
                SELECT id, name, description, status, total_leads, sent_count, opened_count,
                       replied_count, bounced_count, failed_count, scheduled_at, started_at,
                       completed_at, template_id, variable_mapping, created_at, updated_at
                FROM campaigns
                WHERE user_id = :user_id
                ORDER BY created_at DESC
                LIMIT :limit
                """
            ),
            {"user_id": user_id, "limit": limit},
        ).mappings().all()
        return _rows_to_dicts(rows)


def list_leads(user_id: str, limit: int = 5) -> list[dict[str, Any]]:
    with session_scope() as db:
        rows = db.execute(
            text(
                """
                SELECT id, file_name, content, columns, campaign_id, created_at, updated_at
                FROM leads
                WHERE user_id = :user_id
                ORDER BY created_at DESC
                LIMIT :limit
                """
            ),
            {"user_id": user_id, "limit": limit},
        ).mappings().all()
        return _rows_to_dicts(rows)


def list_recent_memory(user_id: str, limit: int = 5) -> list[dict[str, Any]]:
    with session_scope() as db:
        rows = db.execute(
            text(
                """
                SELECT id, role, content, message_type, conversation_id, importance_score,
                       metadata, created_at
                FROM ai_memory
                WHERE user_id = :user_id
                ORDER BY created_at DESC
                LIMIT :limit
                """
            ),
            {"user_id": user_id, "limit": limit},
        ).mappings().all()
        return _rows_to_dicts(rows)


def store_memory(
    user_id: str,
    role: str,
    content: str,
    conversation_id: str | None = None,
    message_type: str | None = None,
    importance_score: int = 0,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    memory_id = str(uuid.uuid4())
    with session_scope() as db:
        db.execute(
            text(
                """
                INSERT INTO ai_memory (
                    id, user_id, conversation_id, message_type, role, content,
                    importance_score, metadata, created_at
                ) VALUES (
                    :id, :user_id, :conversation_id, :message_type, :role, :content,
                    :importance_score, CAST(:metadata AS jsonb), :created_at
                )
                """
            ),
            {
                "id": memory_id,
                "user_id": user_id,
                "conversation_id": conversation_id,
                "message_type": message_type,
                "role": role,
                "content": content,
                "importance_score": importance_score,
                "metadata": _jsonb_value(metadata),
                "created_at": datetime.utcnow(),
            },
        )
    return {"id": memory_id, "conversation_id": conversation_id, "role": role, "content": content}


def create_campaign(user_id: str, name: str, description: str | None = None) -> dict[str, Any]:
    campaign_id = str(uuid.uuid4())
    with session_scope() as db:
        db.execute(
            text(
                """
                INSERT INTO campaigns (id, user_id, name, description, status, created_at, updated_at)
                VALUES (:id, :user_id, :name, :description, 'draft', :created_at, :updated_at)
                """
            ),
            {
                "id": campaign_id,
                "user_id": user_id,
                "name": name,
                "description": description,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            },
        )
    return {"id": campaign_id, "name": name, "description": description, "status": "draft"}


def update_campaign(user_id: str, campaign_id: str, **updates: Any) -> dict[str, Any] | None:
    allowed_fields = {"name", "description", "status", "template_id", "variable_mapping"}
    filtered_updates = {key: value for key, value in updates.items() if key in allowed_fields and value is not None}
    if not filtered_updates:
        return None

    for field in ("variable_mapping",):
        if field in filtered_updates:
            filtered_updates[field] = _jsonb_value(filtered_updates[field])

    set_parts = [
        f"{field} = CAST(:{field} AS jsonb)" if field == "variable_mapping" else f"{field} = :{field}"
        for field in filtered_updates
    ]
    set_clause = ", ".join(set_parts)
    filtered_updates.update({"user_id": user_id, "campaign_id": campaign_id, "updated_at": datetime.utcnow()})

    with session_scope() as db:
        db.execute(
            text(
                f"""
                UPDATE campaigns
                SET {set_clause}, updated_at = :updated_at
                WHERE id = :campaign_id AND user_id = :user_id
                """
            ),
            filtered_updates,
        )
        row = db.execute(
            text(
                """
                SELECT id, name, description, status, template_id, variable_mapping, updated_at
                FROM campaigns
                WHERE id = :campaign_id AND user_id = :user_id
                """
            ),
            {"campaign_id": campaign_id, "user_id": user_id},
        ).mappings().first()
        return _first_or_none(row)


def delete_campaign(user_id: str, campaign_id: str) -> dict[str, Any] | None:
    with session_scope() as db:
        campaign = db.execute(
            text("SELECT id, name FROM campaigns WHERE id = :campaign_id AND user_id = :user_id"),
            {"campaign_id": campaign_id, "user_id": user_id},
        ).mappings().first()
        if campaign is None:
            return None

        db.execute(text("DELETE FROM campaign_tasks WHERE campaign_id = :campaign_id"), {"campaign_id": campaign_id})
        db.execute(text("DELETE FROM email_logs WHERE campaign_id = :campaign_id"), {"campaign_id": campaign_id})
        db.execute(text("DELETE FROM campaign_templates WHERE campaign_id = :campaign_id"), {"campaign_id": campaign_id})
        db.execute(text("UPDATE leads SET campaign_id = NULL WHERE campaign_id = :campaign_id"), {"campaign_id": campaign_id})
        db.execute(
            text("DELETE FROM campaigns WHERE id = :campaign_id AND user_id = :user_id"),
            {"campaign_id": campaign_id, "user_id": user_id},
        )
        return dict(campaign)


def build_context_bundle(user_id: str, limit: int = 5) -> dict[str, Any]:
    return {
        "profile": get_user_profile(user_id) or {},
        "assets": list_assets(user_id, limit=limit),
        "templates": list_templates(user_id, limit=limit),
        "campaigns": list_campaigns(user_id, limit=limit),
        "leads": list_leads(user_id, limit=limit),
        "memory": list_recent_memory(user_id, limit=limit),
    }
