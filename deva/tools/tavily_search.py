import os
import httpx
from typing import List, Dict, Any

class TavilySearchTool:
    def __init__(self):
        self.api_key = os.getenv("TAVILY_API_KEY", "")
        self.base_url = "https://api.tavily.com/search"

    async def search(self, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        """Perform search query via Tavily, fallback to mock if key is empty or placeholder"""
        if not self.api_key or "placeholder" in self.api_key.lower():
            print("Tavily API key is not configured. Falling back to mock search.")
            return self._mock_search(query, max_results)
            
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                payload = {
                    "api_key": self.api_key,
                    "query": query,
                    "search_depth": "advanced",
                    "max_results": max_results,
                    "include_answer": True,
                    "include_raw_content": True
                }
                response = await client.post(self.base_url, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    
                    BLACKLIST = [
                        "linkedin.com",
                        "instagram.com",
                        "facebook.com",
                        "indeed.com",
                        "glassdoor.com",
                        "twitter.com",
                        "x.com"
                    ]
                    
                    filtered_results = []
                    for result in data.get("results", []):
                        url = result.get("url", "").lower()
                        if any(domain in url for domain in BLACKLIST):
                            continue
                        
                        filtered_results.append({
                            "title": result.get("title", ""),
                            "url": result.get("url", ""),
                            "content": result.get("content", ""),
                            "raw_content": result.get("raw_content", "")
                        })
                    return filtered_results
                else:
                    print(f"Tavily search failed with status {response.status_code}. Using mock fallback.")
                    return self._mock_search(query, max_results)
        except Exception as e:
            print(f"Error calling Tavily: {e}. Using mock fallback.")
            return self._mock_search(query, max_results)

    def _mock_search(self, query: str, max_results: int) -> List[Dict[str, Any]]:
        """Mock search results for testing without a valid API key"""
        query_lower = query.lower()
        
        # Decide what role/type of leads to mock
        role = "AI Engineer"
        location = "Germany"
        if "germany" in query_lower:
            location = "Germany"
        elif "london" in query_lower or "uk" in query_lower:
            location = "United Kingdom"
        elif "usa" in query_lower or "america" in query_lower or "san francisco" in query_lower:
            location = "United States"
            
        if "saas" in query_lower:
            firm_type = "SaaS Startup"
        elif "ai" in query_lower or "artificial" in query_lower:
            firm_type = "AI Venture"
        else:
            firm_type = "Tech Agency"
            
        mock_leads = [
            {
                "title": f"Contact details for CEO of Nexyug Tech",
                "url": "https://nexyug.com",
                "content": f"Nexyug Tech is a premier {firm_type} located in {location}. CEO: Ajay Sharma (ajay@nexyug.com). Website: https://nexyug.com.",
                "raw_lead": {
                    "company_name": "Nexyug Tech",
                    "contact_name": "Ajay Sharma",
                    "email": "ajay@nexyug.com",
                    "website": "https://nexyug.com",
                    "location": location,
                    "role": f"CEO & Founder"
                }
            },
            {
                "title": f"Careers at SkyNet AI",
                "url": "https://skynet.ai",
                "content": f"SkyNet AI is a high-growth deep tech start-up in {location} specializing in AI agents. Head of Talent: Sarah Connor (sarah.connor@skynet.ai).",
                "raw_lead": {
                    "company_name": "SkyNet AI",
                    "contact_name": "Sarah Connor",
                    "email": "sarah.connor@skynet.ai",
                    "website": "https://skynet.ai",
                    "location": location,
                    "role": "Head of Talent"
                }
            },
            {
                "title": f"Apex Solutions tech contact",
                "url": "https://apexsolutions.io",
                "content": f"Apex Solutions provides automation and CRM solutions. Lead Developer: David Wright (david@apexsolutions.io). Location: {location}.",
                "raw_lead": {
                    "company_name": "Apex Solutions",
                    "contact_name": "David Wright",
                    "email": "david@apexsolutions.io",
                    "website": "https://apexsolutions.io",
                    "location": location,
                    "role": "Lead Architect"
                }
            },
            {
                "title": f"Future Systems HR contact",
                "url": "https://futuresystems.net",
                "content": f"Future Systems builds cloud infrastructure in {location}. HR Manager: Linda Hamilton (linda@futuresystems.net).",
                "raw_lead": {
                    "company_name": "Future Systems",
                    "contact_name": "Linda Hamilton",
                    "email": "linda@futuresystems.net",
                    "website": "https://futuresystems.net",
                    "location": location,
                    "role": "HR Manager"
                }
            },
            {
                "title": f"Alpha Web Services team",
                "url": "https://alphawebservices.com",
                "content": f"Alpha Web Services is an outsourcing company. CTO: Marcus Aurelius (marcus@alphawebservices.com).",
                "raw_lead": {
                    "company_name": "Alpha Web Services",
                    "contact_name": "Marcus Aurelius",
                    "email": "marcus@alphawebservices.com",
                    "website": "https://alphawebservices.com",
                    "location": location,
                    "role": "CTO"
                }
            }
        ]
        
        return mock_leads[:max_results]
