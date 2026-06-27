import os
from typing import Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from shared.deva_tracer import trace_function

@trace_function("LLM Gateway: Model Selection")
def get_llm(mode: str, keys: dict):
    """
    Centralized model routing gateway.
    Modes:
      - 'fast': Lowest latency, small models (e.g., Llama-3.1-8b, Gemini Flash)
      - 'balanced': Default, balanced latency (e.g., Llama-3.3-70b, Gemini Flash)
      - 'smart': Better reasoning
      - 'expert': Maximum reasoning, premium models (e.g., Gemini Pro)
    """
    mode = (mode or "balanced").lower()
    
    # Provider availability
    has_gemini = bool(keys.get("gemini"))
    has_groq = bool(keys.get("groq"))
    
    if not has_gemini and not has_groq:
        raise ValueError("No LLM API keys provided.")

    if mode == "fast":
        if has_groq:
            return ChatGroq(model="llama-3.1-8b-instant", api_key=keys["groq"])
        return ChatGoogleGenerativeAI(model="gemini-2.5-flash", api_key=keys["gemini"])
        
    elif mode == "balanced":
        # Prefer Groq for speed/balanced if available
        if has_groq:
            return ChatGroq(model="llama-3.3-70b-versatile", api_key=keys["groq"])
        return ChatGoogleGenerativeAI(model="gemini-2.5-flash", api_key=keys["gemini"])
        
    elif mode == "smart":
        if has_gemini:
            # Assume gemini-pro is available for smart/expert
            return ChatGoogleGenerativeAI(model="gemini-1.5-pro", api_key=keys["gemini"])
        return ChatGroq(model="llama-3.3-70b-versatile", api_key=keys["groq"])
        
    elif mode == "expert":
        if has_gemini:
            return ChatGoogleGenerativeAI(model="gemini-1.5-pro", api_key=keys["gemini"])
        # Fallback to groq's best available
        return ChatGroq(model="llama-3.3-70b-versatile", api_key=keys["groq"])
        
    else:
        # Default fallback
        if has_groq:
            return ChatGroq(model="llama-3.3-70b-versatile", api_key=keys["groq"])
        return ChatGoogleGenerativeAI(model="gemini-2.5-flash", api_key=keys["gemini"])
