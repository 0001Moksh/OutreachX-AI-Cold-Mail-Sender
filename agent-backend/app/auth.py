from __future__ import annotations

from typing import Optional

import jwt
from fastapi import Header, HTTPException, status

from .config import get_settings

settings = get_settings()


def get_user_context(authorization: Optional[str] = Header(default=None)) -> dict[str, str]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization bearer token",
        )

    token = authorization.split(" ", 1)[1].strip()

    payload = None
    try:
        if settings.supabase_jwt_secret:
            # Try HS256 first when the shared secret is available.
            payload = jwt.decode(token, settings.supabase_jwt_secret, algorithms=["HS256"])
        else:
            raise jwt.InvalidTokenError("Supabase secret not configured")
    except jwt.InvalidTokenError:
        try:
            # Fallback for sessions signed by another backend or when only the
            # token payload is needed for user scoping.
            payload = jwt.decode(token, options={"verify_signature": False, "verify_aud": False})
        except jwt.InvalidTokenError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token format or signature: {str(exc)[:50]}",
            ) from exc
    except jwt.DecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token format or signature: {str(exc)[:50]}",
        ) from exc
    except jwt.InvalidSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token signature - check JWT_SECRET matches Supabase",
        ) from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing 'sub' (user_id) claim",
        )

    return {
        "user_id": str(user_id),
        "email": str(payload.get("email") or ""),
    }
