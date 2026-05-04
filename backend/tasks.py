"""
Celery tasks for OutreachX
Background jobs for email sending, campaign management, etc.
"""

import os
import asyncio
import logging
from celery import Celery
from datetime import datetime, timedelta
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from dotenv import load_dotenv
import models
from email_service import EmailService
from db_service import DatabaseService
from security import decrypt_credential

load_dotenv()

# Setup logging
logger = logging.getLogger(__name__)

# Initialize Celery
celery_app = Celery('OutreachX')

# Load configuration from celery_config.py
celery_app.config_from_object('celery_config')

# Database setup
DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@celery_app.task(bind=True, max_retries=3)
def send_campaign_emails(self, campaign_id: str):
    """
    Send emails for a campaign with batching, delay, and variable mapping
    """
    import time
    db = SessionLocal()
    try:
        campaign = db.query(models.Campaign).filter(
            models.Campaign.id == campaign_id
        ).first()

        if not campaign:
            return {"success": False, "error": "Campaign not found"}
            
        if campaign.status == "paused":
            return {"success": False, "message": "Campaign is paused"}

        # Get the template
        if not campaign.template_id:
            campaign.status = "failed"
            db.commit()
            return {"success": False, "error": "No template selected"}
            
        template = db.query(models.Template).filter(models.Template.id == campaign.template_id).first()
        if not template:
            campaign.status = "failed"
            db.commit()
            return {"success": False, "error": "Template not found"}

        # Get lead files for campaign
        lead_files = db.query(models.Lead).filter(
            models.Lead.campaign_id == campaign_id
        ).all()
        
        # Flatten leads from all files
        all_leads = []
        for file in lead_files:
            if file.content and isinstance(file.content, list):
                for lead_data in file.content:
                    # Inject file reference
                    lead_data["_file_id"] = str(file.id)
                    all_leads.append(lead_data)
        
        lead_count = len(all_leads)
        
        # Update total leads if it changed
        if campaign.total_leads != lead_count:
            campaign.total_leads = lead_count
            db.commit()

        # Check if already completed
        if campaign.last_processed_index >= lead_count:
            if campaign.status != "completed":
                campaign.status = "completed"
                campaign.completed_at = datetime.utcnow()
                db.commit()
            return {"success": True, "message": "Campaign already completed"}

        # Get email credential
        user_credentials = db.query(models.EmailCredential).filter(
            models.EmailCredential.user_id == campaign.user_id,
            models.EmailCredential.is_verified == True
        ).first()

        if not user_credentials:
            raise Exception("No verified email credentials")

        password = decrypt_credential(user_credentials.encrypted_password)

        sent_count = campaign.sent_count or 0
        failed_count = campaign.failed_count or 0
        start_index = campaign.last_processed_index or 0
        mapping = campaign.variable_mapping or {}

        # Process from start_index to end, checking for pauses
        for index in range(start_index, lead_count):
            # Refresh campaign status to check for pauses or stops
            db.refresh(campaign)
            if campaign.status == "paused":
                return {"success": True, "message": "Campaign paused during execution"}

            lead = all_leads[index]
            lead_email = lead.get("email") or lead.get("Email")
            if not lead_email:
                failed_count += 1
                campaign.last_processed_index = index + 1
                campaign.failed_count = failed_count
                db.commit()
                continue
                
            try:
                # Personalize template with mapped variables
                personalized_subject = template.subject_line or "Email"
                personalized_html = template.html_content or ""
                
                for template_var, lead_col in mapping.items():
                    val = str(lead.get(lead_col, f"[{template_var}]"))
                    personalized_html = personalized_html.replace(f"{{{{{template_var}}}}}", val)
                    personalized_subject = personalized_subject.replace(f"{{{{{template_var}}}}}", val)

                # Send email
                result = asyncio.run(EmailService.send_email(
                    smtp_server="smtp.gmail.com",
                    smtp_port=587,
                    email_address=user_credentials.email_address,
                    password=password,
                    to_email=lead_email,
                    subject=personalized_subject,
                    html_content=personalized_html,
                    text_content=template.text_content
                ))

                if result["success"]:
                    email_log = models.EmailLog(
                        campaign_id=campaign_id,
                        leads_file_id=lead["_file_id"],
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
                    email_log = models.EmailLog(
                        campaign_id=campaign_id,
                        leads_file_id=lead["_file_id"],
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
                
            # Update campaign progress
            campaign.sent_count = sent_count
            campaign.failed_count = failed_count
            campaign.last_processed_index = index + 1
            db.commit()
            
            # Rate limiting - delay between emails (2 seconds) to avoid provider blocking
            time.sleep(2)

        # Mark as completed if all emails sent
        campaign.status = "completed"
        campaign.completed_at = datetime.utcnow()
        db.commit()

        return {
            "success": True,
            "campaign_id": campaign_id,
            "sent_count": sent_count,
            "failed_count": failed_count,
            "total_leads": lead_count
        }

    except Exception as e:
        db.rollback()
        print(f"Campaign execution failed: {e}")
        # Only retry if it's not a fatal error
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))

    finally:
        db.close()


@celery_app.task
def retry_failed_emails(campaign_id: str):
    """
    Retry failed emails in a campaign
    """
    db = SessionLocal()
    try:
        failed_logs = db.query(models.EmailLog).filter(
            models.EmailLog.campaign_id == campaign_id,
            models.EmailLog.status == "failed",
            models.EmailLog.retry_count < models.EmailLog.max_retries
        ).all()

        for log in failed_logs:
            # Increment retry count
            log.retry_count += 1

            try:
                # Get email credential
                credential = db.query(models.EmailCredential).filter(
                    models.EmailCredential.id == log.email_credential_id
                ).first()

                if not credential:
                    continue

                password = decrypt_credential(credential.encrypted_password)

                # Retry sending
                result = asyncio.run(EmailService.send_email(
                    smtp_server="smtp.gmail.com",
                    smtp_port=587,
                    email_address=credential.email_address,
                    password=password,
                    to_email=db.query(models.Lead).filter(
                        models.Lead.id == log.lead_id
                    ).first().email,
                    subject=log.subject_line,
                    html_content=log.html_content,
                    text_content=log.text_content
                ))

                if result["success"]:
                    log.status = "sent"
                    log.sent_at = datetime.utcnow()

            except Exception as e:
                log.last_error = str(e)

            db.commit()

    finally:
        db.close()


@celery_app.task
def update_campaign_stats(campaign_id: str):
    """
    Update campaign statistics from email logs
    """
    db = SessionLocal()
    try:
        campaign = db.query(models.Campaign).filter(
            models.Campaign.id == campaign_id
        ).first()

        if not campaign:
            return

        # Count emails by status
        logs = db.query(models.EmailLog).filter(
            models.EmailLog.campaign_id == campaign_id
        ).all()

        campaign.sent_count = len([l for l in logs if l.status in ["sent", "opened", "clicked", "replied"]])
        campaign.opened_count = len([l for l in logs if l.status in ["opened", "clicked", "replied"]])
        campaign.clicked_count = len([l for l in logs if l.status in ["clicked", "replied"]])
        campaign.replied_count = len([l for l in logs if l.status == "replied"])
        campaign.bounced_count = len([l for l in logs if l.status == "bounced"])

        db.commit()

    finally:
        db.close()


@celery_app.task
def schedule_campaign(campaign_id: str):
    """
    Schedule a campaign to start at a specific time
    """
    db = SessionLocal()
    try:
        campaign = db.query(models.Campaign).filter(
            models.Campaign.id == campaign_id
        ).first()

        if not campaign:
            return

        if campaign.scheduled_at and campaign.scheduled_at <= datetime.utcnow():
            campaign.status = "running"
            campaign.started_at = datetime.utcnow()
            db.commit()

            # Trigger email sending
            send_campaign_emails.delay(campaign_id)

    finally:
        db.close()


@celery_app.task
def cleanup_old_otp_codes():
    """
    Clean up expired OTP codes
    """
    db = SessionLocal()
    try:
        db.query(models.OTPCode).filter(
            models.OTPCode.expires_at < datetime.utcnow(),
            models.OTPCode.is_used == True
        ).delete()

        db.commit()
        logger.info("Cleaned up expired OTP codes")

    finally:
        db.close()


@celery_app.task
def process_scheduled_campaigns():
    """
    Check for scheduled campaigns that should start now
    Runs every minute via Celery Beat
    """
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        
        # Find campaigns scheduled to start
        scheduled_campaigns = db.query(models.Campaign).filter(
            models.Campaign.status == "scheduled",
            models.Campaign.scheduled_at <= now
        ).all()
        
        for campaign in scheduled_campaigns:
            logger.info(f"Starting scheduled campaign {campaign.id}")
            
            # Update status
            campaign.status = "running"
            campaign.started_at = now
            db.commit()
            
            # Enqueue email sending
            send_campaign_emails.delay(str(campaign.id))
        
        if scheduled_campaigns:
            logger.info(f"Processed {len(scheduled_campaigns)} scheduled campaigns")
    
    except Exception as e:
        logger.error(f"Error in process_scheduled_campaigns: {str(e)}")
    
    finally:
        db.close()

