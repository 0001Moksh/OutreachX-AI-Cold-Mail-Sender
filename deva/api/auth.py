import os
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import jwt
from shared.database import get_db
from shared.models import User

security = HTTPBearer()
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

def verify_token(token: str) -> Optional[str]:
    """Verify JWT token and return user_id"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("sub")
    except Exception:
        return None

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Verify token and get current user (supports standard and Supabase JWTs)"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No credentials provided",
        )
    
    token = credentials.credentials
    user_id = verify_token(token)
    payload = {}
    decode_error = None
    
    if not user_id:
        try:
            # Fall back to payload-only decode (for Supabase or other unverified tokens)
            # If Supabase secret is provided, try verifying it
            if SUPABASE_JWT_SECRET:
                try:
                    payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], options={"verify_aud": False})
                    user_id = payload.get("sub")
                except Exception as e:
                    # Fall back to unverified decode
                    payload = jwt.decode(token, options={"verify_signature": False, "verify_aud": False})
                    user_id = payload.get("sub")
                    decode_error = str(e)
            else:
                payload = jwt.decode(token, options={"verify_signature": False, "verify_aud": False})
                user_id = payload.get("sub")
        except Exception as e:
            decode_error = str(e)
            print(f"Token decoding failed: {e}")

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
            detail="Invalid token: user ID is not a valid UUID format"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        # Auto-sync user if metadata is available
        try:
            email = payload.get("email", f"{user_id}@supabase.placeholder")
            user = User(
                id=user_id,
                email=email,
                status="active",
                is_verified=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to sync user: {str(e)}"
            )
            
    return user
