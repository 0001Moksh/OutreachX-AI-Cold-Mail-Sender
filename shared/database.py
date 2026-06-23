import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv
# Load .env relative to this shared/database.py file location (root directory of project)
shared_env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
if os.path.exists(shared_env_path):
    load_dotenv(shared_env_path)
else:
    load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Create SQLAlchemy engine
# DATABASE_URL is required at runtime, but we allow missing during import
# to enable app startup for health checks
if DATABASE_URL:
    # Use NullPool when running on Vercel (serverless) or with PgBouncer transaction mode.
    is_serverless = (
        os.getenv("VERCEL")
        or "pgbouncer=true" in DATABASE_URL
        or "pooler.supabase.com" in DATABASE_URL
    )
    engine = create_engine(
        DATABASE_URL,
        poolclass=NullPool if is_serverless else None,
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
else:
    engine = None
    SessionLocal = None

# Base class for declarative models
Base = declarative_base()

# Dependency for FastAPI
def get_db():
    if SessionLocal is None:
        raise RuntimeError(
            "Database not configured. Please set DATABASE_URL environment variable. "
            "For Render deployment, add DATABASE_URL to your environment variables."
        )
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
