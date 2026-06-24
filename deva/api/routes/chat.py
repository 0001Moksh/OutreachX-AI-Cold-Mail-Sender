from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import httpx
import os

from shared.database import get_db
from shared.models import User, AIMemory
from deva.api.auth import get_current_user
from deva.workflows.orchestrator import DevaOrchestrator
from deva.agents.gateway_agent import GatewayAgent
from deva.agents.memory_agent import MemoryAgent

router = APIRouter(prefix="/deva", tags=["Deva Chat"])

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None

class ActionResponse(BaseModel):
    type: str
    label: str
    payload: Dict[str, Any]

class ChatResponse(BaseModel):
    conversation_id: str
    message: str
    actions: List[ActionResponse]

IS_PRODUCTION = os.getenv("VERCEL") or os.getenv("ENVIRONMENT") == "production"

# Port mapping for backend cluster routing (Production Vercel URLs vs Localhost ports)
BACKEND_ROUTING = {
    "general": os.getenv("DEVA_BACKEND_1_URL", "https://deva-backend-1.vercel.app/chat" if IS_PRODUCTION else "http://localhost:8002/chat"),
    "memory": os.getenv("DEVA_BACKEND_1_URL", "https://deva-backend-1.vercel.app/chat" if IS_PRODUCTION else "http://localhost:8002/chat"),
    "lead": os.getenv("DEVA_BACKEND_2_URL", "https://deva-backend-2.vercel.app/chat" if IS_PRODUCTION else "http://localhost:8003/chat"),
    "asset": os.getenv("DEVA_BACKEND_2_URL", "https://deva-backend-2.vercel.app/chat" if IS_PRODUCTION else "http://localhost:8003/chat"),
    "template": os.getenv("DEVA_BACKEND_3_URL", "https://deva-backend-3.vercel.app/chat" if IS_PRODUCTION else "http://localhost:8004/chat"),
    "campaign": os.getenv("DEVA_BACKEND_3_URL", "https://deva-backend-3.vercel.app/chat" if IS_PRODUCTION else "http://localhost:8004/chat"),
    "planner": os.getenv("DEVA_BACKEND_3_URL", "https://deva-backend-3.vercel.app/chat" if IS_PRODUCTION else "http://localhost:8004/chat")
}


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Routing proxy and load-balancer API Gateway forwarding requests to clustered ports"""
    user_id = str(current_user.id)
    conversation_id = request.conversation_id or f"conv_{current_user.id}"
    
    # 1. Fetch chat history (excluding workflow states)
    history_records = db.query(AIMemory).filter(
        AIMemory.user_id == user_id,
        AIMemory.conversation_id == conversation_id,
        AIMemory.message_type == "chat"
    ).order_by(AIMemory.created_at.asc()).all()
    
    chat_history = []
    for rec in history_records:
        chat_history.append({
            "role": rec.role,
            "content": rec.content
        })

    # Intercept greetings if workflow state is active (Problems #16, #17)
    message_clean = request.message.strip().lower().strip(".!?")
    greetings = {"hi", "hello", "hey", "hola", "greetings", "good morning", "good afternoon", "good evening", "yo", "deva", "hi deva", "hello deva", "hey deva"}

    from deva.workflows.state_store import WorkflowStateStore
    active_state = WorkflowStateStore.get_state(db, user_id, conversation_id)

    if message_clean == "clear history" or message_clean == "clear cache":
        db.query(AIMemory).filter(
            AIMemory.user_id == user_id,
            AIMemory.conversation_id == conversation_id
        ).delete()
        db.commit()
        
        # Clear LLM cache as well
        from deva.services.llm_service import _LLM_CACHE
        _LLM_CACHE.clear()
        
        return ChatResponse(
            conversation_id=conversation_id,
            message="Your chat history and cache have been successfully cleared. Let's start fresh!",
            actions=[]
        )

    if message_clean in greetings:
        if active_state:
            # Persist messages to chat history
            user_msg = AIMemory(
                user_id=current_user.id,
                conversation_id=conversation_id,
                role="user",
                content=request.message,
                message_type="chat"
            )
            deva_msg = AIMemory(
                user_id=current_user.id,
                conversation_id=conversation_id,
                role="assistant",
                content="Hello! I noticed you have an active workflow in progress. Would you like to resume it or start a new one?",
                message_type="chat"
            )
            db.add(user_msg)
            db.add(deva_msg)
            db.commit()
    
            return ChatResponse(
                conversation_id=conversation_id,
                message="Hello! I noticed you have an active workflow in progress. Would you like to resume it or start a new one?",
                actions=[
                    ActionResponse(
                        type="resume_workflow",
                        label="Resume Workflow",
                        payload={"conversation_id": conversation_id}
                    ),
                    ActionResponse(
                        type="clear_workflow",
                        label="Start Fresh",
                        payload={"conversation_id": conversation_id}
                    )
                ]
            )
        else:
            # Normal greeting bypass
            user_msg = AIMemory(
                user_id=current_user.id,
                conversation_id=conversation_id,
                role="user",
                content=request.message,
                message_type="chat"
            )
            deva_msg = AIMemory(
                user_id=current_user.id,
                conversation_id=conversation_id,
                role="assistant",
                content="Hello! I am Deva, your AI Outreach assistant. How can I help you today?",
                message_type="chat"
            )
            db.add(user_msg)
            db.add(deva_msg)
            db.commit()
            
            return ChatResponse(
                conversation_id=conversation_id,
                message="Hello! I am Deva, your AI Outreach assistant. How can I help you today?",
                actions=[
                    ActionResponse(
                        type="clear_history",
                        label="Clear Chat History",
                        payload={"conversation_id": conversation_id}
                    )
                ]
            )

    # 2. Local Intent Router
    try:
        routing = await GatewayAgent.route_message(request.message, chat_history)
        route = routing.get("route", "general")
    except Exception as e:
        print(f"Gateway Agent route classification failed: {e}. Defaulting to general.")
        route = "general"
        
    message_lower = request.message.lower().strip()
    print(f"DEBUG: message_lower = '{message_lower}'")
    print(f"DEBUG: initial route = '{route}'")
    
    # Heuristic override if LLM routing fails or misclassifies as memory for obvious lead queries
    lead_keywords = ["lead", "companies", "company", "comapny", "hiring", "intern", "prospect"]
    print(f"DEBUG: any match = {any(k in message_lower for k in lead_keywords)}")
    if any(k in message_lower for k in lead_keywords):
        route = "lead"
    print(f"DEBUG: final route = '{route}'")

    # Direct command sync shortcut (Requirement #2)
    prefixes = ["remember this:", "remember that:", "save memory:", "remember:"]
    is_explicit_memory = any(message_lower.startswith(p) for p in prefixes)
    if is_explicit_memory:
        route = "memory"

    # Intercept upload lead request
    is_upload_lead = (
        "upload" in message_lower and "lead" in message_lower
    )
    
    if is_upload_lead:
        user_msg = AIMemory(
            user_id=current_user.id,
            conversation_id=conversation_id,
            role="user",
            content=request.message,
            message_type="chat"
        )
        deva_msg = AIMemory(
            user_id=current_user.id,
            conversation_id=conversation_id,
            role="assistant",
            content="Please use the widget below to upload your lead file.",
            message_type="chat"
        )
        db.add(user_msg)
        db.add(deva_msg)
        db.commit()
        
        return ChatResponse(
            conversation_id=conversation_id,
            message="Please use the widget below to upload your lead file.",
            actions=[
                ActionResponse(
                    type="lead_uploader",
                    label="Upload Lead File",
                    payload={}
                )
            ]
        )

    # Intercept upload resume request (Resume Uploader Widget)
    is_upload_resume = (
        (routing.get("intent") == "upload_resume" or routing.get("route") == "asset") or
        ("upload" in message_lower and ("resume" in message_lower or "cv" in message_lower or "portfolio" in message_lower or "asset" in message_lower or "document" in message_lower))
    )
    
    if is_upload_resume and not any(k in message_lower for k in ["search", "find", "query", "who", "what", "where", "how", "lead"]):
        user_msg = AIMemory(
            user_id=current_user.id,
            conversation_id=conversation_id,
            role="user",
            content=request.message,
            message_type="chat"
        )
        deva_msg = AIMemory(
            user_id=current_user.id,
            conversation_id=conversation_id,
            role="assistant",
            content="Please use the widget below to upload your resume or document to my retrieval memory.",
            message_type="chat"
        )
        db.add(user_msg)
        db.add(deva_msg)
        db.commit()
        
        return ChatResponse(
            conversation_id=conversation_id,
            message="Please use the widget below to upload your resume or document to my retrieval memory.",
            actions=[
                ActionResponse(
                    type="widget_asset_uploader",
                    label="Upload Outreach Asset",
                    payload={}
                )
            ]
        )
        
    target_url = BACKEND_ROUTING.get(route, "http://localhost:8002/chat")
    sub_backend_response = None
    actions_list = []
    
    # 3. Try to forward request to target clustered sub-backend
    if route != "memory":
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    target_url,
                    json={
                        "message": request.message,
                        "conversation_id": conversation_id,
                        "user_id": user_id,
                        "chat_history": chat_history
                    }
                )
                if resp.status_code == 200:
                    sub_backend_response = resp.json()
        except Exception as e:
            print(f"Clustered sub-backend forwarding to {target_url} failed: {e}. Executing local fallback graph.")

    # 4. Local fallback execution inside Gateway (8001) if port is down or memory command
    if sub_backend_response is None:
        orchestrator = DevaOrchestrator(db)
        result = await orchestrator.process_chat(
            user_id=user_id,
            conversation_id=conversation_id,
            message=request.message,
            chat_history=chat_history,
            forced_route=route
        )
        msg_out = result["message"]
        actions_list = result["actions"]
    else:
        msg_out = sub_backend_response.get("response_message", "No response received.")
        actions_list = sub_backend_response.get("actions", [])
        
    # 5. Persist message history
    user_msg_rec = AIMemory(
        user_id=current_user.id,
        conversation_id=conversation_id,
        role="user",
        content=request.message,
        message_type="chat"
    )
    deva_msg_rec = AIMemory(
        user_id=current_user.id,
        conversation_id=conversation_id,
        role="assistant",
        content=msg_out,
        message_type="chat"
    )
    db.add(user_msg_rec)
    db.add(deva_msg_rec)
    db.commit()
    
    # Extract candidate facts for general conversation flow
    if route != "memory" and not is_explicit_memory:
        try:
            memory_candidate = await MemoryAgent.extract_candidate_memory(db, user_id, request.message)
            if memory_candidate:
                actions_list.append(memory_candidate)
        except Exception as e:
            print(f"Memory candidate extraction skipped: {e}")
            
    return ChatResponse(
        conversation_id=conversation_id,
        message=msg_out,
        actions=actions_list
    )
