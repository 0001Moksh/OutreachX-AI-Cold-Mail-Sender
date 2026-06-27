import imaplib
import email
from email.header import decode_header
import re
from typing import List, Set
from datetime import datetime

class IMAPScanner:
    @staticmethod
    def connect(email_address: str, password: str, provider: str = "gmail"):
        imap_servers = {
            "gmail": "imap.gmail.com",
            "outlook": "outlook.office365.com",
            "yahoo": "imap.mail.yahoo.com"
        }
        imap_server = imap_servers.get(provider, "imap.gmail.com")
        mail = imaplib.IMAP4_SSL(imap_server)
        mail.login(email_address, password)
        return mail

    @staticmethod
    def get_replied_emails(mail: imaplib.IMAP4_SSL, since_date: datetime, target_emails: List[str]) -> List[str]:
        """
        Scan inbox for emails FROM any of the target_emails sent AFTER since_date.
        """
        try:
            mail.select("INBOX", readonly=True)
        except Exception:
            return []
            
        date_str = since_date.strftime("%d-%b-%Y")
        replied_emails: Set[str] = set()
        
        try:
            status, messages = mail.search(None, f'(SINCE "{date_str}")')
            if status != "OK" or not messages[0]:
                return []
                
            for msg_id in messages[0].split():
                res, msg_data = mail.fetch(msg_id, "(BODY[HEADER.FIELDS (FROM)])")
                if res != "OK":
                    continue
                    
                for response_part in msg_data:
                    if isinstance(response_part, tuple):
                        msg = email.message_from_bytes(response_part[1])
                        from_header = msg.get("From", "")
                        
                        match = re.search(r'[\w\.-]+@[\w\.-]+', from_header)
                        if match:
                            sender_email = match.group(0).lower()
                            if sender_email in target_emails:
                                replied_emails.add(sender_email)
        except Exception as e:
            print(f"IMAP search error (replies): {e}")
            
        return list(replied_emails)

    @staticmethod
    def get_bounced_emails(mail: imaplib.IMAP4_SSL, since_date: datetime, target_emails: List[str]) -> List[str]:
        """
        Scan inbox for bounce messages and extract original recipient.
        """
        try:
            mail.select("INBOX", readonly=True)
        except Exception:
            return []
            
        date_str = since_date.strftime("%d-%b-%Y")
        bounced_emails: Set[str] = set()
        
        try:
            status, messages = mail.search(None, f'(SINCE "{date_str}")')
            if status != "OK" or not messages[0]:
                return []
                
            for msg_id in messages[0].split():
                res, msg_data = mail.fetch(msg_id, "(RFC822)")
                if res != "OK":
                    continue
                    
                for response_part in msg_data:
                    if isinstance(response_part, tuple):
                        msg = email.message_from_bytes(response_part[1])
                        from_header = msg.get("From", "").lower()
                        subject = str(msg.get("Subject", "")).lower()
                        
                        is_bounce = False
                        if "mailer-daemon" in from_header or "postmaster" in from_header:
                            is_bounce = True
                        elif any(kw in subject for kw in ["undelivered", "delivery status", "failure", "returned to sender", "bounced"]):
                            is_bounce = True
                            
                        if is_bounce:
                            raw_msg = str(msg).lower()
                            for target in target_emails:
                                if target in raw_msg:
                                    bounced_emails.add(target)
        except Exception as e:
            print(f"IMAP search error (bounces): {e}")
            
        return list(bounced_emails)
