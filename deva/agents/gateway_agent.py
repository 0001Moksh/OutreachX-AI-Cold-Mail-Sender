import json
from typing import Dict, Any, List
from deva.services.llm_service import LLMService
from deva.prompts.system_prompts import GATEWAY_SYSTEM_PROMPT

class GatewayAgent:
    @staticmethod
    async def route_message(
        message: str,
        chat_history: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """Analyze message to find intent, parameters, and route destination"""
        # Call LiteLLM to get routing details
        result = await LLMService.call_llm_json(
            system_prompt=GATEWAY_SYSTEM_PROMPT,
            user_message=message,
            chat_history=chat_history
        )
        
        # Ensure default keys
        if "intent" not in result:
            result["intent"] = "general"
        if "parameters" not in result:
            result["parameters"] = {}
        if "route" not in result:
            result["route"] = "general"
            
        return result
