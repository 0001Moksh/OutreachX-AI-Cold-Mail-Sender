import os
import json
from typing import List, Dict, Any, Optional
from litellm import completion
import hashlib

_LLM_CACHE = {}

class LLMService:
    @staticmethod
    def get_model_name() -> str:
        """Get model string formatted for LiteLLM"""
        provider = os.getenv("LLM_PROVIDER", "groq").lower()
        model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        
        # Format prefix for LiteLLM
        if provider == "groq":
            return f"groq/{model}"
        elif provider == "openai":
            return f"openai/{model}"
        elif provider == "gemini":
            return f"gemini/{model}"
        elif provider == "openrouter":
            return f"openrouter/{model}"
        elif provider == "anthropic":
            return f"anthropic/{model}"
        return f"groq/{model}"

    @classmethod
    async def call_llm(
        cls,
        system_prompt: str,
        user_message: str,
        chat_history: Optional[List[Dict[str, str]]] = None,
        json_output: bool = True
    ) -> str:
        """Call LiteLLM with system and user messages, returning response text with fallbacks"""
        model = cls.get_model_name()
        
        # Build a cache key
        cache_raw = f"{model}::{system_prompt}::{user_message}::{str(chat_history)}::{json_output}"
        cache_key = hashlib.md5(cache_raw.encode('utf-8')).hexdigest()
        
        if cache_key in _LLM_CACHE:
            print(f"Returning cached LLM response for key {cache_key}")
            return _LLM_CACHE[cache_key]
        
        messages = [{"role": "system", "content": system_prompt}]
        
        if chat_history:
            for msg in chat_history:
                role = msg.get("role", "user")
                if role == "ai":
                    role = "assistant"
                messages.append({"role": role, "content": msg.get("content", "")})
                
        messages.append({"role": "user", "content": user_message})
        
        # Load API keys dynamically
        api_key = None
        if "groq/" in model:
            api_key = os.getenv("GROQ_API_KEY")
        elif "openai/" in model:
            api_key = os.getenv("OPENAI_API_KEY")
        elif "gemini/" in model:
            api_key = os.getenv("GEMINI_API_KEY")
            
        kwargs = {}
        if json_output:
            if "openai" in model or "groq" in model:
                kwargs["response_format"] = {"type": "json_object"}

        # Cascading Model Fallback Execution
        try:
            # Primary model call
            response = completion(
                model=model,
                messages=messages,
                api_key=api_key,
                temperature=float(os.getenv("GROQ_TEMPERATURE", "0.7")),
                **kwargs
            )
            result = response.choices[0].message.content
            _LLM_CACHE[cache_key] = result
            return result
        except Exception as primary_err:
            print(f"Primary model {model} failed: {primary_err}. Initiating fallback sequence.")
            
            # Fallback 1: Gemini
            gemini_key = os.getenv("GEMINI_API_KEY")
            if gemini_key:
                try:
                    print("Attempting Gemini fallback...")
                    gemini_kwargs = {}
                    if json_output:
                        gemini_kwargs["response_format"] = {"type": "json_object"}
                    response = completion(
                        model="gemini/gemini-1.5-pro",
                        messages=messages,
                        api_key=gemini_key,
                        temperature=0.5,
                        **gemini_kwargs
                    )
                    result = response.choices[0].message.content
                    _LLM_CACHE[cache_key] = result
                    return result
                except Exception as gemini_err:
                    print(f"Gemini fallback failed: {gemini_err}")
            
            # Fallback 2: OpenRouter Llama
            openrouter_key = os.getenv("OPENROUTER_API_KEY")
            if openrouter_key:
                try:
                    print("Attempting OpenRouter fallback...")
                    or_kwargs = {}
                    if json_output:
                        or_kwargs["response_format"] = {"type": "json_object"}
                    response = completion(
                        model="openrouter/meta-llama/llama-3-8b-instruct",
                        messages=messages,
                        api_key=openrouter_key,
                        temperature=0.4,
                        **or_kwargs
                    )
                    result = response.choices[0].message.content
                    _LLM_CACHE[cache_key] = result
                    return result
                except Exception as or_err:
                    print(f"OpenRouter fallback failed: {or_err}")
            
            # Ultimate failover response
            failover_msg = "⚠️ **API Usage Limit Reached**\n\nPlease try again after some time. My intelligence engine is currently facing API limitations (such as daily token limits) from our provider. I will be fully operational again shortly!"
            if json_output:
                return json.dumps({
                    "message": failover_msg,
                    "intent": "general",
                    "route": "general",
                    "actions": [],
                    "extracted": False,
                    "candidate": None,
                    "error": True
                })
            return failover_msg

    @classmethod
    async def call_llm_json(
        cls,
        system_prompt: str,
        user_message: str,
        chat_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """Call LiteLLM and guarantee a parsed JSON dictionary response"""
        content = await cls.call_llm(system_prompt, user_message, chat_history, json_output=True)
        try:
            cleaned = content.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            return json.loads(cleaned.strip())
        except Exception as e:
            print(f"Failed to parse JSON content: {content}. Error: {e}")
            try:
                start = content.find("{")
                end = content.rfind("}")
                if start != -1 and end != -1:
                    return json.loads(content[start:end+1])
            except Exception:
                pass
            return {"error": "JSON parsing failure", "content": content}
