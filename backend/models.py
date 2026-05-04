"""
OutreachX Backend Models
Comprehensive SQLAlchemy models for all database tables
"""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey, Table, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import uuid
from datetime import datetime
from enum import Enum as PyEnum

# ==================== ENUMS ====================
class UserStatus(str, PyEnum):
    active = "active"
    inactive = "inactive"
    suspended = "suspended"

class OTPPurpose(str, PyEnum):
    signup = "signup"
    login = "login"
    password_reset = "password_reset"
    email_verification = "email_verification"

class CampaignStatus(str, PyEnum):
    draft = "draft"
    scheduled = "scheduled"
    running = "running"
    paused = "paused"
    completed = "completed"
    failed = "failed"

class LeadStatus(str, PyEnum):
    pending = "pending"
    sent = "sent"
    opened = "opened"
    clicked = "clicked"
    replied = "replied"
    bounced = "bounced"
    failed = "failed"

class EmailLogStatus(str, PyEnum):
    pending = "pending"
    sent = "sent"
    opened = "opened"
    clicked = "clicked"
    replied = "replied"
    bounced = "bounced"
    failed = "failed"
    retry = "retry"

# ==================== ASSOCIATION TABLES ====================
campaign_templates = Table(
    'campaign_templates',
    Base.metadata,
    Column('campaign_id', UUID(as_uuid=True), ForeignKey('campaigns.id', ondelete='CASCADE'), primary_key=True),
    Column('template_id', UUID(as_uuid=True), ForeignKey('templates.id', ondelete='CASCADE'), primary_key=True)
)

# ==================== USER MODELS ====================
class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String)
    full_name = Column(String)
    role = Column(String)
    phone = Column(String)
    resume_uploaded = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    status = Column(String, default=UserStatus.active.value)
    encrypted_app_password = Column(Text)
    app_password_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    resume = relationship("UserResume", back_populates="user", uselist=False, cascade="all, delete-orphan")
    email_credentials = relationship("EmailCredential", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    templates = relationship("Template", back_populates="user", cascade="all, delete-orphan")
    assets = relationship("Asset", back_populates="user", cascade="all, delete-orphan")
    leads = relationship("Lead", back_populates="user", cascade="all, delete-orphan")
    campaigns = relationship("Campaign", back_populates="user", cascade="all, delete-orphan")
    ai_memories = relationship("AIMemory", back_populates="user", cascade="all, delete-orphan")
    otp_codes = relationship("OTPCode", back_populates="user", cascade="all, delete-orphan")


class OTPCode(Base):
    __tablename__ = "otp_codes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'))
    email = Column(String, nullable=False)
    code = Column(String, nullable=False)
    purpose = Column(String, default=OTPPurpose.signup.value)
    is_used = Column(Boolean, default=False)
    expires_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="otp_codes")


# ==================== RESUME & PARSING ====================
class UserResume(Base):
    __tablename__ = "user_resumes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    file_name = Column(String)
    file_url = Column(String)
    raw_text = Column(Text)
    skills = Column(JSONB)
    projects = Column(JSONB)
    experience = Column(JSONB)
    education = Column(JSONB)
    social_media_links = Column(JSONB)
    certifications = Column(JSONB)
    objective = Column(Text)
    parsed_metadata = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="resume")


# ==================== EMAIL CREDENTIALS & SETTINGS ====================
class EmailCredential(Base):
    __tablename__ = "email_credentials"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    email_address = Column(String, nullable=False)
    encrypted_password = Column(Text, nullable=False)
    app_password = Column(String)
    provider = Column(String, default='gmail')
    is_verified = Column(Boolean, default=False)
    verification_method = Column(String)
    verified_at = Column(DateTime(timezone=True))
    last_tested_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        UniqueConstraint('user_id', 'email_address', name='unique_user_email'),
    )
    
    # Relationships
    user = relationship("User", back_populates="email_credentials")
    email_logs = relationship("EmailLog", back_populates="email_credential")


class UserSettings(Base):
    __tablename__ = "user_settings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    theme = Column(String, default='light')
    timezone = Column(String, default='UTC')
    language = Column(String, default='en')
    notifications_enabled = Column(Boolean, default=True)
    email_notifications = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="settings")


# ==================== TEMPLATES ====================
class Template(Base):
    __tablename__ = "templates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    html_content = Column(Text)
    text_content = Column(Text)
    subject_line = Column(String)
    is_default = Column(Boolean, default=False)
    is_ai_generated = Column(Boolean, default=False)
    tags = Column(ARRAY(String))
    variables = Column(JSONB)
    preview_url = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="templates")
    campaigns = relationship("Campaign", secondary=campaign_templates, back_populates="templates")


# ==================== ASSETS ====================
class Asset(Base):
    __tablename__ = "assets"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    asset_type = Column(String, nullable=False)
    source_type = Column(String)
    name = Column(String, nullable=False)
    description = Column(Text)
    file_url = Column(String)
    content = Column(Text)
    asset_metadata = Column("metadata", JSONB)
    tags = Column(ARRAY(String))
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="assets")


# ==================== CAMPAIGNS & LEADS ====================
class Campaign(Base):
    __tablename__ = "campaigns"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    status = Column(String, default=CampaignStatus.draft.value)
    
    # Execution Engine state
    template_id = Column(UUID(as_uuid=True), ForeignKey('templates.id', ondelete='SET NULL'), nullable=True)
    variable_mapping = Column(JSONB)
    last_processed_index = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    
    total_leads = Column(Integer, default=0)
    sent_count = Column(Integer, default=0)
    opened_count = Column(Integer, default=0)
    clicked_count = Column(Integer, default=0)
    replied_count = Column(Integer, default=0)
    bounced_count = Column(Integer, default=0)
    scheduled_at = Column(DateTime(timezone=True))
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    tags = Column(ARRAY(String))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="campaigns")
    leads = relationship("Lead", back_populates="campaign", cascade="all, delete-orphan")
    email_logs = relationship("EmailLog", back_populates="campaign", cascade="all, delete-orphan")
    templates = relationship("Template", secondary=campaign_templates, back_populates="campaigns")
    # Relationship to persisted campaign tasks
    tasks = relationship("CampaignTask", back_populates="campaign", cascade="all, delete-orphan")


class Lead(Base):
    __tablename__ = "leads"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey('campaigns.id', ondelete='CASCADE'), nullable=True)
    file_name = Column(String, nullable=False)
    content = Column(JSONB, nullable=False)
    columns = Column("columns", JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    campaign = relationship("Campaign", back_populates="leads")
    user = relationship("User", back_populates="leads")
    email_logs = relationship("EmailLog", back_populates="lead_file", cascade="all, delete-orphan")


# ==================== EMAIL LOGS ====================
class EmailLog(Base):
    __tablename__ = "email_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey('campaigns.id', ondelete='CASCADE'), nullable=False)
    leads_file_id = Column(UUID(as_uuid=True), ForeignKey('leads.id', ondelete='CASCADE'), nullable=False)
    lead_email = Column(String, nullable=False)
    email_credential_id = Column(UUID(as_uuid=True), ForeignKey('email_credentials.id', ondelete='SET NULL'))
    status = Column(String, default=EmailLogStatus.pending.value)
    message_id = Column(String)
    subject_line = Column(String)
    html_content = Column(Text)
    text_content = Column(Text)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    last_error = Column(Text)
    error_code = Column(String)
    sent_at = Column(DateTime(timezone=True))
    opened_at = Column(DateTime(timezone=True))
    clicked_at = Column(DateTime(timezone=True))
    replied_at = Column(DateTime(timezone=True))
    bounced_at = Column(DateTime(timezone=True))
    bounce_reason = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    campaign = relationship("Campaign", back_populates="email_logs")
    lead_file = relationship("Lead", back_populates="email_logs")
    email_credential = relationship("EmailCredential", back_populates="email_logs")


# ==================== AI & RAG ====================
class AIMemory(Base):
    __tablename__ = "ai_memory"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    conversation_id = Column(String)
    message_type = Column(String)
    role = Column(String)
    content = Column(Text)
    tokens_used = Column(Integer, default=0)
    asset_metadata = Column(JSONB)
    importance_score = Column(Integer, default=0)
    extracted_entities = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="ai_memories")


class CampaignTask(Base):
    __tablename__ = "campaign_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey('campaigns.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    task_id = Column(String, nullable=False, index=True)
    status = Column(String, default='PENDING')
    lead_count = Column(Integer, default=0)
    result = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    campaign = relationship("Campaign", back_populates="tasks")
    user = relationship("User")
