import os
import sys
from dotenv import load_dotenv

# Ensure we can load models and database configuration
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

from database import SessionLocal
import models

db = SessionLocal()
try:
    campaign_id = "ad448e63-f9dd-4020-87fa-f7246e64388c"
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    
    if campaign:
        print(f"Resetting Campaign '{campaign.name}'...")
        campaign.status = "draft"
        campaign.last_processed_index = 0
        campaign.sent_count = 0
        campaign.failed_count = 0
        campaign.completed_at = None
        campaign.started_at = None
        
        # Delete old logs if any exist
        db.query(models.EmailLog).filter(models.EmailLog.campaign_id == campaign_id).delete()
        
        db.commit()
        print("Campaign reset successfully!")
    else:
        print("Campaign not found.")

finally:
    db.close()
