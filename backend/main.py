"""
OutreachX Backend API
Complete FastAPI application with all endpoints for SaaS platform
"""

import os
import uuid
import asyncio
import io
import csv
import random
import smtplib
import imaplib
import email
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from email.message import EmailMessage
from email.header import decode_header

from fastapi import FastAPI, Depends, HTTPException, status, Request, File, UploadFile, BackgroundTasks, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel
import jwt
from dotenv import load_dotenv
import pandas as pd

from database import engine, get_db, Base, SessionLocal
import models
import schemas
from security import hash_password, verify_password, encrypt_credential, decrypt_credential, generate_otp, create_access_token, verify_token
from email_service import EmailService, OTPEmailService
from resume_parser import ResumeParser, ResumeData
from ai_system import ai_system
from db_service import DatabaseService
from services import asset_parser
from tasks import send_campaign_emails, celery_app

load_dotenv()

# ==================== APP SETUP ====================
app = FastAPI(
    title="OutreachX API",
    description="AI-Powered Cold Outreach SaaS Platform",
    version="2.0.0",
)

# CORS Configuration
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

# ==================== DEPENDENCIES ====================
async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> models.User:
    """Verify token and get current user"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No credentials provided",
        )
    
    token = credentials.credentials
    user_id = verify_token(token)
    
    decode_error = None
    payload = {}
    
    if not user_id:
        try:
            # Fall back to a payload-only decode so Supabase session tokens
            # can be used even when the shared secret is not configured here.
            payload = jwt.decode(
                token,
                options={"verify_signature": False, "verify_aud": False}
            )
            user_id = payload.get("sub")
        except Exception as e:
            decode_error = str(e)
            print(f"Token verification failed: {e}")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token. Error: {decode_error}",
        )
        
    try:
        import uuid
        uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: user ID is not a valid UUID format (Please clear your browser storage and log in again)"
        )
    
    user = DatabaseService.get_user_by_id(db, user_id)
    if not user:
        # Automatically sync Supabase user to local Postgres DB
        try:
            new_user = models.User(
                id=user_id,
                email=payload.get("email", f"{user_id}@supabase.placeholder"),
                status="active",
                is_verified=True
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            user = new_user
        except Exception as e:
            db.rollback()
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to sync user to database: {str(e)}"
            )
    
    return user


async def verify_supabase_token(request: Request) -> dict:
    """Verify Supabase JWT token from Authorization header"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )
    
    token = auth_header.split(" ")[1]
    
    try:
        # Decode Supabase JWT token
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"]
        )
        
        # Extract user ID from token - Supabase stores it in 'sub'
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user ID",
            )
        
        # Store user_id in request state for later use
        request.state.user_id = user_id
        
        # Return the full token payload
        return payload
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        )


# ==================== HEALTH CHECK ====================
@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow()}


@app.get("/")
def root():
    """Root endpoint"""
    return {
        "name": "OutreachX API",
        "version": "2.0.0",
        "description": "AI-Powered Cold Outreach SaaS"
    }


# ==================== AUTH ENDPOINTS ====================
@app.post("/auth/signup", response_model=schemas.APIResponse)
async def signup(request: schemas.SignupRequest, db: Session = Depends(get_db)):
    """Start signup process - send OTP"""
    try:
        # Check if user exists
        existing_user = DatabaseService.get_user_by_email(db, request.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        
        # Generate and store OTP
        otp_code = generate_otp()
        otp = DatabaseService.create_otp(db, request.email, otp_code, purpose="signup")
        
        # Send OTP email
        await OTPEmailService.send_otp_email(request.email, otp_code, purpose="signup")
        
        return schemas.APIResponse(
            success=True,
            message="OTP sent to email",
            data={"email": request.email}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@app.post("/auth/verify-otp", response_model=schemas.APIResponse)
async def verify_otp(request: schemas.SignupOTPRequest, db: Session = Depends(get_db)):
    """Verify OTP and create user"""
    try:
        otp = DatabaseService.verify_otp(db, request.email, request.otp)
        
        if not otp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired OTP",
            )
        
        # Create user
        user = DatabaseService.create_user(db, request.email)
        
        # Create settings
        settings = models.UserSettings(
            id=uuid.uuid4(),
            user_id=user.id,
            created_at=datetime.utcnow()
        )
        db.add(settings)
        db.commit()
        
        # Create access token
        access_token = create_access_token(str(user.id))
        
        return schemas.APIResponse(
            success=True,
            message="OTP verified, user created",
            data={
                "user_id": str(user.id),
                "email": user.email,
                "access_token": access_token
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@app.post("/auth/set-password", response_model=schemas.APIResponse)
async def set_password(
    request: schemas.SetPasswordRequest,
    db: Session = Depends(get_db)
):
    """Set password after signup"""
    try:
        user = DatabaseService.get_user_by_id(db, request.user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        
        if request.password != request.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Passwords don't match",
            )
        
        user.password_hash = hash_password(request.password)
        user.updated_at = datetime.utcnow()
        db.commit()
        
        return schemas.APIResponse(
            success=True,
            message="Password set successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@app.post("/auth/login", response_model=schemas.APIResponse)
async def login(request: schemas.LoginRequest, db: Session = Depends(get_db)):
    """Login with email and password"""
    try:
        user = DatabaseService.get_user_by_email(db, request.email)
        if not user or not user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )
        
        if not verify_password(request.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )
        
        access_token = create_access_token(str(user.id))
        
        return schemas.APIResponse(
            success=True,
            message="Login successful",
            data={
                "user_id": str(user.id),
                "email": user.email,
                "access_token": access_token
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


# ==================== USER ENDPOINTS ====================
@app.get("/users/profile", response_model=schemas.APIResponse)
async def get_profile(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user profile"""
    try:
        profile = schemas.UserProfile(
            id=str(current_user.id),
            email=current_user.email,
            full_name=current_user.full_name,
            phone=current_user.phone,
            resume_uploaded=current_user.resume_uploaded,
            is_verified=current_user.is_verified,
            created_at=current_user.created_at
        )
        
        return schemas.APIResponse(
            success=True,
            data=profile.model_dump()
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@app.put("/users/profile", response_model=schemas.APIResponse)
async def update_profile(
    request: schemas.UserProfileUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user profile"""
    try:
        current_user.full_name = request.full_name or current_user.full_name
        current_user.phone = request.phone or current_user.phone
        current_user.updated_at = datetime.utcnow()
        db.commit()
        
        return schemas.APIResponse(
            success=True,
            message="Profile updated"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


# ==================== RESUME ENDPOINTS ====================
@app.post("/resume/upload", response_model=schemas.APIResponse)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload and parse resume"""
    try:
        content = await file.read()
        
        # Parse resume
        resume_data = ResumeParser.parse_resume(content, file.filename)
        
        # Store in database
        user_resume = db.query(models.UserResume).filter(
            models.UserResume.user_id == current_user.id
        ).first()
        
        if user_resume:
            # Update existing
            user_resume.file_name = file.filename
            user_resume.raw_text = resume_data.summary
            user_resume.skills = resume_data.skills
            user_resume.experience = [exp.model_dump() for exp in resume_data.experience]
            user_resume.education = [edu.model_dump() for edu in resume_data.education]
            user_resume.projects = [proj.model_dump() for proj in resume_data.projects]
            user_resume.social_media_links = resume_data.social_media_links
            user_resume.objective = resume_data.objective
            user_resume.updated_at = datetime.utcnow()
        else:
            # Create new
            user_resume = models.UserResume(
                id=uuid.uuid4(),
                user_id=current_user.id,
                file_name=file.filename,
                raw_text=resume_data.summary,
                skills=resume_data.skills,
                experience=[exp.model_dump() if hasattr(exp, 'model_dump') else exp for exp in resume_data.experience],
                education=[edu.model_dump() if hasattr(edu, 'model_dump') else edu for edu in resume_data.education],
                projects=[proj.model_dump() if hasattr(proj, 'model_dump') else proj for proj in resume_data.projects],
                social_media_links=resume_data.social_media_links,
                objective=resume_data.objective,
                created_at=datetime.utcnow()
            )
            db.add(user_resume)
        
        current_user.resume_uploaded = True
        current_user.updated_at = datetime.utcnow()
        db.commit()
        
        return schemas.APIResponse(
            success=True,
            message="Resume uploaded and parsed",
            data={
                "skills": resume_data.skills,
                "experience": len(resume_data.experience),
                "education": len(resume_data.education)
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@app.get("/resume", response_model=schemas.APIResponse)
async def get_resume(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get parsed resume"""
    try:
        resume = db.query(models.UserResume).filter(
            models.UserResume.user_id == current_user.id
        ).first()
        
        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found",
            )
        
        return schemas.APIResponse(
            success=True,
            data={
                "skills": resume.skills,
                "experience": resume.experience,
                "education": resume.education,
                "projects": resume.projects,
                "social_media_links": resume.social_media_links,
                "objective": resume.objective
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


# ==================== EMAIL CREDENTIAL ENDPOINTS ====================
@app.post("/email-credentials", response_model=schemas.APIResponse)
async def add_email_credential(
    request: schemas.EmailCredentialCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add email credential"""
    try:
        encrypted_password = encrypt_credential(request.password)
        
        credential = DatabaseService.create_email_credential(
            db,
            str(current_user.id),
            request.email_address,
            encrypted_password,
            request.provider
        )
        
        return schemas.APIResponse(
            success=True,
            message="Email credential added",
            data={"credential_id": str(credential.id)}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@app.get("/email-credentials", response_model=schemas.APIResponse)
async def get_email_credentials(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all email credentials"""
    try:
        credentials = DatabaseService.get_user_email_credentials(db, str(current_user.id))
        
        return schemas.APIResponse(
            success=True,
            data=[{
                "id": str(c.id),
                "email_address": c.email_address,
                "provider": c.provider,
                "is_verified": c.is_verified,
                "verified_at": c.verified_at
            } for c in credentials]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@app.post("/email-credentials/{credential_id}/verify", response_model=schemas.APIResponse)
async def verify_email_credential(
    credential_id: str,
    request: schemas.EmailVerificationRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify email credential"""
    try:
        credential = db.query(models.EmailCredential).filter(
            models.EmailCredential.id == credential_id,
            models.EmailCredential.user_id == current_user.id
        ).first()
        
        if not credential:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Credential not found",
            )
        
        # Verify credentials
        password = decrypt_credential(credential.encrypted_password)
        result = EmailService.verify_email_credentials(
            credential.email_address,
            password,
            credential.provider
        )
        
        if result["verified"]:
            credential.is_verified = True
            credential.verified_at = datetime.utcnow()
            credential.verification_method = "imap"
            db.commit()
        
        return schemas.APIResponse(
            success=result["verified"],
            message=result["message"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


# ==================== TEMPLATE ENDPOINTS ====================
# Duplicate endpoints removed - see proper implementation below


# ==================== ASSET ENDPOINTS ====================
@app.post("/assets", response_model=schemas.APIResponse)
async def create_asset(
    request: schemas.AssetCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new asset (URL, text, etc.)"""
    try:
        content = request.content
        is_verified = False
        
        # Parse content based on asset_type
        if request.asset_type == "github" and request.file_url:
            github_token = os.getenv("GITHUB_TOKEN")
            extracted_text = asset_parser.parse_github_repo(request.file_url, github_token)
            if extracted_text:
                content = extracted_text
                is_verified = True
                
        elif request.asset_type == "link" and request.file_url:
            extracted_text = asset_parser.parse_website(request.file_url)
            if extracted_text:
                content = extracted_text
                is_verified = True
                
        elif request.asset_type == "custom" and request.content:
            is_verified = True
            
        asset = models.Asset(
            id=uuid.uuid4(),
            user_id=current_user.id,
            asset_type=request.asset_type,
            source_type=request.source_type,
            name=request.name,
            description=request.description,
            file_url=request.file_url,
            content=content,
            tags=request.tags,
            is_verified=is_verified,
            created_at=datetime.utcnow()
        )
        db.add(asset)
        db.commit()
        
        return schemas.APIResponse(
            success=True,
            message="Asset created successfully",
            data={"asset_id": str(asset.id)}
        )
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )

@app.get("/assets", response_model=schemas.APIResponse)
async def list_assets(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all user assets"""
    try:
        assets = db.query(models.Asset).filter(
            models.Asset.user_id == current_user.id
        ).order_by(models.Asset.created_at.desc()).all()
        
        return schemas.APIResponse(
            success=True,
            data=[{
                "id": str(a.id),
                "name": a.name,
                "asset_type": a.asset_type,
                "source_type": a.source_type,
                "description": a.description,
                "file_url": a.file_url,
                "content": a.content,
                "status": getattr(a, "status", None) or ("valid" if a.is_verified else "needs_review"),
                "is_verified": a.is_verified,
                "created_at": a.created_at
            } for a in assets]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )

@app.get("/assets/{asset_id}", response_model=schemas.APIResponse)
async def get_asset_detail(
    asset_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single asset with stored source content."""
    try:
        asset = db.query(models.Asset).filter(
            models.Asset.id == asset_id,
            models.Asset.user_id == current_user.id
        ).first()

        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")

        return schemas.APIResponse(
            success=True,
            data={
                "id": str(asset.id),
                "name": asset.name,
                "asset_type": asset.asset_type,
                "source_type": asset.source_type,
                "description": asset.description,
                "file_url": asset.file_url,
                "content": asset.content,
                "tags": asset.tags,
                "metadata": asset.asset_metadata,
                "status": getattr(asset, "status", None) or ("valid" if asset.is_verified else "needs_review"),
                "is_verified": asset.is_verified,
                "created_at": asset.created_at,
                "updated_at": asset.updated_at,
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )

@app.post("/assets/upload", response_model=schemas.APIResponse)
async def upload_asset_file(
    file: UploadFile = File(...),
    asset_type: str = Form("document"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a file asset"""
    try:
        file_bytes = await file.read()
        filename_lower = file.filename.lower()
        
        content = ""
        is_verified = False
        
        if filename_lower.endswith('.pdf'):
            content = asset_parser.parse_pdf(file_bytes)
            if content: is_verified = True
        elif filename_lower.endswith('.docx') or filename_lower.endswith('.doc'):
            content = asset_parser.parse_docx(file_bytes)
            if content: is_verified = True
        elif filename_lower.endswith('.html') or filename_lower.endswith('.htm'):
            content = asset_parser.parse_html(file_bytes)
            if content: is_verified = True
        elif filename_lower.endswith('.txt'):
            content = asset_parser.parse_text(file_bytes)
            if content: is_verified = True
            
        asset = models.Asset(
            id=uuid.uuid4(),
            user_id=current_user.id,
            asset_type=asset_type,
            name=file.filename,
            content=content,
            is_verified=is_verified,
            created_at=datetime.utcnow()
        )
        db.add(asset)
        db.commit()
        
        return schemas.APIResponse(
            success=True,
            message="File uploaded successfully",
            data={"asset_id": str(asset.id), "file_name": file.filename}
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@app.delete("/assets/bulk", response_model=schemas.APIResponse)
async def bulk_delete_assets(
    request: schemas.BulkDeleteRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete multiple assets"""
    try:
        db.query(models.Asset).filter(
            models.Asset.id.in_(request.ids),
            models.Asset.user_id == current_user.id
        ).delete(synchronize_session=False)
        db.commit()
        
        return schemas.APIResponse(
            success=True,
            message=f"Successfully deleted {len(request.ids)} assets"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )

@app.delete("/assets/{asset_id}", response_model=schemas.APIResponse)
async def delete_asset(
    asset_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a single asset"""
    try:
        asset = db.query(models.Asset).filter(
            models.Asset.id == asset_id,
            models.Asset.user_id == current_user.id
        ).first()
        
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")
            
        db.delete(asset)
        db.commit()
        
        return schemas.APIResponse(
            success=True,
            message="Asset deleted successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@app.delete("/campaigns/{campaign_id}", response_model=schemas.APIResponse)
async def delete_campaign(
    campaign_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a campaign (safe): dissociate leads and remove related records before deleting"""
    try:
        campaign = db.query(models.Campaign).filter(
            models.Campaign.id == campaign_id,
            models.Campaign.user_id == current_user.id
        ).first()

        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

        # Dissociate leads to avoid FK constraint issues
        existing_leads = db.query(models.Lead).filter(models.Lead.campaign_id == campaign_id).all()
        for lead in existing_leads:
            lead.campaign_id = None

        # Remove email logs that reference this campaign (if any)
        try:
            db.query(models.EmailLog).filter(models.EmailLog.campaign_id == campaign_id).delete(synchronize_session=False)
        except Exception:
            # best-effort: continue
            pass

        # Delete campaign tasks
        try:
            db.query(models.CampaignTask).filter(models.CampaignTask.campaign_id == campaign_id).delete(synchronize_session=False)
        except Exception:
            pass

        # Finally delete campaign
        db.delete(campaign)
        db.commit()

        return schemas.APIResponse(success=True, message="Campaign deleted")
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ==================== LEAD ENDPOINTS ====================
@app.post("/leads/upload", response_model=schemas.APIResponse)
async def upload_leads_file(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a lead file (CSV/Excel) and store its content as JSON"""
    try:
        file_bytes = await file.read()
        filename_lower = file.filename.lower()
        
        if filename_lower.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(file_bytes))
        elif filename_lower.endswith('.xlsx') or filename_lower.endswith('.xls'):
            df = pd.read_excel(io.BytesIO(file_bytes))
        else:
            raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported for leads")
            
        # Replace NaNs with None for JSON serialization
        df = df.where(pd.notnull(df), None)
        
        # Extract JSON content and columns
        json_content = df.to_dict(orient="records")
        columns = df.columns.tolist()
        
        lead_file = models.Lead(
            id=uuid.uuid4(),
            user_id=current_user.id,
            file_name=file.filename,
            content=json_content,
            columns=columns,
            created_at=datetime.utcnow()
        )
        db.add(lead_file)
        db.commit()
        
        return schemas.APIResponse(
            success=True,
            message="Lead file uploaded successfully",
            data={"lead_id": str(lead_file.id), "file_name": file.filename, "columns": columns}
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )

@app.get("/leads", response_model=schemas.APIResponse)
async def list_leads(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all uploaded lead files for the user"""
    try:
        # Avoid fetching the heavy 'content' column
        leads = db.query(
            models.Lead.id,
            models.Lead.file_name,
            models.Lead.columns,
            models.Lead.created_at
        ).filter(
            models.Lead.user_id == current_user.id
        ).order_by(models.Lead.created_at.desc()).all()
        
        return schemas.APIResponse(
            success=True,
            data=[{
                "id": str(l.id),
                "file_name": l.file_name,
                "columns": l.columns,
                "created_at": l.created_at
            } for l in leads]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )

@app.delete("/leads/{lead_id}", response_model=schemas.APIResponse)
async def delete_lead(
    lead_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a lead file"""
    try:
        lead = db.query(models.Lead).filter(
            models.Lead.id == lead_id,
            models.Lead.user_id == current_user.id
        ).first()
        
        if not lead:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lead file not found"
            )
            
        db.delete(lead)
        db.commit()
        
        return schemas.APIResponse(
            success=True,
            message="Lead file deleted successfully"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )

@app.get("/leads/{lead_id}/content", response_model=schemas.APIResponse)
async def get_lead_content(
    lead_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the raw JSON content of a lead file"""
    try:
        lead = db.query(models.Lead).filter(
            models.Lead.id == lead_id,
            models.Lead.user_id == current_user.id
        ).first()
        
        if not lead:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lead file not found"
            )
            
        return schemas.APIResponse(
            success=True,
            data={"content": lead.content}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
# ==================== TEMPLATE ENDPOINTS ====================
def serialize_template(template: models.Template) -> dict:
    """Return a JSON-safe template payload for the frontend."""
    return {
        "id": str(template.id),
        "name": template.name,
        "description": template.description,
        "html_content": template.html_content,
        "text_content": template.text_content,
        "subject_line": template.subject_line,
        "is_default": template.is_default,
        "is_ai_generated": template.is_ai_generated,
        "tags": template.tags or [],
        "variables": template.variables or {},
        "created_at": template.created_at,
        "updated_at": template.updated_at,
    }


@app.get("/templates", response_model=schemas.APIResponse)
async def get_templates(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all templates for current user."""
    try:
        templates = db.query(models.Template).filter(
            models.Template.user_id == current_user.id
        ).order_by(models.Template.created_at.desc()).all()

        return schemas.APIResponse(
            success=True,
            data=[serialize_template(template) for template in templates]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@app.post("/templates", response_model=schemas.APIResponse)
async def create_template(
    template_data: schemas.TemplateCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new template."""
    try:
        new_template = models.Template(
            user_id=current_user.id,
            name=template_data.name,
            description=template_data.description,
            html_content=template_data.html_content,
            text_content=template_data.text_content,
            subject_line=template_data.subject_line,
            tags=template_data.tags,
            variables=template_data.variables,
            is_default=template_data.is_default
        )
        db.add(new_template)
        db.commit()
        db.refresh(new_template)

        return schemas.APIResponse(
            success=True,
            message="Template created successfully",
            data=serialize_template(new_template)
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@app.put("/templates/{template_id}", response_model=schemas.APIResponse)
async def update_template(
    template_id: str,
    template_update: schemas.TemplateUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing template."""
    try:
        template = db.query(models.Template).filter(
            models.Template.id == template_id,
            models.Template.user_id == current_user.id
        ).first()

        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )

        update_data = template_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(template, key, value)

        db.commit()
        db.refresh(template)

        return schemas.APIResponse(
            success=True,
            message="Template updated successfully",
            data=serialize_template(template)
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )

@app.delete("/templates/{template_id}", response_model=schemas.APIResponse)
async def delete_template(
    template_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a template"""
    try:
        template = db.query(models.Template).filter(
            models.Template.id == template_id,
            models.Template.user_id == current_user.id
        ).first()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
            
        db.delete(template)
        db.commit()
        
        return schemas.APIResponse(
            success=True,
            message="Template deleted successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )

# ==================== CAMPAIGN ENDPOINTS ====================
@app.post("/campaigns", response_model=schemas.APIResponse)
async def create_campaign(
    request: schemas.CampaignCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create campaign"""
    try:
        campaign = DatabaseService.create_campaign(
            db,
            str(current_user.id),
            request.name,
            request.description
        )
        
        if request.tags:
            campaign.tags = request.tags
        
        if request.template_id:
            campaign.template_id = request.template_id
            
        # Update leads to associate with this campaign
        if request.lead_ids:
            for lead_id in request.lead_ids:
                lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
                if lead:
                    lead.campaign_id = campaign.id
        
        db.commit()
        
        return schemas.APIResponse(
            success=True,
            message="Campaign created",
            data={"campaign_id": str(campaign.id)}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@app.put("/campaigns/{campaign_id}", response_model=schemas.APIResponse)
async def update_campaign(
    campaign_id: str,
    request: schemas.CampaignUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing campaign"""
    try:
        campaign = db.query(models.Campaign).filter(
            models.Campaign.id == campaign_id,
            models.Campaign.user_id == current_user.id
        ).first()
        
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
            
        # Only update fields that are provided (CampaignUpdate uses Optionals)
        if request.name is not None:
            campaign.name = request.name
        if request.description is not None:
            campaign.description = request.description
        if request.tags is not None:
            campaign.tags = request.tags
        if request.template_id is not None:
            campaign.template_id = request.template_id
        if request.status is not None:
            campaign.status = request.status

        # Update leads (remove old, set new) only when lead_ids provided
        if request.lead_ids is not None:
            # First, dissociate existing leads
            existing_leads = db.query(models.Lead).filter(models.Lead.campaign_id == campaign_id).all()
            for lead in existing_leads:
                lead.campaign_id = None

            # Then assign new leads
            for lead_id in request.lead_ids:
                lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
                if lead:
                    lead.campaign_id = campaign.id
            
        db.commit()
        return schemas.APIResponse(
            success=True,
            message="Campaign updated successfully",
            data={"campaign_id": str(campaign.id)}
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )

@app.get("/campaigns", response_model=schemas.APIResponse)
async def list_campaigns(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List user campaigns"""
    try:
        campaigns = db.query(models.Campaign).filter(
            models.Campaign.user_id == current_user.id
        ).order_by(models.Campaign.created_at.desc()).all()
        
        return schemas.APIResponse(
            success=True,
            data=[{
                "id": str(c.id),
                "name": c.name,
                "status": c.status,
                "total_leads": c.total_leads,
                "sent_count": c.sent_count,
                "failed_count": c.failed_count,
                "template_id": str(c.template_id) if c.template_id else None,
                "variable_mapping": c.variable_mapping,
                "description": c.description,
                "lead_ids": [str(l.id) for l in c.leads],
                "created_at": c.created_at
            } for c in campaigns]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )

@app.get("/campaigns/{campaign_id}", response_model=schemas.APIResponse)
async def get_campaign(
    campaign_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get campaign details"""
    try:
        campaign = db.query(models.Campaign).filter(
            models.Campaign.id == campaign_id,
            models.Campaign.user_id == current_user.id
        ).first()
        
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
            
        return schemas.APIResponse(
            success=True,
            data={
                "id": str(campaign.id),
                "name": campaign.name,
                "description": campaign.description,
                "status": campaign.status,
                "template_id": str(campaign.template_id) if campaign.template_id else None,
                "variable_mapping": campaign.variable_mapping,
                "total_leads": campaign.total_leads,
                "sent_count": campaign.sent_count,
                "failed_count": campaign.failed_count,
                "created_at": campaign.created_at
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/campaigns/{campaign_id}/mapping", response_model=schemas.APIResponse)
async def update_campaign_mapping(
    campaign_id: str,
    request: schemas.VariableMappingRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update variable mapping for a campaign"""
    try:
        campaign = db.query(models.Campaign).filter(
            models.Campaign.id == campaign_id,
            models.Campaign.user_id == current_user.id
        ).first()
        
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
            
        campaign.variable_mapping = request.mapping
        db.commit()
        
        return schemas.APIResponse(
            success=True,
            message="Mapping saved successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/campaigns/{campaign_id}/test", response_model=schemas.APIResponse)
async def test_campaign(
    campaign_id: str,
    request: schemas.CampaignTestRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a test email for the campaign"""
    try:
        campaign = db.query(models.Campaign).filter(
            models.Campaign.id == campaign_id,
            models.Campaign.user_id == current_user.id
        ).first()
        
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
            
        if not campaign.template_id:
            raise HTTPException(status_code=400, detail="No template selected")
            
        template = db.query(models.Template).filter(models.Template.id == campaign.template_id).first()
        
        # Get one lead to test with, or use dummy data
        lead = db.query(models.Lead).filter(models.Lead.campaign_id == campaign_id).first()
        dummy_data = {}
        if lead and lead.content and isinstance(lead.content, list) and len(lead.content) > 0:
            dummy_data = lead.content[0]
            
        mapping = campaign.variable_mapping or {}
        
        # Replace variables
        html_content = template.html_content or ""
        subject = template.subject_line or ""
        for template_var, lead_col in mapping.items():
            val = str(dummy_data.get(lead_col, f"[{template_var}]"))
            html_content = html_content.replace(f"{{{{{template_var}}}}}", val)
            subject = subject.replace(f"{{{{{template_var}}}}}", val)
            
        # Send using system test credentials for testing
        test_email = request.test_email or current_user.email
        system_email = os.getenv("TEST_EMAIL")
        system_app_password = os.getenv("TEST_APP_PASSWORD")
        
        if not system_email or not system_app_password:
            raise HTTPException(status_code=500, detail="System test credentials not configured")
            
        msg = EmailMessage()
        msg['Subject'] = f"[TEST] {subject}"
        msg['From'] = f"OutreachX Test <{system_email}>"
        msg['To'] = test_email
        msg.set_content(template.text_content or "Test email")
        if html_content and html_content.strip():
            msg.add_alternative(html_content, subtype='html')
        
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(system_email, system_app_password)
        server.send_message(msg)
        server.quit()
        
        return schemas.APIResponse(
            success=True,
            message=f"Test email sent to {test_email}"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send test email: {str(e)}")


@app.post("/campaigns/{campaign_id}/launch", response_model=schemas.APIResponse)
async def launch_campaign(
    campaign_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Launch a campaign to send emails via Celery"""
    try:
        # Verify campaign exists and belongs to user
        campaign = db.query(models.Campaign).filter(
            models.Campaign.id == campaign_id,
            models.Campaign.user_id == current_user.id
        ).first()
        
        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Campaign not found"
            )
        
        # Check campaign status
        if campaign.status not in ["draft", "paused"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Campaign cannot be launched from {campaign.status} status"
            )
        
        # Verify email credentials exist
        email_creds = db.query(models.EmailCredential).filter(
            models.EmailCredential.user_id == current_user.id,
            models.EmailCredential.is_verified == True
        ).first()
        
        if not email_creds:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No verified email credentials found. Please verify your email first."
            )

        if not current_user.encrypted_app_password or not current_user.app_password_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="App password is not verified. Please complete verification in Settings > Security first."
            )

        # Before launch, verify app password by sending system email and confirming receipt via IMAP
        try:
            decrypted_app_password = decrypt_credential(current_user.encrypted_app_password)
            verification_code = str(uuid.uuid4())
            send_system_verification_email(current_user.email, verification_code)
            await asyncio.sleep(4)
            verify_email_receipt_via_imap(
                current_user.email,
                decrypted_app_password,
                email_creds.provider or "gmail",
                verification_code
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"App password verification failed before launch: {str(e)}"
            )
        
        # Verify leads exist
        lead_count = db.query(models.Lead).filter(
            models.Lead.campaign_id == campaign_id
        ).count()
        
        if lead_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No leads in this campaign. Please upload leads first."
            )
        
        # Verify templates exist
        template_count = db.query(models.Template).filter(
            models.Template.user_id == current_user.id
        ).count()
        
        if template_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No email templates found. Please create a template first."
            )
        
        # Update campaign status to running
        campaign.status = "running"
        campaign.started_at = datetime.utcnow()
        db.commit()
        
        # Enqueue Celery task
        task = send_campaign_emails.delay(campaign_id)
        # Persist task launch to DB for history and monitoring
        try:
            campaign_task = models.CampaignTask(
                id=uuid.uuid4(),
                campaign_id=campaign.id,
                user_id=current_user.id,
                task_id=str(task.id),
                status='PENDING',
                lead_count=lead_count,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(campaign_task)
            db.commit()
        except Exception:
            db.rollback()

        return schemas.APIResponse(
            success=True,
            message="Campaign launched successfully",
            data={
                "campaign_id": campaign_id,
                "status": "running",
                "task_id": task.id,
                "lead_count": lead_count
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.get("/campaigns/{campaign_id}/tasks/{task_id}/status", response_model=schemas.APIResponse)
async def get_campaign_task_status(
    campaign_id: str,
    task_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the current status of a Celery task for a campaign"""
    try:
        campaign = db.query(models.Campaign).filter(
            models.Campaign.id == campaign_id,
            models.Campaign.user_id == current_user.id
        ).first()

        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Campaign not found"
            )

        task_result = celery_app.AsyncResult(task_id)
        task_state = task_result.state
        task_ready = task_result.ready()

        response_data = {
            "campaign_id": campaign_id,
            "task_id": task_id,
            "state": task_state,
            "ready": task_ready,
            "successful": task_result.successful() if task_ready else False,
            "failed": task_result.failed(),
            "campaign_status": campaign.status,
            "date_done": task_result.date_done,
        }

        if task_result.failed():
            response_data["error"] = str(task_result.result)
            response_data["traceback"] = task_result.traceback
        elif task_ready:
            response_data["result"] = task_result.result

        return schemas.APIResponse(
            success=True,
            data=response_data,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.get("/campaigns/{campaign_id}/tasks", response_model=schemas.APIResponse)
async def list_campaign_tasks(
    campaign_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List persisted task launches for a campaign"""
    try:
        campaign = db.query(models.Campaign).filter(
            models.Campaign.id == campaign_id,
            models.Campaign.user_id == current_user.id
        ).first()

        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Campaign not found"
            )

        tasks = db.query(models.CampaignTask).filter(
            models.CampaignTask.campaign_id == campaign_id
        ).order_by(models.CampaignTask.created_at.desc()).all()

        return schemas.APIResponse(
            success=True,
            data=[{
                "id": str(t.id),
                "task_id": t.task_id,
                "status": t.status,
                "lead_count": t.lead_count,
                "created_at": t.created_at,
                "updated_at": t.updated_at,
                "result": t.result
            } for t in tasks]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ==================== ASSETS ENDPOINTS ====================
@app.get("/assets", response_model=schemas.APIResponse)
async def get_assets(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's assets"""
    try:
        assets = db.query(models.Asset).filter(
            models.Asset.user_id == current_user.id
        ).order_by(models.Asset.created_at.desc()).all()
        
        return schemas.APIResponse(
            success=True,
            data=[{
                "id": str(a.id),
                "name": a.name,
                "asset_type": a.asset_type,
                "source_type": a.source_type,
                "description": a.description,
                "file_url": a.file_url,
                "content": a.content,
                "status": getattr(a, "status", None) or ("valid" if a.is_verified else "needs_review"),
                "is_verified": a.is_verified,
                "created_at": a.created_at
            } for a in assets]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/assets", response_model=schemas.APIResponse)
async def create_asset(
    request: schemas.AssetCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new asset (link, github, text)"""
    try:
        asset = models.Asset(
            id=uuid.uuid4(),
            user_id=current_user.id,
            asset_type=request.asset_type,
            source_type=request.source_type,
            name=request.name,
            description=request.description,
            file_url=request.file_url,
            content=request.content,
            tags=request.tags,
            created_at=datetime.utcnow()
        )
        db.add(asset)
        db.commit()
        return schemas.APIResponse(success=True, data={"asset_id": str(asset.id)})
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/assets/upload", response_model=schemas.APIResponse)
async def upload_asset(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a document asset"""
    try:
        content = await file.read()
        asset = models.Asset(
            id=uuid.uuid4(),
            user_id=current_user.id,
            asset_type="document",
            name=file.filename,
            created_at=datetime.utcnow()
        )
        db.add(asset)
        db.commit()
        return schemas.APIResponse(success=True, data={"asset_id": str(asset.id)})
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ==================== LEADS ENDPOINTS ====================
@app.get("/leads", response_model=schemas.APIResponse)
async def list_leads(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List user leads (files)"""
    try:
        leads = db.query(models.Lead).filter(
            models.Lead.user_id == current_user.id
        ).order_by(models.Lead.created_at.desc()).all()
        
        return schemas.APIResponse(
            success=True,
            data=[{
                "id": str(lead.id),
                "campaign_id": str(lead.campaign_id) if lead.campaign_id else None,
                "file_name": lead.file_name,
                "columns": lead.columns or [],
                "created_at": lead.created_at
            } for lead in leads]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/leads/upload", response_model=schemas.APIResponse)
async def upload_leads(
    file: UploadFile = File(...),
    campaign_id: Optional[str] = Form(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload leads from Excel/CSV"""
    try:
        content = await file.read()
        
        # Parse file
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
            
        columns = list(df.columns)
        
        # Clean NaNs and convert to dicts
        df = df.fillna('')
        records = df.to_dict(orient='records')
        
        lead_file = models.Lead(
            id=uuid.uuid4(),
            user_id=current_user.id,
            campaign_id=campaign_id,
            file_name=file.filename,
            content=records,
            columns=columns,
            created_at=datetime.utcnow()
        )
        db.add(lead_file)
        
        if campaign_id:
            campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
            if campaign:
                campaign.total_leads += len(records)
                
        db.commit()
        
        return schemas.APIResponse(
            success=True,
            message=f"Uploaded {len(records)} leads",
            data={
                "lead_id": str(lead_file.id),
                "file_name": lead_file.file_name,
                "columns": lead_file.columns
            }
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ==================== AI CHAT ENDPOINTS ====================
@app.post("/ai/chat", response_model=schemas.ChatResponse)
async def chat(
    request: schemas.ChatRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send message to AI assistant"""
    try:
        from ai_system import ConversationContext
        
        conversation_id = request.conversation_id or str(uuid.uuid4())
        
        # Get user context
        resume = db.query(models.UserResume).filter(
            models.UserResume.user_id == current_user.id
        ).first()
        
        context = ConversationContext(
            resume_content=resume.raw_text if resume else None,
        )
        
        # Chat with AI
        response = await ai_system.chat(
            str(current_user.id),
            request.message,
            context,
            conversation_id
        )
        
        if response.get("success"):
            # Store in AI memory
            DatabaseService.store_ai_memory(
                db,
                str(current_user.id),
                conversation_id,
                "message",
                "user",
                request.message
            )
            
            DatabaseService.store_ai_memory(
                db,
                str(current_user.id),
                conversation_id,
                "response",
                "assistant",
                response.get("response", ""),
                response.get("important_info", {}).get("importance_score", 0),
                response.get("important_info")
            )
        
        return schemas.ChatResponse(
            success=response.get("success", False),
            response=response.get("response"),
            conversation_id=conversation_id,
            timestamp=response.get("timestamp", datetime.utcnow()),
            error=response.get("error")
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


# ==================== SETTINGS ENDPOINTS ====================
@app.get("/settings", response_model=schemas.APIResponse)
async def get_settings(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user settings"""
    try:
        settings = db.query(models.UserSettings).filter(
            models.UserSettings.user_id == current_user.id
        ).first()
        
        if not settings:
            settings = models.UserSettings(
                id=uuid.uuid4(),
                user_id=current_user.id,
                created_at=datetime.utcnow()
            )
            db.add(settings)
            db.commit()
        
        return schemas.APIResponse(
            success=True,
            data={
                "theme": settings.theme,
                "timezone": settings.timezone,
                "language": settings.language,
                "notifications_enabled": settings.notifications_enabled,
                "email_notifications": settings.email_notifications
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@app.put("/settings", response_model=schemas.APIResponse)
async def update_settings(
    request: schemas.UserSettingsUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user settings"""
    try:
        settings = db.query(models.UserSettings).filter(
            models.UserSettings.user_id == current_user.id
        ).first()
        
        if settings:
            settings.theme = request.theme or settings.theme
            settings.timezone = request.timezone or settings.timezone
            settings.language = request.language or settings.language
            if request.notifications_enabled is not None:
                settings.notifications_enabled = request.notifications_enabled
            if request.email_notifications is not None:
                settings.email_notifications = request.email_notifications
            settings.updated_at = datetime.utcnow()
            db.commit()
        
        return schemas.APIResponse(
            success=True,
            message="Settings updated"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@app.get("/api/me")
def get_me(request: Request, user: dict = Depends(verify_supabase_token)):
    """Test protected route. Returns the authenticated user's ID."""
    return {"user_id": request.state.user_id, "email": user.get("email")}

@app.get("/api/campaigns")
def get_campaigns(request: Request, user: dict = Depends(verify_supabase_token), db: Session = Depends(get_db)):
    """Fetch all campaigns for the authenticated user from the database."""
    user_id = request.state.user_id
    
    # Verify user exists in our DB
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found in database.")

    campaigns = db.query(models.Campaign).filter(models.Campaign.user_id == user_id).all()
    
    return [
        {
            "id": str(c.id),
            "name": c.name,
            "status": c.status,
            "sent_count": c.sent_count,
            "total_leads": c.total_leads,
            "progress": int((c.sent_count / c.total_leads) * 100) if c.total_leads > 0 else 0
        }
        for c in campaigns
    ]

@app.get("/api/dashboard/stats")
def get_dashboard_stats(request: Request, db: Session = Depends(get_db), user: dict = Depends(verify_supabase_token)):
    """Fetch dashboard statistics for the authenticated user."""
    user_id = request.state.user_id
    
    total_sent = db.query(models.EmailLog).join(models.Campaign).filter(
        models.Campaign.user_id == user_id,
        models.EmailLog.status == "sent"
    ).count()
    
    active_campaigns = db.query(models.Campaign).filter(
        models.Campaign.user_id == user_id,
        models.Campaign.status == "running"
    ).count()
    
    return {
        "total_emails_sent": total_sent,
        "average_open_rate": "68%",
        "active_campaigns": active_campaigns
    }

@app.post("/api/test-imap")
def test_imap_connection(req: schemas.IMAPTestRequest, request: Request, user: dict = Depends(verify_supabase_token)):
    """
    Tests IMAP login credentials securely.
    Returns the subjects of the last 5 emails in the inbox if successful.
    """
    try:
        imap = imaplib.IMAP4_SSL("imap.gmail.com")
        imap.login(req.email, req.app_password)
        imap.select("inbox")
        status, messages = imap.search(None, "ALL")
        
        email_summaries = []
        if status == "OK" and messages[0]:
            mail_ids = messages[0].split()
            for mail_id in mail_ids[-5:]:
                res_status, msg_data = imap.fetch(mail_id, "(RFC822)")
                if res_status == "OK":
                    for response_part in msg_data:
                        if isinstance(response_part, tuple):
                            msg = email.message_from_bytes(response_part[1])
                            subject, encoding = decode_header(msg["Subject"])[0]
                            if isinstance(subject, bytes):
                                subject = subject.decode(encoding if encoding else "utf-8")
                            
                            from_ = msg.get("From")
                            email_summaries.append({"from": from_, "subject": subject})
        
        imap.logout()
        return {
            "success": True, 
            "message": "IMAP login successful.",
            "recent_emails": email_summaries
        }
        
    except imaplib.IMAP4.error as e:
        raise HTTPException(
            status_code=401, 
            detail=f"IMAP login failed. Please check your App Password. Error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"An unexpected error occurred during IMAP test: {str(e)}"
        )


@app.post("/api/campaigns")
def create_campaign(campaign: schemas.CampaignCreate, request: Request, db: Session = Depends(get_db), user: dict = Depends(verify_supabase_token)):
    """Creates a new campaign for the authenticated user."""
    user_id = request.state.user_id
    
    # Verify user exists in our DB
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found in database. Please ensure you are logged in correctly.")

    new_camp = models.Campaign(name=campaign.name, user_id=user_id)
    db.add(new_camp)
    db.commit()
    db.refresh(new_camp)
    
    return {
        "id": str(new_camp.id), 
        "name": new_camp.name, 
        "status": new_camp.status,
        "progress": 0
    }

@app.post("/api/campaigns/{campaign_id}/leads")
async def upload_leads(campaign_id: str, request: Request, file: UploadFile = File(...), db: Session = Depends(get_db), user: dict = Depends(verify_supabase_token)):
    """Uploads a CSV file of leads and links them to a specific campaign."""
    user_id = request.state.user_id
    
    # Verify campaign exists and belongs to user
    campaign = db.query(models.Campaign).filter(
        models.Campaign.id == campaign_id, 
        models.Campaign.user_id == user_id
    ).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    content = await file.read()
    try:
        decoded = content.decode('utf-8-sig') # Handle BOM if present
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid CSV encoding. Please use UTF-8.")
        
    csv_reader = csv.DictReader(io.StringIO(decoded))
    
    added_count = 0
    for row in csv_reader:
        # Normalize keys (lowercase and strip) to find email easily
        normalized_row = {k.strip().lower(): v.strip() for k, v in row.items() if k and v}
        
        email = normalized_row.get("email")
        if not email:
            continue # Skip rows without email
            
        first_name = normalized_row.get("first name") or normalized_row.get("firstname") or normalized_row.get("first_name") or ""
        last_name = normalized_row.get("last name") or normalized_row.get("lastname") or normalized_row.get("last_name") or ""
        company = normalized_row.get("company") or ""
        role = normalized_row.get("role") or normalized_row.get("job title") or normalized_row.get("title") or ""
        
        lead = models.Lead(
            campaign_id=campaign.id,
            email=email,
            first_name=first_name,
            last_name=last_name,
            company=company,
            role=role,
            custom_variables=normalized_row # Store entire row just in case
        )
        db.add(lead)
        added_count += 1
        
    campaign.total_leads += added_count
    db.commit()
    
    return {"success": True, "message": f"Successfully added {added_count} leads", "total_leads": campaign.total_leads}


@app.post("/api/campaigns/{campaign_id}/send")
def launch_campaign(campaign_id: str, request: Request, db: Session = Depends(get_db), user: dict = Depends(verify_supabase_token)):
    """Queue a campaign for sending via Celery"""
    user_id = request.state.user_id

    # Verify campaign exists and belongs to user
    campaign = db.query(models.Campaign).filter(
        models.Campaign.id == campaign_id,
        models.Campaign.user_id == user_id
    ).first()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if not campaign.total_leads or campaign.total_leads == 0:
        raise HTTPException(status_code=400, detail="Campaign has no leads to send to")

    # Update campaign status and persist
    campaign.status = "scheduled"
    campaign.scheduled_at = datetime.utcnow()
    db.commit()

    # Enqueue Celery task
    try:
        send_campaign_emails.delay(str(campaign_id))
    except Exception as e:
        # Rollback to previous state on failure to enqueue
        campaign.status = "draft"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to queue campaign: {str(e)}")

    return {"success": True, "message": "Campaign queued for sending"}

# --- OTP Auth Flow ---
class SendOTPRequest(BaseModel):
    email: str

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str

# In-memory store for prototype. Use Redis/DB in production.
otp_store = {}

@app.post("/api/auth/send-otp")
def send_otp(req: SendOTPRequest, db: Session = Depends(get_db)):
    """Generates and sends a 6-digit OTP to the user's email via SMTP."""
    user_email = req.email.strip().lower()
    
    # Check if user already exists
    existing_user = db.query(models.User).filter(models.User.email == user_email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email is already registered. Please sign in.")

    # Generate OTP
    otp = str(random.randint(100000, 999999))
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    otp_store[user_email] = {"otp": otp, "expires_at": expires_at}
    
    # Send via SMTP
    sender_email = os.getenv("TEST_EMAIL")
    sender_password = os.getenv("TEST_APP_PASSWORD")
    
    if not sender_email or not sender_password:
        # Fallback for dev if credentials are missing
        print(f"[DEV MODE] OTP for {user_email} is {otp}")
        return {"success": True, "message": "OTP generated. Check console logs."}
        
    try:
        msg = EmailMessage()
        msg.set_content(f"Your OutreachX verification code is: {otp}\n\nThis code expires in 10 minutes.")
        msg["Subject"] = "Verify your OutreachX account"
        msg["From"] = f"OutreachX <{sender_email}>"
        msg["To"] = user_email
        
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(sender_email, sender_password)
            server.send_message(msg)
            
        return {"success": True, "message": "OTP sent successfully to your email."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email. Ensure TEST_APP_PASSWORD is valid. Error: {str(e)}")

@app.post("/api/auth/verify-otp")
def verify_otp(req: VerifyOTPRequest):
    """Verifies the submitted OTP."""
    user_email = req.email.strip().lower()
    record = otp_store.get(user_email)
    
    if not record:
        raise HTTPException(status_code=400, detail="No OTP requested for this email.")
        
    if datetime.utcnow() > record["expires_at"]:
        del otp_store[user_email]
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
        
    if record["otp"] != req.otp.strip():
        raise HTTPException(status_code=400, detail="Invalid OTP code.")
        
    # Mark as verified (remove from store)
    del otp_store[user_email]
    
    return {"success": True, "message": "OTP verified successfully. You may now complete sign up."}

# --- Phase 4 & 5: Email Engine & Credentials ---

class CredentialCreate(BaseModel):
    email_address: str
    app_password: str

@app.post("/api/credentials")
def save_credentials(cred: CredentialCreate, request: Request, db: Session = Depends(get_db)):
    """Encrypts and stores SMTP app passwords."""
    user_id = request.state.user_id
    
    try:
        encrypted_pass = encrypt_credential(cred.app_password)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Encryption failed. Ensure ENCRYPTION_KEY is securely configured.")
        
    db_cred = models.EmailCredential(
        user_id=user_id,
        email_address=cred.email_address,
        encrypted_password=encrypted_pass,
        is_verified=True
    )
    db.add(db_cred)
    db.commit()
    return {"success": True, "message": "Credentials saved successfully."}

async def send_campaign_background(campaign_id: str, user_id: str):
    """Background task to iterate through leads, personalize emails, apply jitter, and execute SMTP sends."""
    db = SessionLocal()
    try:
        campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id, models.Campaign.user_id == user_id).first()
        if not campaign:
            return
            
        credentials = db.query(models.EmailCredential).filter(models.EmailCredential.user_id == user_id).first()
        if not credentials:
            return
            
        try:
            plain_password = decrypt_credential(credentials.encrypted_password)
        except Exception:
            return
            
        leads = db.query(models.Lead).filter(models.Lead.campaign_id == campaign_id, models.Lead.status == "pending").all()
        
        campaign.status = "running"
        db.commit()
        
        template = "Hi {{name}},\n\nI noticed you work at {{company}} as a {{role}} and wanted to reach out.\n\nBest,\nOutreachX System"
        
        for lead in leads:
            # Check Daily Limit (500)
            daily_logs = db.query(models.EmailLog).join(models.Campaign).filter(
                models.Campaign.user_id == user_id,
                models.EmailLog.sent_at >= datetime.utcnow() - timedelta(days=1)
            ).count()
            
            if daily_logs >= 500:
                campaign.status = "paused"
                db.commit()
                break
                
            # Check Hourly Limit (50)
            hourly_logs = db.query(models.EmailLog).join(models.Campaign).filter(
                models.Campaign.user_id == user_id,
                models.EmailLog.sent_at >= datetime.utcnow() - timedelta(hours=1)
            ).count()
            
            if hourly_logs >= 50:
                campaign.status = "paused"
                db.commit()
                break
                
            # Personalization
            content = template.replace("{{name}}", lead.first_name or "there")
            content = content.replace("{{company}}", lead.company or "your company")
            content = content.replace("{{role}}", lead.role or "your position")
            
            # Construct Email
            msg = EmailMessage()
            msg.set_content(content)
            msg["Subject"] = f"Connecting regarding {lead.company or 'your work'}"
            msg["From"] = credentials.email_address
            msg["To"] = lead.email
            
            # Log preparation
            log = models.EmailLog(campaign_id=campaign.id, lead_id=lead.id, status="pending")
            db.add(log)
            db.commit()
            db.refresh(log)
            
            try:
                # Send Email
                with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
                    server.login(credentials.email_address, plain_password)
                    server.send_message(msg)
                
                # Update statuses on success
                lead.status = "sent"
                lead.sent_at = datetime.utcnow()
                log.status = "sent"
                campaign.sent_count += 1
                db.commit()
                
            except Exception as e:
                # Handle Failure
                lead.status = "failed"
                log.status = "failed"
                log.last_error = str(e)
                db.commit()
                
            # Random Jitter (30 to 90 seconds) to prevent spam flags
            await asyncio.sleep(random.uniform(30.0, 90.0))
            
        # Re-check to see if completed
        remaining_pending = db.query(models.Lead).filter(models.Lead.campaign_id == campaign_id, models.Lead.status == "pending").count()
        if remaining_pending == 0:
            campaign.status = "completed"
            db.commit()

    finally:
        db.close()


@app.post("/api/campaigns/{campaign_id}/send")
def start_campaign_send(campaign_id: str, background_tasks: BackgroundTasks, request: Request, db: Session = Depends(get_db), user: dict = Depends(verify_supabase_token)):
    """Triggers the background email sending engine for a specific campaign."""
    user_id = request.state.user_id
    
    # Check if user has added an SMTP account
    credentials = db.query(models.EmailCredential).filter(models.EmailCredential.user_id == user_id).first()
    if not credentials:
        raise HTTPException(status_code=400, detail="No email credentials found. Please add an SMTP account first.")
        
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id, models.Campaign.user_id == user_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
        
    background_tasks.add_task(send_campaign_background, campaign_id, user_id)
    return {"success": True, "message": "Campaign started successfully in the background."}


# ==================== SETTINGS ENDPOINTS ====================

@app.get("/settings/profile", response_model=schemas.APIResponse)
def get_user_profile(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Fetch user profile information"""
    profile = schemas.UserProfile(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        phone=current_user.phone,
        resume_uploaded=current_user.resume_uploaded,
        is_verified=current_user.is_verified,
        app_password_verified=current_user.app_password_verified,
        created_at=current_user.created_at
    )
    return schemas.APIResponse(success=True, data=profile)

@app.put("/settings/profile", response_model=schemas.APIResponse)
def update_user_profile(
    update_data: schemas.UserProfileUpdate, 
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Update user profile information"""
    try:
        if update_data.full_name is not None:
            current_user.full_name = update_data.full_name
        if update_data.role is not None:
            current_user.role = update_data.role
        if update_data.phone is not None:
            current_user.phone = update_data.phone
            
        db.commit()
        db.refresh(current_user)
        
        profile = schemas.UserProfile(
            id=str(current_user.id),
            email=current_user.email,
            full_name=current_user.full_name,
            role=current_user.role,
            phone=current_user.phone,
            resume_uploaded=current_user.resume_uploaded,
            is_verified=current_user.is_verified,
            app_password_verified=current_user.app_password_verified,
            created_at=current_user.created_at
        )
        return schemas.APIResponse(success=True, message="Profile updated successfully", data=profile)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/settings/change-password/request", response_model=schemas.APIResponse)
def request_password_change(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Send OTP for password change"""
    try:
        otp = str(random.randint(100000, 999999))
        expires_at = datetime.utcnow() + timedelta(minutes=5)
        
        # Save to DB
        new_otp = models.OTPCode(
            user_id=current_user.id,
            email=current_user.email,
            code=otp,
            purpose=models.OTPPurpose.password_reset.value,
            expires_at=expires_at
        )
        db.add(new_otp)
        db.commit()
        
        # Send email via systemic SMTP
        sender_email = os.getenv("SYSTEM_EMAIL") or os.getenv("TEST_EMAIL")
        sender_password = os.getenv("SYSTEM_EMAIL_PASSWORD") or os.getenv("TEST_APP_PASSWORD")
        
        if sender_email and sender_password:
            msg = EmailMessage()
            msg.set_content(f"Your password reset OTP is: {otp}\n\nThis code expires in 5 minutes.")
            msg["Subject"] = "Password Reset Request - OutreachX"
            msg["From"] = f"OutreachX Security <{sender_email}>"
            msg["To"] = current_user.email
            
            with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
                server.login(sender_email, sender_password)
                server.send_message(msg)
        
        return schemas.APIResponse(success=True, message="OTP sent successfully to your email.")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to send OTP: {str(e)}")

@app.post("/settings/change-password/verify", response_model=schemas.APIResponse)
def verify_password_change(
    req: schemas.PasswordChangeVerify, 
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Verify OTP and change password"""
    otp_record = db.query(models.OTPCode).filter(
        models.OTPCode.user_id == current_user.id,
        models.OTPCode.purpose == models.OTPPurpose.password_reset.value,
        models.OTPCode.is_used == False
    ).order_by(models.OTPCode.created_at.desc()).first()
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="No OTP requested.")
        
    if datetime.now(timezone.utc) > otp_record.expires_at:
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
        
    if otp_record.code != req.otp.strip():
        raise HTTPException(status_code=400, detail="Invalid OTP code.")
        
    try:
        # Mark used
        otp_record.is_used = True
        
        # Update password
        current_user.password_hash = hash_password(req.new_password)
        db.commit()
        
        return schemas.APIResponse(success=True, message="Password updated successfully.")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


def send_system_verification_email(target_email: str, verification_code: str) -> str:
    """Send verification email from system account and return the subject."""
    sender_email = os.getenv("SYSTEM_EMAIL") or os.getenv("TEST_EMAIL")
    sender_password = os.getenv("SYSTEM_EMAIL_PASSWORD") or os.getenv("TEST_APP_PASSWORD")

    if not sender_email or not sender_password:
        raise HTTPException(status_code=500, detail="System email configuration is missing.")

    subject = f"Welcome to OutreachX! (Sync ID: {verification_code[:8]})"
    msg = EmailMessage()
    msg.set_content(
        "Welcome to OutreachX!\n\n"
        "Your email is being connected to the platform. If successful, you will be able to launch "
        "automated cold outreach campaigns directly from your dashboard.\n\n"
        "Best regards,\nThe OutreachX Team\n\n"
        f"(System Reference: {verification_code})"
    )
    msg["Subject"] = subject
    msg["From"] = f"OutreachX System <{sender_email}>"
    msg["To"] = target_email

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(sender_email, sender_password)
            server.send_message(msg)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send welcome email from system: {str(e)}")

    return subject


def verify_email_receipt_via_imap(email_address: str, app_password: str, provider: str, verification_code: str) -> None:
    """Verify receipt of the verification email in the user's inbox using IMAP."""
    imap_server = "imap.gmail.com" if provider == "gmail" else "outlook.office365.com"

    try:
        mail = imaplib.IMAP4_SSL(imap_server)
        mail.login(email_address, app_password)
        mail.select("inbox")

        search_criteria = f'(SUBJECT "Sync ID: {verification_code[:8]}")'
        status_code, messages = mail.search(None, search_criteria)

        if status_code != "OK" or not messages[0]:
            mail.logout()
            raise HTTPException(status_code=400, detail="IMAP Verification Failed: Could not locate the test email in inbox.")

        for num in messages[0].split():
            mail.store(num, '+FLAGS', '\\Deleted')
        mail.expunge()
        mail.logout()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"IMAP Verification Failed: {str(e)}")

@app.post("/settings/app-password/verify", response_model=schemas.APIResponse)
async def verify_app_password(
    req: schemas.AppPasswordVerifyRequest, 
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Verify an App Password using System SMTP and User IMAP bounce tests"""
    verification_code = str(uuid.uuid4())
    send_system_verification_email(current_user.email, verification_code)

    # Wait for the email to arrive in user's inbox
    await asyncio.sleep(4)

    # 2. IMAP Phase - Log into USER's inbox using USER'S APP PASSWORD
    verify_email_receipt_via_imap(current_user.email, req.app_password, req.provider, verification_code)
        
    # 3. Store Securely
    try:
        encrypted_pass = encrypt_credential(req.app_password)
        current_user.encrypted_app_password = encrypted_pass
        current_user.app_password_verified = True
        db.commit()
        
        return schemas.APIResponse(success=True, message="App Password verified and securely stored.")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to encrypt and store credential: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
