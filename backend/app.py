import imaplib
import email
from email.header import decode_header
import os
from dotenv import load_dotenv

load_dotenv()

# User credentials
EMAIL = os.getenv("EMAIL")
APP_PASSWORD = os.getenv("APP_PASSWORD")


def fetch_recent_emails(max_emails=5):
    """
    Fetch recent emails from Gmail.
    This function should be called when needed, not at module import time.
    """
    if not EMAIL or not APP_PASSWORD:
        raise ValueError("EMAIL and APP_PASSWORD must be set in environment variables")
    
    # Connect to Gmail IMAP server
    imap = imaplib.IMAP4_SSL("imap.gmail.com")

    # Login
    imap.login(EMAIL, APP_PASSWORD)

    # Select inbox
    imap.select("inbox")

    # Search for all emails
    status, messages = imap.search(None, "ALL")

    # Convert messages to list
    mail_ids = messages[0].split()

    # Get latest emails
    for mail_id in mail_ids[-max_emails:]:
        status, msg_data = imap.fetch(mail_id, "(RFC822)")
        
        for response_part in msg_data:
            if isinstance(response_part, tuple):
                msg = email.message_from_bytes(response_part[1])
                
                # Decode subject
                subject, encoding = decode_header(msg["Subject"])[0]
                if isinstance(subject, bytes):
                    subject = subject.decode(encoding if encoding else "utf-8")
                
                from_ = msg.get("From")

                print("From:", from_)
                print("Subject:", subject)
                print("-" * 50)

    # Logout
    imap.logout()