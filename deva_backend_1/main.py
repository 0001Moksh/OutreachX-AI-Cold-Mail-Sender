import os
import sys
from types import ModuleType

# Mock pkg_resources to prevent Vercel python 3.12 setuptools ModuleNotFoundError
if "pkg_resources" not in sys.modules:
    pkg_resources_mock = ModuleType("pkg_resources")
    def mock_parse_version(version_str):
        try:
            from packaging.version import parse
            return parse(version_str)
        except ImportError:
            import re
            parts = [int(x) if x.isdigit() else x for x in re.split(r'(\d+)', version_str) if x]
            return tuple(parts)
    pkg_resources_mock.parse_version = mock_parse_version
    sys.modules["pkg_resources"] = pkg_resources_mock

from dotenv import load_dotenv

# Load environment variables prior to imports to prevent DB session crash
backend_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(backend_env_path):
    load_dotenv(backend_env_path, override=True)
else:
    load_dotenv()


# Adjust paths to import shared and deva modules
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)
if current_dir not in sys.path:
    sys.path.append(current_dir)

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from shared.database import get_db, SessionLocal
from shared.models import AIMemory, User
from deva.api.auth import get_current_user
from deva.services.llm_service import LLMService
from deva.agents.memory_agent import MemoryAgent

app = FastAPI(
    title="OutreachX Deva Backend 1 - Core & Memory",
    description="Handles core chat, memory management, and general personalization",
    version="1.0.0"
)

# CORS configuration
origins = ["*"]
allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
if allowed_origins_env:
    origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True if origins != ["*"] else False,
    allow_methods=["*"],
    allow_headers=["*"]
)

class ChatRequest(BaseModel):
    message: str
    conversation_id: str
    user_id: str
    chat_history: List[Dict[str, str]]

class ActionRequest(BaseModel):
    action: str
    payload: Dict[str, Any]
    user_id: str

@app.post("/chat")
async def chat_node(request: ChatRequest):
    """Execute general chat response and memory candidate extraction"""
    db = SessionLocal()
    try:
        user_id = request.user_id
        message = request.message
        chat_history = request.chat_history
        
        # Simple conversation handler using user's specific context & memory-first summaries
        from deva.services.vector_service import VectorService
        
        # Load user memory summaries from Pinecone/Postgres (Memory-First)
        memories = db.query(AIMemory).filter(
            AIMemory.user_id == user_id,
            AIMemory.message_type == "fact"
        ).order_by(AIMemory.importance_score.desc()).limit(5).all()
        
        memory_context = ""
        if memories:
            memory_context = "\nWhat you know about the user:\n" + "\n".join([f"- {m.content}" for m in memories])

        prompt = f"You are Deva, the AI Operating System of OutreachX. Answer concisely and guide the user toward their outreach goals.{memory_context}"
        
        response = await LLMService.call_llm(
            system_prompt=prompt,
            user_message=message,
            chat_history=chat_history,
            json_output=False
        )
        
        actions = []
        memory_candidate = await MemoryAgent.extract_candidate_memory(db, user_id, message)
        if memory_candidate:
            actions.append(memory_candidate)
            
        return {
            "response_message": response,
            "actions": actions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.post("/actions")
async def execute_action(request: ActionRequest):
    """Execute memory approval action"""
    db = SessionLocal()
    try:
        user_id = request.user_id
        action_type = request.action
        payload = request.payload
        
        if action_type == "approve_memory":
            import uuid
            fact_type = payload.get("fact_type", "experience")
            fact_value = payload.get("value")
            
            if not fact_value:
                raise HTTPException(status_code=400, detail="Missing fact value")
                
            new_fact = AIMemory(
                id=uuid.uuid4(),
                user_id=uuid.UUID(user_id) if isinstance(user_id, str) else user_id,
                message_type="fact",
                role="system",
                content=fact_value,
                extracted_entities={"type": fact_type},
                importance_score=5
            )
            db.add(new_fact)
            db.commit()
            
            # Vectorize memory in Pinecone
            from deva.services.vector_service import VectorService
            vector_id = f"mem_{new_fact.id.hex}"
            await VectorService.upsert_vector(
                user_id=user_id,
                vector_id=vector_id,
                text=fact_value,
                metadata={"type": "memory", "memory_id": str(new_fact.id)}
            )
            
            return {
                "success": True,
                "message": f"I've updated my memories to remember: '{fact_value}'"
            }
        else:
            raise HTTPException(status_code=400, detail=f"Action '{action_type}' not supported by Backend 1")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.get("/health")
def health():
    return {"status": "healthy", "backend": 1}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
