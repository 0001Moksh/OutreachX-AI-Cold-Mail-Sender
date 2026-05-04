"""
Database utility functions for OutreachX
Helper functions for common database operations
"""

from sqlalchemy.orm import Session
from typing import Optional, List, Any
import models
import uuid
from datetime import datetime, timedelta


class DatabaseService:
    """Service for database operations"""
    
    @staticmethod
    def create_user(db: Session, email: str, full_name: Optional[str] = None) -> models.User:
        """Create a new user"""
        user = models.User(
            id=uuid.uuid4(),
            email=email,
            full_name=full_name,
            created_at=datetime.utcnow()
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    
    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
        """Get user by email"""
        return db.query(models.User).filter(models.User.email == email).first()
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: str) -> Optional[models.User]:
        """Get user by ID"""
        return db.query(models.User).filter(models.User.id == user_id).first()
    
    @staticmethod
    def create_otp(db: Session, email: str, code: str, purpose: str = "signup") -> models.OTPCode:
        """Create OTP code"""
        otp = models.OTPCode(
            id=uuid.uuid4(),
            email=email,
            code=code,
            purpose=purpose,
            expires_at=datetime.utcnow() + timedelta(minutes=10),
            created_at=datetime.utcnow()
        )
        db.add(otp)
        db.commit()
        db.refresh(otp)
        return otp
    
    @staticmethod
    def verify_otp(db: Session, email: str, code: str) -> Optional[models.OTPCode]:
        """Verify OTP and mark as used"""
        otp = db.query(models.OTPCode).filter(
            models.OTPCode.email == email,
            models.OTPCode.code == code,
            models.OTPCode.is_used == False,
            models.OTPCode.expires_at > datetime.utcnow()
        ).first()
        
        if otp:
            otp.is_used = True
            db.commit()
        
        return otp
    
    @staticmethod
    def create_email_credential(
        db: Session,
        user_id: str,
        email_address: str,
        encrypted_password: str,
        provider: str = "gmail"
    ) -> models.EmailCredential:
        """Create email credential"""
        credential = models.EmailCredential(
            id=uuid.uuid4(),
            user_id=user_id,
            email_address=email_address,
            encrypted_password=encrypted_password,
            provider=provider,
            created_at=datetime.utcnow()
        )
        db.add(credential)
        db.commit()
        db.refresh(credential)
        return credential
    
    @staticmethod
    def get_user_email_credentials(db: Session, user_id: str) -> List[models.EmailCredential]:
        """Get all email credentials for user"""
        return db.query(models.EmailCredential).filter(
            models.EmailCredential.user_id == user_id
        ).all()
    
    @staticmethod
    def create_campaign(
        db: Session,
        user_id: str,
        name: str,
        description: Optional[str] = None
    ) -> models.Campaign:
        """Create campaign"""
        campaign = models.Campaign(
            id=uuid.uuid4(),
            user_id=user_id,
            name=name,
            description=description,
            status="draft",
            created_at=datetime.utcnow()
        )
        db.add(campaign)
        db.commit()
        db.refresh(campaign)
        return campaign
    
    @staticmethod
    def create_template(
        db: Session,
        user_id: str,
        name: str,
        subject_line: str,
        html_content: Optional[str] = None,
        text_content: Optional[str] = None,
        is_ai_generated: bool = False
    ) -> models.Template:
        """Create email template"""
        template = models.Template(
            id=uuid.uuid4(),
            user_id=user_id,
            name=name,
            subject_line=subject_line,
            html_content=html_content,
            text_content=text_content,
            is_ai_generated=is_ai_generated,
            created_at=datetime.utcnow()
        )
        db.add(template)
        db.commit()
        db.refresh(template)
        return template
    
    @staticmethod
    def create_leads_bulk(
        db: Session,
        user_id: str,
        campaign_id: Optional[str],
        leads_data: List[dict]
    ) -> List[models.Lead]:
        """Create multiple leads"""
        leads = []
        for lead_data in leads_data:
            lead = models.Lead(
                id=uuid.uuid4(),
                campaign_id=campaign_id,
                user_id=user_id,
                email=lead_data.get('email'),
                first_name=lead_data.get('first_name'),
                last_name=lead_data.get('last_name'),
                company=lead_data.get('company'),
                role=lead_data.get('role'),
                phone=lead_data.get('phone'),
                linkedin_url=lead_data.get('linkedin_url'),
                location=lead_data.get('location'),
                custom_variables=lead_data.get('custom_variables'),
                status='pending',
                created_at=datetime.utcnow()
            )
            leads.append(lead)
            db.add(lead)
        
        db.commit()
        return leads
    
    @staticmethod
    def create_asset(
        db: Session,
        user_id: str,
        asset_type: str,
        name: str,
        content: Optional[str] = None,
        file_url: Optional[str] = None,
        description: Optional[str] = None
    ) -> models.Asset:
        """Create asset"""
        asset = models.Asset(
            id=uuid.uuid4(),
            user_id=user_id,
            asset_type=asset_type,
            name=name,
            content=content,
            file_url=file_url,
            description=description,
            created_at=datetime.utcnow()
        )
        db.add(asset)
        db.commit()
        db.refresh(asset)
        return asset
    
    @staticmethod
    def create_email_log(
        db: Session,
        campaign_id: str,
        lead_id: str,
        email_credential_id: Optional[str],
        subject_line: str,
        html_content: Optional[str] = None,
        text_content: Optional[str] = None
    ) -> models.EmailLog:
        """Create email log"""
        log = models.EmailLog(
            id=uuid.uuid4(),
            campaign_id=campaign_id,
            lead_id=lead_id,
            email_credential_id=email_credential_id,
            subject_line=subject_line,
            html_content=html_content,
            text_content=text_content,
            status="pending",
            created_at=datetime.utcnow()
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return log
    
    @staticmethod
    def store_ai_memory(
        db: Session,
        user_id: str,
        conversation_id: str,
        message_type: str,
        role: str,
        content: str,
        importance_score: int = 0,
        extracted_entities: Optional[dict] = None
    ) -> models.AIMemory:
        """Store conversation in AI memory"""
        memory = models.AIMemory(
            id=uuid.uuid4(),
            user_id=user_id,
            conversation_id=conversation_id,
            message_type=message_type,
            role=role,
            content=content,
            importance_score=importance_score,
            extracted_entities=extracted_entities,
            created_at=datetime.utcnow()
        )
        db.add(memory)
        db.commit()
        db.refresh(memory)
        return memory
    
    @staticmethod
    def get_user_ai_memory(
        db: Session,
        user_id: str,
        limit: int = 50
    ) -> List[models.AIMemory]:
        """Get recent AI memory for user"""
        return db.query(models.AIMemory).filter(
            models.AIMemory.user_id == user_id
        ).order_by(models.AIMemory.created_at.desc()).limit(limit).all()
    
    @staticmethod
    def update_campaign_stats(
        db: Session,
        campaign_id: str,
        sent_count: int = 0,
        opened_count: int = 0,
        clicked_count: int = 0,
        replied_count: int = 0,
        bounced_count: int = 0
    ) -> models.Campaign:
        """Update campaign statistics"""
        campaign = db.query(models.Campaign).filter(
            models.Campaign.id == campaign_id
        ).first()
        
        if campaign:
            campaign.sent_count += sent_count
            campaign.opened_count += opened_count
            campaign.clicked_count += clicked_count
            campaign.replied_count += replied_count
            campaign.bounced_count += bounced_count
            campaign.updated_at = datetime.utcnow()
            db.commit()
        
        return campaign
