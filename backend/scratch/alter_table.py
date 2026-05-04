import os
import asyncio
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def run_migrations():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS template_id UUID;"))
            conn.execute(text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS variable_mapping JSONB;"))
            conn.execute(text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS last_processed_index INTEGER DEFAULT 0;"))
            conn.execute(text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS failed_count INTEGER DEFAULT 0;"))
            conn.commit()
            print("Successfully added Campaign columns!")
        except Exception as e:
            print(f"Error migrating campaigns table: {e}")

if __name__ == "__main__":
    run_migrations()
