import sqlite3
from typing import Any

with open('c:/Users/renuk/Projects/cold Mail Sender/agent-backend/app/database.py', 'a') as f:
    f.write('''

def count_memory_messages(user_id: str) -> int:
    with session_scope() as db:
        result = db.execute(text("SELECT COUNT(*) FROM ai_memory WHERE user_id = :user_id"), {"user_id": user_id}).scalar()
        return result or 0

def get_old_memory_messages(user_id: str, keep_latest: int = 5) -> list[dict[str, Any]]:
    with session_scope() as db:
        rows = db.execute(
            text("""
                SELECT id, role, content, created_at 
                FROM ai_memory 
                WHERE user_id = :user_id 
                ORDER BY created_at DESC 
                OFFSET :keep_latest
            """),
            {"user_id": user_id, "keep_latest": keep_latest}
        ).mappings().all()
        return _rows_to_dicts(rows)

def delete_memory_messages(ids: list[str]):
    if not ids: return
    with session_scope() as db:
        db.execute(
            text("DELETE FROM ai_memory WHERE id = ANY(:ids)"),
            {"ids": ids}
        )
''')
