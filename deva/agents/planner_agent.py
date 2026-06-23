from typing import Dict, Any, List
from sqlalchemy.orm import Session
from shared.models import UserResume, Lead, Template, EmailCredential
from deva.services.llm_service import LLMService
from deva.prompts.system_prompts import PLANNER_SYSTEM_PROMPT

class PlannerAgent:
    @staticmethod
    async def perform_gap_analysis(db: Session, user_id: str, goal: str) -> Dict[str, Any]:
        """Perform database-scoped resource checks for a user's campaign preparation"""
        
        # 1. Check Resume
        resume = db.query(UserResume).filter(UserResume.user_id == user_id).first()
        has_resume = resume is not None
        
        # 2. Check Leads
        lead = db.query(Lead).filter(Lead.user_id == user_id).first()
        has_leads = lead is not None
        
        # 3. Check Template
        template = db.query(Template).filter(Template.user_id == user_id).first()
        has_template = template is not None
        
        # 4. Check SMTP (Verified Email Credentials)
        smtp = db.query(EmailCredential).filter(
            EmailCredential.user_id == user_id,
            EmailCredential.is_verified == True
        ).first()
        has_smtp = smtp is not None
        
        # Build resource state overview
        resources = {
            "resume": "found" if has_resume else "missing",
            "leads": "found" if has_leads else "missing",
            "template": "found" if has_template else "missing",
            "smtp": "found" if has_smtp else "missing"
        }
        
        missing = [k for k, v in resources.items() if v == "missing"]
        
        # Prompt LLM to write a neat roadmap message based on the goal and gaps
        user_context_summary = f"""
        User Goal: {goal}
        Database Resource Status:
        - Resume: {'Uploaded' if has_resume else 'Missing'}
        - Lead Lists: {'Available' if has_leads else 'Missing'}
        - Email Templates: {'Created' if has_template else 'Missing'}
        - SMTP configuration: {'Verified and connected' if has_smtp else 'Missing'}
        """
        
        result = await LLMService.call_llm_json(
            system_prompt=PLANNER_SYSTEM_PROMPT,
            user_message=user_context_summary
        )
        
        # Enrich actions based on actual database missing resources
        actions = []
        if not has_resume:
            actions.append({
                "type": "upload_resume",
                "label": "Upload Resume",
                "payload": {}
            })
        if not has_leads:
            actions.append({
                "type": "find_leads",
                "label": "Search for Leads",
                "payload": {"query": "Find SaaS founders"}
            })
            actions.append({
                "type": "upload_lead_file",
                "label": "Upload Excel/CSV Leads",
                "payload": {}
            })
        if not has_template:
            actions.append({
                "type": "widget_template_editor",
                "label": "Generate Email Template",
                "payload": {
                    "html_content": "<p>Hello {{contact_name}}, I noticed your company {{company_name}}...</p>"
                }
            })
            
        result["actions"] = actions
        result["missing_resources"] = missing
        result["resources_status"] = resources
        
        return result
