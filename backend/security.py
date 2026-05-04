import os
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional
import jwt
from passlib.context import CryptContext
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT config
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Encryption for sensitive data
encryption_key = os.getenv("ENCRYPTION_KEY")

if encryption_key:
    try:
        cipher_suite = Fernet(encryption_key.encode())
    except ValueError:
        cipher_suite = None
else:
    cipher_suite = None


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    # bcrypt limits passwords to 72 bytes, truncate to prevent errors
    # Encode to bytes, truncate, then decode (ignoring errors if we chop a multibyte char)
    truncated = password.encode('utf-8')[:72].decode('utf-8', 'ignore')
    return pwd_context.hash(truncated)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    truncated = plain_password.encode('utf-8')[:72].decode('utf-8', 'ignore')
    return pwd_context.verify(truncated, hashed_password)


def encrypt_credential(plain_text: str) -> str:
    """Encrypts a plain text string using AES-256 (Fernet)."""
    if not cipher_suite:
        raise ValueError("ENCRYPTION_KEY is not set or invalid in environment variables.")
    return cipher_suite.encrypt(plain_text.encode('utf-8')).decode('utf-8')


def decrypt_credential(cipher_text: str) -> str:
    """Decrypts a cipher text string using AES-256 (Fernet)."""
    if not cipher_suite:
        raise ValueError("ENCRYPTION_KEY is not set or invalid in environment variables.")
    return cipher_suite.decrypt(cipher_text.encode('utf-8')).decode('utf-8')


def generate_otp(length: int = 6) -> str:
    """Generate a random OTP"""
    return ''.join([str(secrets.randbelow(10)) for _ in range(length)])


def create_access_token(user_id: str, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    if expires_delta is None:
        expires_delta = timedelta(hours=JWT_EXPIRATION_HOURS)
    
    expire = datetime.utcnow() + expires_delta
    to_encode = {"sub": user_id, "exp": expire, "iat": datetime.utcnow()}
    
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[str]:
    """Verify JWT token and return user_id"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        return user_id
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def generate_random_string(length: int = 32) -> str:
    """Generate a random string for verification links"""
    return secrets.token_urlsafe(length)
