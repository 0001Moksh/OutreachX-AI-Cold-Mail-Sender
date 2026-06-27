import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.deva_tracer import Tracer, current_tracer, trace_function

import json
import asyncio
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

from shared.llm_gateway import get_llm
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent

app = FastAPI(title="Deva Backend 4 - Campaign & Template Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok", "backend": "deva_backend_4"}

# --- Campaign Tools ---
@tool
async def fetch_user_context(user_id: str) -> str:
    """Fetches user profile, memory, and existing assets."""
    return "User context: Software Engineer targeting AI startups."

@tool
async def search_existing_leads(user_id: str) -> str:
    """Queries DB for existing leads."""
    return "Found 1 lead list: 'AI Startups in Gurugram'"

@tool
async def search_existing_templates(user_id: str) -> str:
    """Queries DB for existing templates."""
    return "Found 1 template: 'AI Internship Outreach'"

@tool
async def propose_variable_mapping(lead_columns: list, template_variables: list) -> str:
    """Maps lead columns to template variables."""
    return json.dumps({var: f"Mapped to {var}" for var in template_variables})

@tool
async def send_test_email(user_id: str, template_id: str) -> str:
    """Simulates sending a test email."""
    return "Test email generated and queued."

# --- Template Tools ---
@tool
async def extract_brand_voice(context: str) -> str:
    """Extracts tone and brand voice from past templates or resume."""
    return "Professional, concise, and enthusiastic."

@tool
async def generate_template_variations(intent: str, variables: List[str]) -> str:
    """Generates 3 variations of an email template."""
    return "1. Formal Variation\n2. Casual Variation\n3. Short Variation"

tools = [
    fetch_user_context,
    search_existing_leads,
    search_existing_templates,
    propose_variable_mapping,
    send_test_email,
    extract_brand_voice,
    generate_template_variations
]



@app.post("/execute_agent")
async def execute_agent(request: Request):
    """
    Accepts forwarded requests from Backend 1.
    Handles both Campaign orchestration and Template creation.
    """
    body = await request.json()
    prompt = body.get("prompt")
    keys = body.get("keys", {})
    context = body.get("context", "")
    mode = body.get("mode", "balanced")

    event_queue = asyncio.Queue()

    async def run_graph():
        try:
            model = get_llm(mode, keys)
            system_prompt = f"""You are the Campaign and Template Orchestrator. 
            You handle creating email templates and launching campaigns.
            
            If the user wants to launch a campaign, execute step by step:
            1. Verify leads exist.
            2. Verify templates exist.
            3. Map variables.
            4. Send a test email.
            
            If the user wants to create a template:
            1. Extract brand voice.
            2. Generate template variations.
            
            Do not ask the user for confirmation in this automated stream unless required. Provide the final plan or drafts.
            
            Conversation Context: {context}
            """
            
            agent = create_react_agent(model=model, tools=tools, prompt=system_prompt)
            
            async for event in agent.astream({"messages": [HumanMessage(content=prompt)]}, stream_mode="updates"):
                for node, output in event.items():
                    if node == "tools":
                        await event_queue.put({
                            "type": "status",
                            "step": "tools",
                            "message": f"Executing tool: {output.get('messages', [None])[-1].name if output.get('messages') else 'unknown'}"
                        })
                    elif node == "agent":
                        await event_queue.put({
                            "type": "status",
                            "step": "agent",
                            "message": "Generating campaign/template artifacts..."
                        })
            
            final_state = await agent.ainvoke({"messages": [HumanMessage(content=prompt)]})
            final_message = final_state["messages"][-1].content
            
            await event_queue.put({
                "type": "partial_output",
                "content": final_message
            })
            
            await event_queue.put({"type": "success", "message": "Campaign/Template processing completed.", "cost_estimate": 0.0})
        except Exception as e:
            await event_queue.put({
                "type": "agent_unavailable",
                "reason": f"Campaign Agent failed: {str(e)}",
                "recoverable": True,
                "suggested_agent": "General Agent"
            })
        finally:
            await event_queue.put(None)

    async def stream_generator():
        tracer = Tracer()
        token = current_tracer.set(tracer)
        try:
            req_span = tracer.start_span("Campaign Agent Workflow")
            task = asyncio.create_task(run_graph())
            while True:
                event = await event_queue.get()
                if event is None:
                    break
                yield f"data: {json.dumps(event)}\n\n"
            await task
        finally:
            tracer.end_span("Campaign Agent Workflow")
            tracer.generate_report()
            current_tracer.reset(token)

    return StreamingResponse(stream_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8004)))
