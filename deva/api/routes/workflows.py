from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional

from shared.database import get_db
from shared.models import User
from deva.api.auth import get_current_user
from deva.workflows.state_store import WorkflowStateStore

router = APIRouter(prefix="/deva", tags=["Deva Workflows"])

@router.get("/workflows", response_model=Dict[str, Any])
async def get_active_workflow(
    conversation_id: str = Query(..., description="ID of the conversation session"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve any active workflow state for resumption"""
    user_id = str(current_user.id)
    
    state = WorkflowStateStore.get_state(db, user_id, conversation_id)
    if not state:
        return {
            "conversation_id": conversation_id,
            "has_active_workflow": False,
            "state": {}
        }
        
    return {
        "conversation_id": conversation_id,
        "has_active_workflow": True,
        "state": state
    }
