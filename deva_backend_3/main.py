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

from fastapi import FastAPI, Depends, HTTPException, status, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

try:
    from qstash import QStash, Receiver
except ImportError:
    QStash = None
    Receiver = None

from shared.database import get_db, SessionLocal
from shared.models import Template, Lead, Campaign, EmailCredential, CampaignTask, User, EmailLog
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
                    
                task_id_str = f"qstash_pending_{uuid.uuid4().hex}"
                qstash_token = os.getenv("QSTASH_TOKEN")
                is_prod = os.getenv("VERCEL") or os.getenv("ENVIRONMENT") == "production"
                webhook_url = "https://deva-backend-3.vercel.app/qstash/send-batch" if is_prod else "http://localhost:8004/qstash/send-batch"
                
                if not is_prod and os.getenv("NGROK_URL"):
                    webhook_url = f"{os.getenv('NGROK_URL')}/qstash/send-batch"
                
                if qstash_token and QStash is not None:
                    qstash_client = QStash(qstash_token)
                    res = qstash_client.publish_json(
                        url=webhook_url,
                        body={
                            "campaign_id": str(campaign_id),
                            "batch_size": 4  # Small batch to prevent Vercel 10s timeout
                        }
                    )
                    task_id_str = res.message_id
                else:
                    print("QSTASH_TOKEN missing or upstash_qstash not installed. Campaign saved but not triggered in background.")
                
                campaign_task = CampaignTask(
                    id=uuid.uuid4(),
                    campaign_id=campaign_id,
                    user_id=uuid.UUID(user_id) if isinstance(user_id, str) else user_id,
                    task_id=task_id_str,
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

@app.post("/qstash/send-batch")
async def process_campaign_batch(request: Request):
    """QStash webhook to process a batch of emails within Vercel timeout limits"""
    # 1. Verify QStash Signature (Security)
    signature = request.headers.get("Upstash-Signature")
    current_key = os.getenv("QSTASH_CURRENT_SIGNING_KEY", "")
    next_key = os.getenv("QSTASH_NEXT_SIGNING_KEY", "")
    
    if current_key and next_key and Receiver is not None and signature:
        receiver = Receiver(
            current_signing_key=current_key,
            next_signing_key=next_key
        )
        body_bytes = await request.body()
        try:
            # Reconstruct the exact URL QStash sent the request to for signature verification
            forwarded_host = request.headers.get("x-forwarded-host")
            forwarded_proto = request.headers.get("x-forwarded-proto", "https")
            if forwarded_host:
                verify_url = f"{forwarded_proto}://{forwarded_host}{request.url.path}"
            else:
                verify_url = str(request.url)
                
            receiver.verify(
                body=body_bytes.decode("utf-8"),
                signature=signature,
                url=verify_url
            )
        except Exception as e:
            print(f"QStash signature verification failed: {e}")
            raise HTTPException(status_code=401, detail="Invalid signature")
            
    body = await request.json()
    campaign_id = body.get("campaign_id")
    batch_size = body.get("batch_size", 4)
    
    if not campaign_id:
        raise HTTPException(status_code=400, detail="Missing campaign_id")

    db = SessionLocal()
    import time
    
    # Ensure backend modules are in path for EmailService
    import sys
    import os
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    backend_dir = os.path.join(root_dir, "backend")
    if backend_dir not in sys.path:
        sys.path.append(backend_dir)
        
    from backend.email_service import EmailService
    from backend.security import decrypt_credential

    try:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            return {"success": False, "message": "Campaign not found"}
            
        if campaign.status in ["paused", "failed", "completed"]:
            return {"success": False, "message": f"Campaign is {campaign.status}"}
            
        template = db.query(Template).filter(Template.id == campaign.template_id).first()
        if not template:
            campaign.status = "failed"
            db.commit()
            return {"success": False, "message": "Template not found"}
            
        lead_files = db.query(Lead).filter(Lead.campaign_id == str(campaign_id)).all()
        all_leads = []
        for file in lead_files:
            if file.content and isinstance(file.content, list):
                for lead_data in file.content:
                    lead_data["_file_id"] = str(file.id)
                    all_leads.append(lead_data)
                    
        lead_count = len(all_leads)
        
        user_credentials = db.query(EmailCredential).filter(
            EmailCredential.user_id == campaign.user_id,
            EmailCredential.is_verified == True
        ).first()
        
        if not user_credentials:
            campaign.status = "failed"
            db.commit()
            return {"success": False, "message": "No verified credentials"}
            
        password = decrypt_credential(user_credentials.encrypted_password)
        
        start_index = campaign.last_processed_index or 0
        end_index = min(start_index + batch_size, lead_count)
        
        sent_count = campaign.sent_count or 0
        failed_count = campaign.failed_count or 0
        mapping = campaign.variable_mapping or {}
        
        for index in range(start_index, end_index):
            db.refresh(campaign)
            if campaign.status == "paused":
                return {"success": True, "message": "Campaign paused"}
                
            lead = all_leads[index]
            lead_email = None
            for key, val in lead.items():
                if key.lower() == "email" and val:
                    lead_email = str(val).strip()
                    break
            if not lead_email:
                for key, val in lead.items():
                    k = key.lower()
                    if ("email" in k or "e-mail" in k) and val:
                        lead_email = str(val).strip()
                        break
                        
            if not lead_email:
                failed_count += 1
                campaign.last_processed_index = index + 1
                campaign.failed_count = failed_count
                db.commit()
                continue
                
            # Duplicate prevention check via Database
            existing_log = db.query(EmailLog).filter(
                EmailLog.campaign_id == str(campaign_id),
                EmailLog.lead_email == lead_email
            ).first()
            
            if existing_log and existing_log.status in ["sent", "opened", "clicked", "replied"]:
                # Already sent successfully
                campaign.last_processed_index = index + 1
                db.commit()
                continue
                
            try:
                personalized_subject = template.subject_line or "Email"
                personalized_html = template.html_content or ""
                
                for template_var, lead_col in mapping.items():
                    val = str(lead.get(lead_col, f"[{template_var}]"))
                    personalized_html = personalized_html.replace(f"{{{{{template_var}}}}}", val)
                    personalized_subject = personalized_subject.replace(f"{{{{{template_var}}}}}", val)
                    
                result = await EmailService.send_email(
                    smtp_server="smtp.gmail.com",
                    smtp_port=587,
                    email_address=user_credentials.email_address,
                    password=password,
                    to_email=lead_email,
                    subject=personalized_subject,
                    html_content=personalized_html,
                    text_content=template.text_content
                )
                
                if result["success"]:
                    email_log = EmailLog(
                        campaign_id=campaign_id,
                        leads_file_id=uuid.UUID(lead["_file_id"]),
                        lead_email=lead_email,
                        email_credential_id=user_credentials.id,
                        subject_line=personalized_subject,
                        html_content=personalized_html,
                        text_content=template.text_content,
                        status="sent",
                        sent_at=datetime.utcnow(),
                        message_id=result.get("message_id")
                    )
                    db.add(email_log)
                    sent_count += 1
                else:
                    failed_count += 1
                    email_log = EmailLog(
                        campaign_id=campaign_id,
                        leads_file_id=uuid.UUID(lead["_file_id"]),
                        lead_email=lead_email,
                        email_credential_id=user_credentials.id,
                        subject_line=personalized_subject,
                        html_content=personalized_html,
                        text_content=template.text_content or "",
                        status="failed",
                        last_error=result.get("error", "Unknown error")
                    )
                    db.add(email_log)
                    
            except Exception as e:
                failed_count += 1
                print(f"Error sending email to {lead_email}: {str(e)}")
                
            # Save Campaign Progress
            campaign.sent_count = sent_count
            campaign.failed_count = failed_count
            campaign.last_processed_index = index + 1
            db.commit()
            
            # SMTP Rate Limiting - Delay between emails to avoid provider blocking
            time.sleep(2)
            
        # Recursive Chaining: Check if more leads exist
        if campaign.last_processed_index < lead_count:
            qstash_token = os.getenv("QSTASH_TOKEN")
            if qstash_token and QStash is not None:
                qstash_client = QStash(qstash_token)
                try:
                    # Delay next execution by 5 seconds to provide breathing room
                    forwarded_host = request.headers.get("x-forwarded-host")
                    forwarded_proto = request.headers.get("x-forwarded-proto", "https")
                    target_url = f"{forwarded_proto}://{forwarded_host}{request.url.path}" if forwarded_host else str(request.url)
                    
                    qstash_client.publish_json(
                        url=target_url,
                        body={"campaign_id": str(campaign_id), "batch_size": batch_size},
                        delay=5
                    )
                except Exception as e:
                    print(f"Failed to publish next batch to QStash: {e}")
        else:
            campaign.status = "completed"
            campaign.completed_at = datetime.utcnow()
            db.commit()
            
        return {
            "success": True, 
            "message": f"Processed {end_index - start_index} leads",
            "last_processed_index": campaign.last_processed_index
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
