"""
Pydantic models for OutreachX API requests and responses
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, HttpUrl
from enum import Enum


# ==================== AUTH SCHEMAS ====================
class SignupRequest(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None


class SignupOTPRequest(BaseModel):
    email: EmailStr
    otp: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SetPasswordRequest(BaseModel):
    user_id: str
    password: str
    confirm_password: str


class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str
    purpose: str = "signup"


# ==================== RESUME SCHEMAS ====================
class ResumeDataSchema(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    skills: List[str] = []
    experience: List[Dict[str, Any]] = []
    education: List[Dict[str, Any]] = []
    projects: List[Dict[str, Any]] = []
    certifications: List[Dict[str, Any]] = []
    social_media_links: Dict[str, str] = {}
    objective: Optional[str] = None


# ==================== EMAIL CREDENTIAL SCHEMAS ====================
class EmailCredentialCreate(BaseModel):
    email_address: EmailStr
    password: str
    app_password: Optional[str] = None
    provider: str = "gmail"


class EmailCredentialResponse(BaseModel):
    id: str
    email_address: str
    provider: str
    is_verified: bool
    verified_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class EmailVerificationRequest(BaseModel):
    credential_id: str
    test_email: Optional[str] = None


class IMAPTestRequest(BaseModel):
    email: str
    app_password: str


# ==================== TEMPLATE SCHEMAS ====================
class TemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    html_content: Optional[str] = None
    text_content: Optional[str] = None
    subject_line: str
    is_default: bool = False
    tags: Optional[List[str]] = None
    variables: Optional[Dict[str, Any]] = None


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    html_content: Optional[str] = None
    text_content: Optional[str] = None
    subject_line: Optional[str] = None
    is_default: Optional[bool] = None
    tags: Optional[List[str]] = None


class TemplateResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    html_content: Optional[str] = None
    text_content: Optional[str] = None
    subject_line: str
    is_default: bool = False
    is_ai_generated: bool
    tags: Optional[List[str]] = None
    variables: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ==================== ASSET SCHEMAS ====================
class AssetCreate(BaseModel):
    asset_type: str  # "github", "portfolio", "document", "link", "custom"
    source_type: Optional[str] = None
    name: str
    description: Optional[str] = None
    file_url: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None


class AssetResponse(BaseModel):
    id: str
    asset_type: str
    name: str
    description: Optional[str] = None
    is_verified: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# ==================== LEAD SCHEMAS ====================
class LeadCreate(BaseModel):
    campaign_id: Optional[str] = None
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    company: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    location: Optional[str] = None
    custom_variables: Optional[Dict[str, Any]] = None


class LeadBulkUpload(BaseModel):
    campaign_id: str
    leads: List[LeadCreate]
    match_headers: Optional[Dict[str, str]] = None


class LeadResponse(BaseModel):
    id: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    company: Optional[str] = None
    role: Optional[str] = None
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# ==================== CAMPAIGN SCHEMAS ====================
class CampaignCreate(BaseModel):
    name: str
    description: Optional[str] = None
    template_id: Optional[str] = None
    lead_ids: List[str] = []
    tags: Optional[List[str]] = None


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    template_id: Optional[str] = None
    lead_ids: Optional[List[str]] = None
    tags: Optional[List[str]] = None


class VariableMappingRequest(BaseModel):
    mapping: Dict[str, str]  # e.g. {"first_name": "First Name"}


class CampaignTestRequest(BaseModel):
    test_email: Optional[EmailStr] = None


class CampaignLaunch(BaseModel):
    campaign_id: str
    scheduled_at: Optional[datetime] = None


class CampaignResponse(BaseModel):
    id: str
    name: str
    status: str
    template_id: Optional[str] = None
    variable_mapping: Optional[Dict[str, str]] = None
    last_processed_index: int = 0
    failed_count: int = 0
    total_leads: int
    sent_count: int
    opened_count: int
    replied_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# ==================== AI/CHAT SCHEMAS ====================
class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: Optional[datetime] = None


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    context_type: Optional[str] = None  # "resume", "leads", "templates", etc.


class ChatResponse(BaseModel):
    success: bool
    response: Optional[str] = None
    conversation_id: str
    timestamp: datetime
    error: Optional[str] = None


class TemplateSuggestionRequest(BaseModel):
    lead_id: Optional[str] = None
    campaign_id: Optional[str] = None
    custom_context: Optional[str] = None


# ==================== SETTINGS SCHEMAS ====================
class UserSettingsUpdate(BaseModel):
    theme: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    notifications_enabled: Optional[bool] = None
    email_notifications: Optional[bool] = None


class UserSettingsResponse(BaseModel):
    id: str
    theme: str
    timezone: str
    language: str
    notifications_enabled: bool
    email_notifications: bool
    
    class Config:
        from_attributes = True


# ==================== USER SCHEMAS ====================
class UserProfile(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    resume_uploaded: bool
    is_verified: bool
    app_password_verified: bool = False
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None

class PasswordChangeRequest(BaseModel):
    pass

class PasswordChangeVerify(BaseModel):
    otp: str
    new_password: str

class AppPasswordVerifyRequest(BaseModel):
    app_password: str
    provider: str = "gmail"


# ==================== RESPONSE SCHEMAS ====================
class APIResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    data: Optional[Any] = None
    error: Optional[str] = None


class PaginatedResponse(BaseModel):
    success: bool
    data: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int
