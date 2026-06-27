import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.deva_tracer import Tracer, current_tracer, trace_function

import json
import asyncio
import re
import httpx
from bs4 import BeautifulSoup

from shared.llm_gateway import get_llm

from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from tavily import TavilyClient, AsyncTavilyClient

app = FastAPI(title="Deva Backend 3 - Lead Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok", "backend": "deva_backend_3"}

# --- Define Tools ---

@tool
@trace_function("Tool: get_user_context")
def get_user_context(email: str):
    """Fetch user profile information by email."""
    # In production, connect to real DB here.
    return {"success": True, "message": "User context fetched."}

@tool
@trace_function("Tool: web_search")
def web_search(query: str, max_result: int):
    """Search the web for information"""
    # This expects the api key in environment, but we must override it dynamically
    # For now, we will handle it by setting os.environ locally, or passing it directly.
    # To keep tool signature simple, we assume the environment is temporarily patched or we rely on the agent's LLM to use it well.
    tavily_key = os.getenv("CURRENT_TAVILY_KEY", "")
    try:
        client = TavilyClient(api_key=tavily_key)
        return client.search(query=query, max_results=max_result)
    except Exception as e:
        return {"error": str(e)}

@tool
@trace_function("Tool: extract_company_info")
def extract_company_info(website_content: str):
    """Extracts company information from website content."""
    return "Company info processing completed."

@tool
@trace_function("Tool: extract_emails")
async def extract_emails(url: str):
    """Extracts emails from a URL."""
    try:
        async with httpx.AsyncClient(timeout=10.0, headers={"User-Agent": "Mozilla/5.0"}) as client:
            response = await client.get(url)
        soup = BeautifulSoup(response.text, 'html.parser')
        text = soup.get_text()
        emails = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text)
        return list(set(emails))
    except Exception as e:
        return f"Error: {str(e)}"

@tool
@trace_function("Tool: scrape_website")
async def scrape_website(url: str):
    """Extract content from a website for company research."""
    try:
        async with httpx.AsyncClient(timeout=10.0, headers={"User-Agent": "Mozilla/5.0"}) as client:
            response = await client.get(url)
        soup = BeautifulSoup(response.text, "html.parser")
        return {
            "title": soup.title.string if soup.title else "",
            "content": soup.get_text(" ", strip=True)[:5000]
        }
    except Exception as e:
        return {"error": str(e)}

tools = [
    web_search,
    get_user_context,
    extract_company_info,
    extract_emails,
    scrape_website
]



@app.post("/execute_agent")
async def execute_agent(request: Request):
    """
    Accepts forwarded requests from Backend 1.
    """
    body = await request.json()
    prompt = body.get("prompt")
    context = body.get("context", "")
    keys = body.get("keys", {})
    mode = body.get("mode", "balanced")
    
    # Patch environment for synchronous Tavily tool to work if used
    if keys.get("tavily"):
        os.environ["CURRENT_TAVILY_KEY"] = keys["tavily"]

    event_queue = asyncio.Queue()

    async def run_graph():
        try:
            model = get_llm(mode, keys)
            system_prompt = """You are an expert Lead Generation Agent with advanced AI searching abilities.
Your job is to provide direct, accurate answers with company names and contact information based on the user's request. 
Company name and email are a MUST. Other information can be empty.
If you cannot find specific recruitment emails via tools, use your own knowledge to provide them (e.g. careers@company.com). 
Format your response clearly as a bulleted list. Do not say you need to refine your approach. Just provide the data."""
            
            agent = create_react_agent(model=model, tools=tools, prompt=system_prompt)
            
            # For streaming, we use astream_events or astream
            # We'll use astream to capture node steps
            async for event in agent.astream({"messages": [HumanMessage(content=prompt)]}, stream_mode="updates"):
                # event is a dict of {node_name: node_output}
                for node, output in event.items():
                    if node == "tools":
                        await event_queue.put({
                            "type": "status",
                            "step": "tools",
                            "message": f"Executing tool: {output.get('messages', [None])[-1].name if output.get('messages') else 'unknown'}"
                        })
                    elif node == "agent":
                        # Partial outputs from agent can be captured here if desired.
                        # For simple updates, we just say agent is thinking
                        await event_queue.put({
                            "type": "status",
                            "step": "agent",
                            "message": "Analyzing gathered information..."
                        })
            
            # After full execution, invoke again to get final answer, or just extract from the last event
            final_state = await agent.ainvoke({"messages": [HumanMessage(content=prompt)]})
            final_message = final_state["messages"][-1].content
            
            # Send the final full output as partial chunks for effect or just success
            await event_queue.put({
                "type": "partial_output",
                "content": final_message
            })
            
            await event_queue.put({"type": "success", "message": "Lead generation completed.", "cost_estimate": 0.0})
        except Exception as e:
            await event_queue.put({
                "type": "agent_unavailable",
                "reason": f"Lead Agent failed: {str(e)}",
                "recoverable": True,
                "suggested_agent": "General Agent"
            })
        finally:
            await event_queue.put(None) # Sentinel

    async def stream_generator():
        tracer = Tracer()
        token = current_tracer.set(tracer)
        try:
            req_span = tracer.start_span("Lead Agent Workflow")
            task = asyncio.create_task(run_graph())
            while True:
                event = await event_queue.get()
                if event is None:
                    break
                yield f"data: {json.dumps(event)}\n\n"
            await task
        finally:
            tracer.end_span("Lead Agent Workflow")
            tracer.generate_report()
            current_tracer.reset(token)

    return StreamingResponse(stream_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8003)))
