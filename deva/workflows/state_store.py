import json
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from shared.models import AIMemory

class WorkflowStateStore:
    @staticmethod
    def get_state(db: Session, user_id: str, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve the active workflow state for a user and conversation"""
        state_record = db.query(AIMemory).filter(
            AIMemory.user_id == user_id,
            AIMemory.conversation_id == conversation_id,
            AIMemory.message_type == "workflow_state"
        ).order_by(AIMemory.created_at.desc()).first()
        
        if state_record and state_record.content:
            try:
                return json.loads(state_record.content)
            except Exception:
                return None
        return None

    @staticmethod
    def save_state(db: Session, user_id: str, conversation_id: str, state: Dict[str, Any]) -> None:
        """Save/Update the active workflow state for a user and conversation"""
        # Check if there is an existing state
        state_record = db.query(AIMemory).filter(
            AIMemory.user_id == user_id,
            AIMemory.conversation_id == conversation_id,
            AIMemory.message_type == "workflow_state"
        ).first()
        
        content_str = json.dumps(state)
        
        if state_record:
            state_record.content = content_str
        else:
            state_record = AIMemory(
                user_id=user_id,
                conversation_id=conversation_id,
                message_type="workflow_state",
                role="system",
                content=content_str,
                importance_score=10
            )
            db.add(state_record)
        
        db.commit()

    @staticmethod
    def clear_state(db: Session, user_id: str, conversation_id: str) -> None:
        """Remove workflow state when completed or cancelled"""
        db.query(AIMemory).filter(
            AIMemory.user_id == user_id,
            AIMemory.conversation_id == conversation_id,
            AIMemory.message_type == "workflow_state"
        ).delete()
        db.commit()
