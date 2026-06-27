import os
import asyncpg
import json
import asyncio
import sys
import redis.asyncio as redis
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.deva_tracer import trace_function

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/deva_db")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# Global Redis client
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

async def get_db_pool():
    return await asyncpg.create_pool(
        DATABASE_URL, 
        statement_cache_size=0,
        min_size=0,
        max_inactive_connection_lifetime=120
    )

@trace_function("Fetch API Keys")
async def fetch_user_keys(pool, user_id: str) -> dict:
    """Fetch and return encrypted API keys for a user."""
    query = "SELECT gemini_key, groq_key, openrouter_key, tavily_key FROM public.api_keys WHERE user_id = $1"
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, user_id)
    
    if not row:
        return {}
        
    # Return mapping matching what the rest of the backend expects
    return {
        "gemini": row["gemini_key"],
        "groq": row["groq_key"],
        "openrouter": row["openrouter_key"],
        "tavily": row["tavily_key"]
    }

@trace_function("Fetch Context")
async def fetch_recent_context(pool, user_id: str, limit: int = 5) -> str:
    """Fetch the most recent conversation context for the user, preferring Redis cache."""
    cache_key = f"context:{user_id}:{limit}"
    
    try:
        cached = await redis_client.get(cache_key)
        if cached:
            return cached
    except Exception as e:
        print(f"[Redis Warning] {e}")

    query = """
        SELECT role, content 
        FROM public.ai_memory 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, user_id, limit)
    
    # Reverse so they are chronological
    history = []
    for row in reversed(rows):
        role_str = "User" if row['role'] == "user" else "Assistant"
        history.append(f"{role_str}: {row['content']}")
        
    context_str = "\n".join(history) if history else "No previous history."
    
    # Async update Redis without blocking
    try:
        asyncio.create_task(redis_client.setex(cache_key, 300, context_str))
    except Exception as e:
        print(f"[Redis Update Warning] {e}")

    return context_str

@trace_function("Fetch User Profile")
async def fetch_user_profile(pool, user_id: str) -> dict:
    """Mock user profile fetch"""
    return {"name": "Test User", "role": "Software Engineer"}

@trace_function("Fetch Previous Agent")
async def fetch_previous_agent(pool, user_id: str) -> dict:
    """Mock fetching the last successful agent and workflow to prevent re-routing"""
    return {"last_agent": None, "current_workflow": None}

@trace_function("Build Request Context")
async def build_request_context(pool, user_id: str):
    """
    Parallel context builder. 
    Gathers keys, recent context, profile, and previous agent state concurrently.
    """
    results = await asyncio.gather(
        fetch_user_keys(pool, user_id),
        fetch_recent_context(pool, user_id, limit=5),
        fetch_user_profile(pool, user_id),
        fetch_previous_agent(pool, user_id),
        return_exceptions=True
    )
    
    # Process results (handle potential exceptions by returning defaults)
    keys = results[0] if not isinstance(results[0], Exception) else {}
    context = results[1] if not isinstance(results[1], Exception) else "Context unavailable."
    profile = results[2] if not isinstance(results[2], Exception) else {}
    previous_agent = results[3] if not isinstance(results[3], Exception) else {}
    
    return {
        "keys": keys,
        "context": context,
        "profile": profile,
        "previous_agent": previous_agent
    }
