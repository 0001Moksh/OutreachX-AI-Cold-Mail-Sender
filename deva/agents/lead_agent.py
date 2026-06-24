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
        search_results = await search_tool.search(query, max_results=25)
        
        # 3. Parse/Extract leads from search results
        extracted_leads = []
        parsed = {}
        has_mock_leads = any("raw_lead" in r for r in search_results)
        
        if has_mock_leads:
            for result in search_results:
                raw_lead = result.get("raw_lead")
                if raw_lead:
                    extracted_leads.append(raw_lead)
        else:
            if search_results:
                extraction_prompt = """You are an expert lead parser. Extract structured leads from the search results content.
For each lead, extract the company details.
If an email is available, extract it. Do NOT create or fabricate fake email addresses (such as @example.com, @sample.com, @domain.com).
If no valid email is found, return an empty string for the email field.

CRITICAL INSTRUCTION: You MUST extract ALL possible distinct companies from the text. DO NOT STOP at just 1. Find as many as you can, up to 20!

Output a JSON object with a "leads" key containing a list of leads:
{
  "leads": [
    {
      "company_name": "Company Name",
      "contact_name": "Contact Person Name (or 'Unknown')",
      "email": "real_email@address.com (or empty string)",
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
        seen_identifiers = set()
        unique_leads = []
        for lead in extracted_leads:
            email = lead.get("email", "").lower()
            company = lead.get("company_name", "").lower()
            
            identifier = email if email else company
            if not identifier:
                continue
                
            is_fake_email = email and any(fake in email for fake in ["@example.com", "@sample.com", "@domain.com"])
            if is_fake_email:
                lead["email"] = ""
                identifier = company
                
            if identifier not in seen_identifiers:
                seen_identifiers.add(identifier)
                unique_leads.append(lead)

        if not unique_leads:
            # Check if it was an API failure
            api_failed = search_spec.get("error") or (not has_mock_leads and parsed.get("error"))
            
            if api_failed:
                return {
                    "message": "⚠️ **API Usage Limit Reached**\n\nPlease try using the Lead Agent again after some time. Our system is currently facing API limitations (such as daily token usage limits) from our intelligence provider. I will be fully operational again shortly to find leads for you!",
                    "actions": [],
                    "leads": []
                }
            else:
                return {
                    "message": "I could not find any valid leads matching your exact criteria. Please try broadening your search or location.",
                    "actions": [],
                    "leads": []
                }

        # Prepare action for approval
        file_name = f"Leads_{filters.get('role', 'Prospects').replace(' ', '_')}_{filters.get('location', 'Global').replace(' ', '_')}.csv"
        
        widget_action = {
            "type": "create_lead_file",
            "label": f"Save Leads to Database",
            "payload": {
                "file_name": file_name,
                "leads": unique_leads
            }
        }
        
        message = f"I searched and discovered **{len(unique_leads)} prospect leads** matching your criteria.\n\n"
        message += "| Company | Contact | Email | Website |\n|---|---|---|---|\n"
        for lead in unique_leads:
            c_name = lead.get('company_name', '')
            contact = lead.get('contact_name', '')
            email = lead.get('email', '')
            web = lead.get('website', '')
            message += f"| {c_name} | {contact} | {email} | {web} |\n"
            
        message += "\n"
            
        message += f"Shall I proceed with saving these prospects to your lead module as `{file_name}`?"
        
        return {
            "message": message,
            "actions": [widget_action],
            "leads": unique_leads
        }

