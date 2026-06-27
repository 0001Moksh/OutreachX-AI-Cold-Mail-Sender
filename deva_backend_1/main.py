import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.deva_tracer import Tracer, current_tracer, trace_function

from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import HumanMessage
import json
import asyncio
import httpx
import os
import time

from utils import decrypt_api_key
from db import get_db_pool, build_request_context
from router_agent import get_router_app

app = FastAPI(title="Deva Backend 1 - Orchestrator and Smart Router")

# Load configuration from environment variables
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "[\"*\"]")
try:
    origins = json.loads(CORS_ORIGINS)
except json.JSONDecodeError:
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Backend Mapping (for proxying requests)
BACKEND_URLS = {
    "Research Agent": os.getenv("DEVA_BACKEND_2_URL", "http://localhost:8002"),
    "Lead Agent": os.getenv("DEVA_BACKEND_3_URL", "http://localhost:8003"),
    "Campaign Agent": os.getenv("DEVA_BACKEND_4_URL", "http://localhost:8004"),
    "Template Agent": os.getenv("DEVA_BACKEND_4_URL", "http://localhost:8004"),
    "General Agent": os.getenv("DEVA_BACKEND_5_URL", "http://localhost:8005"),
}

@app.on_event("startup")
async def startup():
    try:
        app.state.db_pool = await get_db_pool()
        print("[deva_backend_1] Database connected.")
    except Exception as e:
        print(f"[deva_backend_1] WARNING: DB connection failed: {e}")
        app.state.db_pool = None
    app.state.router_app = get_router_app()

@app.on_event("shutdown")
async def shutdown():
    await app.state.db_pool.close()

@app.get("/health")
async def health_check():
    return {"status": "ok", "backend": "deva_backend_1"}

@app.post("/stream_agent")
async def stream_agent(request: Request):
    """
    Main entry point for Deva AI workflow.
    - Fetches user keys
    - Fetches conversation context
    - Routes to specific backend
    - Proxies SSE stream back to client
    """
    body = await request.json()
    user_id = body.get("user_id")
    prompt = body.get("prompt")
    thread_id = body.get("thread_id", "default_thread")
    mode = body.get("mode", "balanced")

    async def event_generator():
        tracer = Tracer()
        token = current_tracer.set(tracer)
        try:
            req_span = tracer.start_span("Orchestrator Request Workflow")
            # 1. Start early streaming and load parallel context
            yield f"data: {json.dumps({'type': 'status', 'step': 'init', 'message': 'Understanding Request...'})}\n\n"
            
            context_data = await build_request_context(app.state.db_pool, user_id)
            encrypted_keys = context_data["keys"]
            
            if not encrypted_keys:
                yield f"data: {json.dumps({'type': 'error', 'message': 'No API keys found for user. Please configure them.'})}\n\n"
                return

            decrypted_keys = {
                provider: decrypt_api_key(key) 
                for provider, key in encrypted_keys.items()
            }
            
            # 2. Execute Smart Router
            yield f"data: {json.dumps({'type': 'status', 'step': 'routing', 'message': 'Selecting Best Agent...'})}\n\n"
            
            router_input = {
                "messages": [HumanMessage(content=prompt)],
                "user_id": user_id,
                "context_summary": context_data["context"],
                "previous_agent": context_data["previous_agent"],
                "mode": mode,
                "keys": decrypted_keys
            }
            
            # Run router synchronously since langgraph standard invoke is sync for standard graph
            loop = asyncio.get_event_loop()
            router_span = tracer.start_span("Router Execution")
            try:
                final_state = await loop.run_in_executor(
                    None, 
                    lambda: app.state.router_app.invoke(router_input, config={"configurable": {"thread_id": thread_id}})
                )
            finally:
                tracer.end_span("Router Execution")
            
            selected_agent = final_state.get("selected_agent", "General Agent")
            routing_reason = final_state.get("routing_reason", "")
            confidence = final_state.get("confidence", 0)
            
            if confidence < 80:
                yield f"data: {json.dumps({'type': 'agent_unavailable', 'reason': f'Low confidence in routing ({confidence}%).', 'recoverable': True, 'suggested_agent': 'General Agent'})}\n\n"
                return
            
            yield f"data: {json.dumps({'type': 'status', 'step': 'routing_decision', 'message': f'Routed to {selected_agent}: {routing_reason}'})}\n\n"

            # 4. Proxy to Target Backend
            if selected_agent == "Unknown Agent":
                yield f"data: {json.dumps({'type': 'success', 'message': 'I cannot perform this task as it is completely outside my capabilities as an Outreach AI assistant.', 'cost_estimate': 0.00})}\n\n"
                return
                
            target_url = BACKEND_URLS.get(selected_agent)
            if not target_url:
                yield f"data: {json.dumps({'type': 'error', 'message': f'Backend for {selected_agent} is not configured.'})}\n\n"
                return

            proxy_payload = {
                "user_id": user_id,
                "prompt": prompt,
                "context": context_data["context"],
                "keys": decrypted_keys,
                "thread_id": thread_id,
                "mode": mode
            }

            yield f"data: {json.dumps({'type': 'status', 'step': 'agent_execution', 'message': f'{selected_agent} started processing...'})}\n\n"

            # 5. Stream from target backend
            proxy_span = tracer.start_span(f"Proxy Stream to {selected_agent}")
            try:
                async with httpx.AsyncClient(timeout=300.0) as client:
                    async with client.stream("POST", f"{target_url}/execute_agent", json=proxy_payload) as response:
                        if response.status_code != 200:
                            yield f"data: {json.dumps({'type': 'error', 'message': f'Agent execution failed with status {response.status_code}'})}\n\n"
                            return
                        
                        async for chunk in response.aiter_text():
                            # We assume the sub-agent also sends valid SSE chunks
                            if chunk:
                                yield chunk
            except httpx.RequestError as exc:
                # Structured fallback error
                err_payload = {
                    "type": "agent_unavailable",
                    "reason": f"Connection to {selected_agent} failed ({str(exc)})",
                    "recoverable": True,
                    "suggested_agent": "General Agent"
                }
                yield f"data: {json.dumps(err_payload)}\n\n"
            finally:
                tracer.end_span(f"Proxy Stream to {selected_agent}")

        except Exception as e:
            err_payload = {
                "type": "agent_unavailable",
                "reason": f"Internal Server Error: {str(e)}",
                "recoverable": True,
                "suggested_agent": "General Agent"
            }
            yield f"data: {json.dumps(err_payload)}\n\n"
        finally:
            tracer.end_span("Orchestrator Request Workflow")
            tracer.generate_report()
            current_tracer.reset(token)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8001)))
