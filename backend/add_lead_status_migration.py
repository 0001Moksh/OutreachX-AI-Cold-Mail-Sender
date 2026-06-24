"""
Migration: Add status tracking columns to the leads table.
Run once to add status, row_count, error_message, file_size_bytes columns.
Safe to re-run — uses IF NOT EXISTS.
"""
import os
import sys

# Setup path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from shared.database import engine

STATEMENTS = [
    "ALTER TABLE leads ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'ready'",
    "ALTER TABLE leads ADD COLUMN IF NOT EXISTS row_count INTEGER DEFAULT 0",
    "ALTER TABLE leads ADD COLUMN IF NOT EXISTS error_message TEXT",
    "ALTER TABLE leads ADD COLUMN IF NOT EXISTS file_size_bytes INTEGER DEFAULT 0",
    "ALTER TABLE leads ALTER COLUMN content DROP NOT NULL",
    "UPDATE leads SET status = 'ready' WHERE status IS NULL OR status = ''",
    "UPDATE leads SET row_count = jsonb_array_length(content) WHERE row_count = 0 AND content IS NOT NULL AND jsonb_typeof(content) = 'array'",
]

def run_migration():
    if engine is None:
        print("ERROR: DATABASE_URL not configured")
        sys.exit(1)

    print("Running leads status migration...")
    
    with engine.connect() as conn:
        for stmt in STATEMENTS:
            try:
                conn.execute(text(stmt))
                print(f"  OK: {stmt[:80]}...")
            except Exception as e:
                print(f"  WARN: {e}")
        conn.commit()
    
    print("Migration complete!")

if __name__ == "__main__":
    run_migration()
