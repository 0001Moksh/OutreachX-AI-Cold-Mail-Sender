from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from shared.models import AIMemory
from deva.services.llm_service import LLMService
from deva.prompts.system_prompts import MEMORY_EXTRACTION_PROMPT

class MemoryAgent:
    @staticmethod
    async def extract_candidate_memory(
        db: Session,
        user_id: str,
        message: str
    ) -> Optional[Dict[str, Any]]:
        """Scan a chat message for useful facts and return a candidate if it does not already exist"""
        
        # 1. Ask LLM to extract potential facts
        result = await LLMService.call_llm_json(
            system_prompt=MEMORY_EXTRACTION_PROMPT,
            user_message=message
        )
        
        if not result.get("extracted", False) or not result.get("candidate"):
            return None
            
        candidate = result["candidate"]
        fact_value = candidate.get("value", "")
        
        if not fact_value:
            return None
            
        # 2. Scope search by user_id to prevent duplicates
        existing = db.query(AIMemory).filter(
            AIMemory.user_id == user_id,
            AIMemory.message_type == "fact",
            AIMemory.content.ilike(f"%{fact_value}%")
        ).first()
        
        if existing:
            return None
            
        # Return candidate format for frontend approve action
        return {
            "type": "approve_memory",
            "label": f"Remember: {fact_value}",
            "payload": {
                "fact_type": candidate.get("type", "experience"),
                "value": fact_value
            }
        }
