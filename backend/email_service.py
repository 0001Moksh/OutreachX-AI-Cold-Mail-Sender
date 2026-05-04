"""
Email service for OutreachX
Handles SMTP sending, IMAP verification, and email operations
"""

import os
import smtplib
import imaplib
import asyncio
from typing import Optional, List, Dict, Any
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import decode_header
import aiosmtplib
from security import decrypt_credential
from dotenv import load_dotenv

load_dotenv()


class EmailService:
    """Handle email sending and verification"""
    
    @staticmethod
    async def send_email(
        smtp_server: str,
        smtp_port: int,
        email_address: str,
        password: str,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send email using SMTP
        Returns: {"success": bool, "message_id": str or error message}
        """
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = email_address
            msg["To"] = to_email
            
            # Attach text and HTML
            if text_content and text_content.strip():
                part1 = MIMEText(text_content, "plain")
                msg.attach(part1)
            
            if html_content and html_content.strip():
                part2 = MIMEText(html_content, "html")
                msg.attach(part2)
            elif not text_content or not text_content.strip():
                # Fallback if both are empty
                msg.attach(MIMEText("No content provided", "plain"))
            
            # Send email
            async with aiosmtplib.SMTP(hostname=smtp_server, port=smtp_port) as smtp:
                await smtp.login(email_address, password)
                response = await smtp.send_message(msg)
                
            return {
                "success": True,
                "message_id": response if response else "sent",
                "to": to_email
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "to": to_email
            }
    
    @staticmethod
    def verify_email_credentials(
        email_address: str,
        password: str,
        provider: str = "gmail"
    ) -> Dict[str, Any]:
        """
        Verify email credentials using IMAP
        Returns: {"verified": bool, "message": str}
        """
        try:
            # Get IMAP server based on provider
            imap_servers = {
                "gmail": "imap.gmail.com",
                "outlook": "imap-mail.outlook.com",
                "yahoo": "imap.mail.yahoo.com",
                "custom": None
            }
            
            imap_server = imap_servers.get(provider, "imap.gmail.com")
            if not imap_server:
                return {"verified": False, "message": "Unknown email provider"}
            
            # Connect and authenticate
            mail = imaplib.IMAP4_SSL(imap_server)
            mail.login(email_address, password)
            mail.select("INBOX", readonly=True)
            
            # Check if we can access inbox
            status, count = mail.select("INBOX", readonly=True)
            mail.close()
            mail.logout()
            
            if status == "OK":
                return {
                    "verified": True,
                    "message": "Email credentials verified successfully"
                }
            else:
                return {
                    "verified": False,
                    "message": "Could not verify email credentials"
                }
                
        except imaplib.IMAP4.error as e:
            return {
                "verified": False,
                "message": f"IMAP error: {str(e)}"
            }
        except Exception as e:
            return {
                "verified": False,
                "message": f"Verification failed: {str(e)}"
            }
    
    @staticmethod
    def send_test_email(
        email_address: str,
        encrypted_password: str,
        provider: str = "gmail"
    ) -> Dict[str, Any]:
        """Send a test email to verify SMTP setup"""
        
        # Map providers to SMTP servers
        smtp_config = {
            "gmail": {"server": "smtp.gmail.com", "port": 587},
            "outlook": {"server": "smtp-mail.outlook.com", "port": 587},
            "yahoo": {"server": "smtp.mail.yahoo.com", "port": 587},
            "custom": {"server": None, "port": 587}
        }
        
        config = smtp_config.get(provider, smtp_config["gmail"])
        
        try:
            password = decrypt_credential(encrypted_password)
            
            # Create message
            msg = MIMEMultipart()
            msg["Subject"] = "OutreachX - Test Email"
            msg["From"] = email_address
            msg["To"] = email_address
            
            body = """
            <h2>OutreachX Email Verification Test</h2>
            <p>If you're seeing this, your email credentials are configured correctly!</p>
            <p>You can now use this email address for sending campaigns.</p>
            """
            
            msg.attach(MIMEText(body, "html"))
            
            # Send
            with smtplib.SMTP(config["server"], config["port"]) as server:
                server.starttls()
                server.login(email_address, password)
                server.send_message(msg)
            
            return {
                "success": True,
                "message": "Test email sent successfully"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }


class OTPEmailService:
    """Send OTP emails"""
    
    @staticmethod
    async def send_otp_email(
        to_email: str,
        otp: str,
        purpose: str = "signup"
    ) -> bool:
        """
        Send OTP via system email
        """
        try:
            system_email = os.getenv("SYSTEM_EMAIL", "noreply@outreachx.com")
            system_password = os.getenv("SYSTEM_EMAIL_PASSWORD", "")
            
            subject_map = {
                "signup": "Your OutreachX Signup OTP",
                "login": "Your OutreachX Login OTP",
                "password_reset": "Reset Your OutreachX Password",
                "email_verification": "Verify Your Email"
            }
            
            subject = subject_map.get(purpose, "Your OutreachX OTP")
            
            html_content = f"""
            <h2>{subject}</h2>
            <p>Your One-Time Password (OTP) is:</p>
            <h1 style="color: #4CAF50;">{otp}</h1>
            <p>This OTP is valid for 10 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
            """
            
            result = await EmailService.send_email(
                smtp_server="smtp.gmail.com",
                smtp_port=587,
                email_address=system_email,
                password=system_password,
                to_email=to_email,
                subject=subject,
                html_content=html_content,
                text_content=f"Your OTP is: {otp}"
            )
            
            return result["success"]
            
        except Exception as e:
            print(f"Error sending OTP: {str(e)}")
            return False
