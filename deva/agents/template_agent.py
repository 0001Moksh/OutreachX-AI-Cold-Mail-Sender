from typing import Dict, Any, List
from sqlalchemy.orm import Session
from shared.models import UserResume, AIMemory
from deva.services.llm_service import LLMService
from deva.prompts.system_prompts import TEMPLATE_GENERATION_PROMPT

class TemplateAgent:
    @staticmethod
    async def generate_template(
        db: Session,
        user_id: str,
        campaign_purpose: str,
        target_role: str
    ) -> Dict[str, Any]:
        """Automatically draft a personalized cold outreach template using the user's background"""
        
        # 1. Fetch resume context
        resume = db.query(UserResume).filter(UserResume.user_id == user_id).first()
        resume_summary = resume.raw_text if resume else "No resume uploaded yet."
        
        # 2. Fetch memory facts
        memories = db.query(AIMemory).filter(
            AIMemory.user_id == user_id,
            AIMemory.message_type == "fact"
        ).all()
        memory_summary = "\n".join([f"- {m.content}" for m in memories]) if memories else "No memory facts stored."
        
        # Build prompt
        context = f"""
        User Background/Resume Summary:
        {resume_summary}
        
        User Memory/Facts:
        {memory_summary}
        
        Campaign Goal: {campaign_purpose}
        Target Role/Person: {target_role}
        """
        
        llm_response = await LLMService.call_llm_json(
            system_prompt=TEMPLATE_GENERATION_PROMPT,
            user_message=context
        )
        
        # Construct the widget template editor payload
        html_content = llm_response.get("html_content", "<p>Email template</p>")
        subject_line = llm_response.get("subject_line", "Hello!")
        
        widget_action = {
            "type": "widget_template_editor",
            "label": "Open Template Editor",
            "payload": {
                "html_content": html_content,
                "subject_line": subject_line,
                "variables": llm_response.get("variables", ["company_name", "contact_name", "role"])
            }
        }
        
        return {
            "message": f"I've generated a template for your outreach sequence targeting {target_role}. You can review it and edit it below:",
            "actions": [widget_action],
            "template_data": {
                "subject": subject_line,
                "body": html_content,
                "variables": llm_response.get("variables", [])
            }
        }
