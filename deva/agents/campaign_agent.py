from typing import Dict, Any, List
from sqlalchemy.orm import Session
from shared.models import Template, Lead, Campaign
import uuid

class CampaignAgent:
    @staticmethod
    async def prepare_campaign_wizard(
        db: Session,
        user_id: str,
        campaign_name: str
    ) -> Dict[str, Any]:
        """Setup template, leads, and variables mapping for a new campaign"""
        
        # 1. Fetch available lead lists and templates
        templates = db.query(Template).filter(Template.user_id == user_id).all()
        leads = db.query(Lead).filter(Lead.user_id == user_id).all()
        
        if not templates:
            return {
                "message": "I found no templates in your account. Let's create an outreach template first. What is the target role or goal of your campaign?",
                "actions": [{"type": "general", "label": "Start Template Generator", "payload": {}}]
            }
            
        if not leads:
            return {
                "message": "I found no lead lists in your account. You need to import or generate a lead list first. Would you like me to search for leads?",
                "actions": [
                    {"type": "find_leads", "label": "Search for Leads", "payload": {"query": "Find SaaS founders"}},
                    {"type": "upload_lead_file", "label": "Upload Lead List File", "payload": {}}
                ]
            }
            
        # Select defaults (most recent)
        default_template = templates[-1]
        default_lead = leads[-1]
        
        # Determine variable mappings
        template_variables = default_template.variables or []
        lead_columns = default_lead.columns or []
        
        # Simple automatic mapping logic
        variable_mapping = {}
        for var in template_variables:
            matched = False
            for col in lead_columns:
                if col.lower().replace("_", "").replace(" ", "") == var.lower().replace("_", "").replace(" ", ""):
                    variable_mapping[var] = col
                    matched = True
                    break
            if not matched:
                # Fallback to column closest match or first column
                variable_mapping[var] = lead_columns[0] if lead_columns else ""
                
        # Structure the campaign wizard widget payload
        widget_action = {
            "type": "widget_campaign_wizard",
            "label": "Review and Start Campaign",
            "payload": {
                "name": campaign_name,
                "leads_file_name": default_lead.file_name,
                "template_name": default_template.name,
                "leads_id": str(default_lead.id),
                "template_id": str(default_template.id),
                "variable_mapping": variable_mapping
            }
        }
        
        return {
            "message": f"I've set up a draft campaign configuration for '{campaign_name}'. Review the leads and template mapping below to initiate execution:",
            "actions": [widget_action]
        }
