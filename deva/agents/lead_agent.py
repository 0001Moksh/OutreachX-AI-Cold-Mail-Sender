import json
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from deva.tools.tavily_search import TavilySearchTool
from deva.services.llm_service import LLMService
from deva.prompts.system_prompts import LEAD_SEARCH_PROMPT

class LeadAgent:
    @staticmethod
    async def find_leads(
        db: Session,
        user_id: str,
        search_request: str
    ) -> Dict[str, Any]:
        """Convert lead request to Tavily query, fetch pages, and extract lead information"""
        
        # 1. Generate search query using LLM
        search_spec = await LLMService.call_llm_json(
            system_prompt=LEAD_SEARCH_PROMPT,
            user_message=search_request
        )
        
        query = search_spec.get("search_query", search_request)
        filters = search_spec.get("filters", {})
        
        # 2. Execute Tavily search
        search_tool = TavilySearchTool()
        search_results = await search_tool.search(query, max_results=5)
        
        # 3. Parse/Extract leads from search results
        extracted_leads = []
        has_mock_leads = any("raw_lead" in r for r in search_results)
        
        if has_mock_leads:
            for result in search_results:
                raw_lead = result.get("raw_lead")
                if raw_lead:
                    extracted_leads.append(raw_lead)
        else:
            if search_results:
                extraction_prompt = """You are an expert lead parser. Extract structured leads from the search results content.
For each lead, you must find a valid email address. Do NOT create or fabricate fake email addresses (such as @example.com, @sample.com, @domain.com, etc.). Only extract real email addresses mentioned in the text.
If no valid email is found for a lead, skip that lead.

Output a JSON object with a "leads" key containing a list of leads:
{
  "leads": [
    {
      "company_name": "Company Name",
      "contact_name": "Contact Person Name (or 'Unknown')",
      "email": "real_email@address.com",
      "website": "http://...",
      "location": "Location (or 'Global')",
      "role": "Role (or 'Executive')"
    }
  ]
}"""
                user_message = f"Search Results:\n{json.dumps(search_results, indent=2)}\n\nFilters: {json.dumps(filters)}"
                try:
                    parsed = await LLMService.call_llm_json(
                        system_prompt=extraction_prompt,
                        user_message=user_message
                    )
                    extracted_leads = parsed.get("leads", [])
                except Exception as e:
                    print(f"Failed to parse search results with LLM: {e}")

        # Clean duplicates
        seen_emails = set()
        unique_leads = []
        for lead in extracted_leads:
            email = lead.get("email", "").lower()
            # Verify it's not a generic example/sample domain
            if not email:
                continue
            is_fake = any(fake in email for fake in ["@example.com", "@sample.com", "@domain.com"])
            if email and email not in seen_emails and not is_fake:
                seen_emails.add(email)
                unique_leads.append(lead)

        if not unique_leads:
            return {
                "message": "I am not able to search in this current situation.",
                "actions": [],
                "leads": []
            }

        # Prepare action for approval
        file_name = f"Leads_{filters.get('role', 'Prospects').replace(' ', '_')}_{filters.get('location', 'Global').replace(' ', '_')}.csv"
        
        widget_action = {
            "type": "create_lead_file", # Handled via /deva/actions
            "label": f"Create Lead List: {file_name}",
            "payload": {
                "file_name": file_name,
                "leads": unique_leads
            }
        }
        
        message = f"I searched and discovered {len(unique_leads)} prospect leads matching your criteria ({filters.get('role')} in {filters.get('location')}).\n\n"
        for lead in unique_leads[:3]:
            message += f"- **{lead['contact_name']}** ({lead['role']}) at *{lead['company_name']}* ({lead['email']})\n"
        if len(unique_leads) > 3:
            message += f"...and {len(unique_leads)-3} more.\n\n"
            
        message += "Would you like me to save these prospects to a new lead list file?"
        
        return {
            "message": message,
            "actions": [widget_action],
            "leads": unique_leads
        }

