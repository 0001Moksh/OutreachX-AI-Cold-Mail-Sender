from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Any, Optional
import uuid
from datetime import datetime
import httpx

from shared.database import get_db
from shared.models import User, Template, Lead, Campaign, AIMemory, EmailCredential, CampaignTask
from deva.api.auth import get_current_user

router = APIRouter(prefix="/deva", tags=["Deva Actions"])

class ActionRequest(BaseModel):
    action: str
    payload: Dict[str, Any]

class ActionResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None

# Actions routing mapping
ACTIONS_ROUTING = {
    "approve_memory": "http://localhost:8002/actions",
    "create_lead_file": "http://localhost:8003/actions",
    "upload_asset": "http://localhost:8003/actions",
    "submit_link": "http://localhost:8003/actions",
    "save_template": "http://localhost:8004/actions",
    "widget_template_editor": "http://localhost:8004/actions",
    "confirm_campaign": "http://localhost:8004/actions"
}

@router.post("/actions", response_model=ActionResponse)
async def execute_action(
    request: ActionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Execute human-in-the-loop approved actions with fallback capabilities"""
    user_id = str(current_user.id)
    action_type = request.action
    payload = request.payload
    
    # 1. Forward action execution to targeted sub-backend
    target_url = ACTIONS_ROUTING.get(action_type)
    if target_url:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    target_url,
                    json={
                        "action": action_type,
                        "payload": payload,
                        "user_id": user_id
                    }
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return ActionResponse(
                        success=data.get("success", True),
                        message=data.get("message", "Action completed."),
                        data=data.get("data")
                    )
        except Exception as e:
            print(f"Action forwarding to sub-backend {target_url} failed: {e}. Executing local fallback in gateway.")

    # 2. Local Fallback Execution inside Gateway (8001)
    try:
        # Save Template
        if action_type == "save_template" or action_type == "widget_template_editor":
            html_content = payload.get("html_content")
            if not html_content:
                raise HTTPException(status_code=400, detail="Missing HTML content for template")
                
            subject_line = payload.get("subject_line", "Hello from OutreachX")
            template_name = payload.get("name", f"AI_Generated_Template_{int(datetime.utcnow().timestamp())}")
            
            import re
            variables = re.findall(r"\{\{([a-zA-Z0-9_]+)\}\}", html_content)
            variables = list(set(variables))
            
            new_template = Template(
                id=uuid.uuid4(),
                user_id=current_user.id,
                name=template_name,
                description="AI Generated via Deva OS",
                html_content=html_content,
                subject_line=subject_line,
                is_ai_generated=True,
                variables=variables
            )
            db.add(new_template)
            db.commit()
            
            return ActionResponse(
                success=True,
                message=f"Successfully created template '{template_name}'",
                data={"template_id": str(new_template.id)}
            )
            
        # Create Lead File
        elif action_type == "create_lead_file":
            file_name = payload.get("file_name", "Deva_Leads.csv")
            leads_list = payload.get("leads", [])
            
            if not leads_list:
                raise HTTPException(status_code=400, detail="No leads provided")
                
            columns = ["company_name", "contact_name", "email", "website", "location", "role"]
            
            new_lead_file = Lead(
                id=uuid.uuid4(),
                user_id=current_user.id,
                file_name=file_name,
                content=leads_list,
                columns=columns
            )
            db.add(new_lead_file)
            db.commit()
            
            return ActionResponse(
                success=True,
                message=f"Saved prospect list to lead file: {file_name}",
                data={"leads_id": str(new_lead_file.id)}
            )
            
        # Save Memory (Approve Candidate Fact)
        elif action_type == "approve_memory":
            fact_type = payload.get("fact_type", "experience")
            fact_value = payload.get("value")
            
            if not fact_value:
                raise HTTPException(status_code=400, detail="Missing fact description to remember")
                
            new_fact = AIMemory(
                id=uuid.uuid4(),
                user_id=current_user.id,
                message_type="fact",
                role="system",
                content=fact_value,
                extracted_entities={"type": fact_type},
                importance_score=5
            )
            db.add(new_fact)
            db.commit()
            
            # Vectorize in Pinecone
            from deva.services.vector_service import VectorService
            vector_id = f"mem_{new_fact.id.hex}"
            await VectorService.upsert_vector(
                user_id=user_id,
                vector_id=vector_id,
                text=fact_value,
                metadata={"type": "memory", "memory_id": str(new_fact.id)}
            )
            
            return ActionResponse(
                success=True,
                message=f"I've updated my memories to remember: '{fact_value}'"
            )
            
        # Start Campaign
        elif action_type == "confirm_campaign":
            campaign_name = payload.get("name", "Deva Outreach Campaign")
            leads_id = payload.get("leads_id")
            template_id = payload.get("template_id")
            variable_mapping = payload.get("variable_mapping", {})
            
            if not leads_id or not template_id:
                raise HTTPException(status_code=400, detail="Missing leads_id or template_id for campaign")
                
            lead_record = db.query(Lead).filter(Lead.id == leads_id, Lead.user_id == current_user.id).first()
            if not lead_record:
                raise HTTPException(status_code=403, detail="Unauthorized access to leads file")
                
            template_record = db.query(Template).filter(Template.id == template_id, Template.user_id == current_user.id).first()
            if not template_record:
                raise HTTPException(status_code=403, detail="Unauthorized access to template")
                
            smtp_credential = db.query(EmailCredential).filter(
                EmailCredential.user_id == current_user.id,
                EmailCredential.is_verified == True
            ).first()
            if not smtp_credential:
                raise HTTPException(status_code=400, detail="No verified SMTP email credential found to execute campaign")
                
            total_leads = len(lead_record.content) if isinstance(lead_record.content, list) else 0
            
            campaign_id = uuid.uuid4()
            new_campaign = Campaign(
                id=campaign_id,
                user_id=current_user.id,
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
            
            import sys
            import os
            root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            backend_dir = os.path.join(root_dir, "backend")
            if backend_dir not in sys.path:
                sys.path.append(backend_dir)
                
            from backend.tasks import send_campaign_emails
            task = send_campaign_emails.delay(str(campaign_id))
            
            try:
                campaign_task = CampaignTask(
                    id=uuid.uuid4(),
                    campaign_id=campaign_id,
                    user_id=current_user.id,
                    task_id=str(task.id),
                    status='PENDING',
                    lead_count=total_leads,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(campaign_task)
                db.commit()
            except Exception as task_err:
                db.rollback()
                print(f"Failed to persist CampaignTask: {task_err}")
            
            return ActionResponse(
                success=True,
                message=f"Campaign '{campaign_name}' successfully created and initiated for {total_leads} leads!",
                data={"campaign_id": str(campaign_id)}
            )

        elif action_type == "clear_workflow":
            from deva.workflows.state_store import WorkflowStateStore
            conv_id = payload.get("conversation_id", f"conv_{user_id}")
            WorkflowStateStore.clear_state(db, user_id, conv_id)
            return ActionResponse(
                success=True,
                message="I've cleared the previous workflow. Let's start fresh!"
            )

        elif action_type == "resume_workflow":
            from deva.workflows.state_store import WorkflowStateStore
            conv_id = payload.get("conversation_id", f"conv_{user_id}")
            state = WorkflowStateStore.get_state(db, user_id, conv_id) or {}
            intent = state.get("intent", "workflow")
            return ActionResponse(
                success=True,
                message=f"Resuming your previous {intent} workflow. What would you like to do next?"
            )

        else:
            raise HTTPException(status_code=400, detail=f"Unsupported action: {action_type}")
            
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Action execution failure: {str(e)}"
        )
