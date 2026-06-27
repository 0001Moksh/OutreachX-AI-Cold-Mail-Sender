import os
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
from base64 import b64encode, b64decode

# A 32-byte master key for AES-256
# In production, this MUST come from an environment variable!
MASTER_KEY = os.getenv("ENCRYPTION_MASTER_KEY", "0123456789abcdef0123456789abcdef").encode('utf-8')

def encrypt_api_key(plain_text_key: str) -> str:
    """Encrypts a plain text API key using AES-256-CBC."""
    try:
        cipher = AES.new(MASTER_KEY, AES.MODE_CBC)
        ct_bytes = cipher.encrypt(pad(plain_text_key.encode('utf-8'), AES.block_size))
        iv = b64encode(cipher.iv).decode('utf-8')
        ct = b64encode(ct_bytes).decode('utf-8')
        return f"{iv}:{ct}"
    except Exception as e:
        print(f"Encryption error: {e}")
        return ""

def decrypt_api_key(encrypted_key_str: str) -> str:
    """Decrypts an encrypted API key back to plain text, or returns it as-is if unencrypted."""
    if not encrypted_key_str:
        return ""
    if ":" not in encrypted_key_str:
        return encrypted_key_str
        
    try:
        iv_b64, ct_b64 = encrypted_key_str.split(':')
        iv = b64decode(iv_b64)
        ct = b64decode(ct_b64)
        cipher = AES.new(MASTER_KEY, AES.MODE_CBC, iv)
        pt = unpad(cipher.decrypt(ct), AES.block_size)
        return pt.decode('utf-8')
    except Exception as e:
        print(f"Decryption error: {e}")
        return encrypted_key_str
