import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Create SQLAlchemy engine
# DATABASE_URL is required at runtime, but we allow missing during import
# to enable app startup for health checks
if DATABASE_URL:
    engine = create_engine(DATABASE_URL)
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
