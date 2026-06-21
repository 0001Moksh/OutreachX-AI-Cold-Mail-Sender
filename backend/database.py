import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Create SQLAlchemy engine
# DATABASE_URL is required at runtime, but we allow missing during import
# to enable app startup for health checks
if DATABASE_URL:
    # Use NullPool when running on Vercel (serverless) or with PgBouncer transaction mode.
    # Vercel lambdas cannot maintain persistent TCP connections, and PgBouncer
    # transaction-mode pooling requires each checkout to be a fresh connection.
    # NullPool disables SQLAlchemy's internal pool, creating/closing connections
    # per request — safe and correct for serverless + PgBouncer environments.
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
