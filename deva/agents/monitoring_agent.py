from typing import Dict, Any, List
from sqlalchemy.orm import Session
from shared.models import Campaign, EmailLog

class MonitoringAgent:
    @staticmethod
    def get_campaign_progress(db: Session, user_id: str, campaign_id: str) -> Dict[str, Any]:
        """Aggregate stats for a specific campaign, ensuring multi-tenant isolation"""
        campaign = db.query(Campaign).filter(
            Campaign.user_id == user_id,
            Campaign.id == campaign_id
        ).first()
        
        if not campaign:
            return {"error": "Campaign not found"}
            
        return {
            "campaign_id": str(campaign.id),
            "name": campaign.name,
            "status": campaign.status,
            "total_leads": campaign.total_leads,
            "sent": campaign.sent_count,
            "opened": campaign.opened_count,
            "replied": campaign.replied_count,
            "failed": campaign.failed_count,
            "bounced": campaign.bounced_count,
            "remaining": max(0, campaign.total_leads - campaign.sent_count)
        }

    @staticmethod
    def get_user_overview(db: Session, user_id: str) -> Dict[str, Any]:
        """Get high-level summary stats for all campaigns belonging to the user"""
        campaigns = db.query(Campaign).filter(Campaign.user_id == user_id).all()
        
        total_campaigns = len(campaigns)
        total_leads = sum(c.total_leads for c in campaigns)
        total_sent = sum(c.sent_count for c in campaigns)
        total_opened = sum(c.opened_count for c in campaigns)
        total_replied = sum(c.replied_count for c in campaigns)
        
        return {
            "total_campaigns": total_campaigns,
            "total_leads": total_leads,
            "sent": total_sent,
            "opened": total_opened,
            "replied": total_replied,
            "active_campaigns": len([c for c in campaigns if c.status == "running"])
        }
