from typing import Any, Dict
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage
from langchain_groq import ChatGroq
import json

from .config import get_settings
from .agent_state import AgentState

settings = get_settings()

INTENT_ROUTER_PROMPT = """You are the Intent Router for Deva AI, an orchestration agent for OutreachX.
Your job is to analyze the user's latest message and output a single JSON object classifying their intent.

Allowed intents:
- asset_query (Asking a question about documents, resumes, links, projects)
- template_create (Asking to create, generate, or draft a new email template)
- template_edit (Asking to modify, edit, or change an existing template)
- campaign_create (Asking to start, run, or create a campaign)
- campaign_update (Asking to modify a campaign's status, template, or leads)
- campaign_list (Asking to see campaigns or their statuses)
- lead_query (Asking about lead files, searching for specific contacts)
- lead_summary (Asking to summarize or analyze a lead list)
- template_list (Asking to see available templates)
- settings_query (Asking about SMTP, app password, or preferences)
- delete_operation (Asking to delete a campaign, template, lead, or asset)
- ui_generation (Asking for a specific UI widget to be generated without changing data)
- general_chat (Any other conversation, greetings, generic questions)

Analyze the user's request. Output ONLY a valid JSON object with the following structure:
{
    "intent": "one_of_the_allowed_intents",
    "confidence": 0.0_to_1.0,
    "reasoning": "brief explanation"
}
"""

class IntentRouter:
    def __init__(self):
        self.llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0.0, # Zero temperature for deterministic routing
            groq_api_key=settings.groq_api_key,
        )
        
    async def route(self, state: AgentState) -> str:
        """Determines the user intent based on the conversation history."""
        # Get the latest human message
        messages = state.get("messages", [])
        if not messages:
            return "general_chat"
            
        last_message = messages[-1]
        if not isinstance(last_message, HumanMessage) and getattr(last_message, "type", "") != "human":
            # If the last message wasn't from human, we just return general_chat or keep the previous intent
            return state.get("intent") or "general_chat"
            
        user_text = last_message.content
        
        system_msg = SystemMessage(content=INTENT_ROUTER_PROMPT)
        human_msg = HumanMessage(content=f"User Query: {user_text}")
        
        try:
            response = await self.llm.ainvoke([system_msg, human_msg])
            response_text = str(response.content).strip()
            
            # Extract JSON block if surrounded by markdown
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
                
            parsed = json.loads(response_text)
            intent = parsed.get("intent", "general_chat")
            
            # Validate intent against allowed list
            allowed_intents = [
                "asset_query", "template_create", "template_edit", "campaign_create", 
                "campaign_update", "campaign_list", "lead_query", "lead_summary", 
                "template_list", "settings_query", "delete_operation", "ui_generation", "general_chat"
            ]
            if intent not in allowed_intents:
                intent = "general_chat"
                
            return intent
        except Exception as e:
            print(f"Error in Intent Router: {e}")
            return "general_chat"

intent_router = IntentRouter()
