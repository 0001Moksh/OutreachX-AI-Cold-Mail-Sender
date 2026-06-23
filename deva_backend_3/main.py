import os
import sys
import uuid
from datetime import datetime
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
from shared.models import Template, Lead, Campaign, EmailCredential, CampaignTask, User
from deva.api.auth import get_current_user
from deva.services.llm_service import LLMService
from deva.agents.template_agent import TemplateAgent
from deva.agents.campaign_agent import CampaignAgent

app = FastAPI(
    title="OutreachX Deva Backend 3 - Campaigns & Templates",
    description="Handles template generation, campaign workflows, template saving, and campaign launching",
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
    """Execute template generation or campaign preparation logic"""
    db = SessionLocal()
    try:
        user_id = request.user_id
        message = request.message
        
        # Simple routing heuristic for template vs campaign
        if "campaign" in message.lower() or "outreach" in message.lower():
            campaign_res = await CampaignAgent.prepare_campaign_wizard(
                db=db,
                user_id=user_id,
                campaign_name="AI Outreach Campaign"
            )
            return {
                "response_message": campaign_res["message"],
                "actions": campaign_res["actions"]
            }
        else:
            template_res = await TemplateAgent.generate_template(
                db=db,
                user_id=user_id,
                campaign_purpose=message,
                target_role="Prospect"
            )
            return {
                "response_message": template_res["message"],
                "actions": template_res["actions"]
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.post("/actions")
async def execute_action(request: ActionRequest):
    """Process template saving and campaign launches"""
    db = SessionLocal()
    try:
        user_id = request.user_id
        action_type = request.action
        payload = request.payload
        
        # 1. Save Template
        if action_type == "save_template" or action_type == "widget_template_editor":
            html_content = payload.get("html_content")
            if not html_content:
                raise HTTPException(status_code=400, detail="Missing HTML template content")
                
            subject_line = payload.get("subject_line", "Hello from OutreachX")
            template_name = payload.get("name", f"AI_Template_{int(datetime.utcnow().timestamp())}")
            
            # Extract variables
            import re
            variables = re.findall(r"\{\{([a-zA-Z0-9_]+)\}\}", html_content)
            variables = list(set(variables))
            
            new_template = Template(
                id=uuid.uuid4(),
                user_id=uuid.UUID(user_id) if isinstance(user_id, str) else user_id,
                name=template_name,
                description="AI Generated via Deva OS",
                html_content=html_content,
                subject_line=subject_line,
                is_ai_generated=True,
                variables=variables
            )
            db.add(new_template)
            db.commit()
            
            return {
                "success": True,
                "message": f"Successfully created template '{template_name}'",
                "data": {"template_id": str(new_template.id)}
            }
            
        # 2. Confirm and Run Campaign
        elif action_type == "confirm_campaign":
            campaign_name = payload.get("name", "Deva Outreach Campaign")
            leads_id = payload.get("leads_id")
            template_id = payload.get("template_id")
            variable_mapping = payload.get("variable_mapping", {})
            
            if not leads_id or not template_id:
                raise HTTPException(status_code=400, detail="Missing leads_id or template_id for campaign")
                
            # Verify details
            lead_record = db.query(Lead).filter(Lead.id == leads_id, Lead.user_id == user_id).first()
            if not lead_record:
                raise HTTPException(status_code=403, detail="Unauthorized access to leads file")
                
            template_record = db.query(Template).filter(Template.id == template_id, Template.user_id == user_id).first()
            if not template_record:
                raise HTTPException(status_code=403, detail="Unauthorized template access")
                
            # Verify verified SMTP configs
            smtp_credential = db.query(EmailCredential).filter(
                EmailCredential.user_id == user_id,
                EmailCredential.is_verified == True
            ).first()
            if not smtp_credential:
                raise HTTPException(status_code=400, detail="No verified SMTP email credential found to execute campaign")
                
            total_leads = len(lead_record.content) if isinstance(lead_record.content, list) else 0
            campaign_id = uuid.uuid4()
            
            new_campaign = Campaign(
                id=campaign_id,
                user_id=uuid.UUID(user_id) if isinstance(user_id, str) else user_id,
                name=campaign_name,
                status="running",
                template_id=template_record.id,
                variable_mapping=variable_mapping,
                total_leads=total_leads,
                started_at=datetime.utcnow()
            )
            lead_record.campaign_id = campaign_id
            db.add(new_campaign)
            db.commit()
            
            # Enqueue Celery task dynamically
            try:
                # Add backend modules to system path dynamically
                import sys
                import os
                root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                backend_dir = os.path.join(root_dir, "backend")
                if backend_dir not in sys.path:
                    sys.path.append(backend_dir)
                    
                from backend.tasks import send_campaign_emails
                task = send_campaign_emails.delay(str(campaign_id))
                
                campaign_task = CampaignTask(
                    id=uuid.uuid4(),
                    campaign_id=campaign_id,
                    user_id=uuid.UUID(user_id) if isinstance(user_id, str) else user_id,
                    task_id=str(task.id),
                    status='PENDING',
                    lead_count=total_leads,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(campaign_task)
                db.commit()
            except Exception as task_err:
                print(f"Celery task trigger / CampaignTask saving failed: {task_err}")
                
            return {
                "success": True,
                "message": f"Campaign '{campaign_name}' successfully created and initiated for {total_leads} leads!",
                "data": {"campaign_id": str(campaign_id)}
            }
        else:
            raise HTTPException(status_code=400, detail=f"Action '{action_type}' not supported by Backend 3")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.get("/health")
def health():
    return {"status": "healthy", "backend": 3}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
