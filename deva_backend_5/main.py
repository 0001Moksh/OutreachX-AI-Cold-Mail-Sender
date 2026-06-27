import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.deva_tracer import Tracer, current_tracer, trace_function

import json
import asyncio
from typing import List, Dict, Any, Literal
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langgraph.graph import StateGraph, START, END, MessagesState

from shared.llm_gateway import get_llm

app = FastAPI(title="Deva Backend 5 - General Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok", "backend": "deva_backend_5"}

class GeneralAgentState(MessagesState):
    user_id: str
    basic_profile: Dict[str, Any]
    history: List[Dict[str, Any]]
    rag_query: str
    rag_results: List[Dict[str, Any]]
    routing_decision: str
    mode: str
    keys: dict

class RouterDecision(BaseModel):
    decision: Literal["direct_reply", "needs_rag", "external_transfer"] = Field(
        description="Choose 'direct_reply' if known, 'needs_rag' if needs user assets/projects, 'external_transfer' for external knowledge."
    )
    optimized_rag_query: str = Field(
        description="Query for RAG if needed.", default=""
    )



@trace_function("Context Loader")
def context_loader(state: GeneralAgentState):
    # Mocking DB call for now. Real implementation connects to PostgreSQL.
    return {
        "basic_profile": {"name": "User", "role": "Professional", "email": ""},
        "history": []
    }

@trace_function("Decision Router")
def decision_router(state: GeneralAgentState):
    messages = state["messages"]
    user_query = messages[-1].content
    profile = state.get("basic_profile", {})
    keys = state.get("keys", {})
    
    prompt = f"""
    You are the Routing Layer of the General Agent.
    User Query: '{user_query}'
    User Profile: Name: {profile.get('name')}, Role: {profile.get('role')}
    """
    
    try:
        model = get_llm("fast", keys)
        structured_router = model.with_structured_output(RouterDecision)
        response = structured_router.invoke([HumanMessage(content=prompt)])
        decision = response.decision
        query = response.optimized_rag_query
    except Exception as e:
        decision = "direct_reply"
        query = ""
        
    return {"routing_decision": decision, "rag_query": query}

def route_next_step(state: GeneralAgentState):
    if state["routing_decision"] == "needs_rag":
        return "rag_retriever"
    return "response_generator"

@trace_function("RAG Retriever")
def rag_retriever(state: GeneralAgentState):
    # Mocking Pinecone/Cohere RAG call
    return {"rag_results": [{"content": "Mocked RAG result for user assets."}]}

@trace_function("Response Generator")
def response_generator(state: GeneralAgentState):
    user_query = state["messages"][-1].content
    profile = state["basic_profile"]
    history = state.get("history", [])
    rag_results = state.get("rag_results", [])
    decision = state["routing_decision"]
    keys = state.get("keys", {})
    
    if decision == "external_transfer":
        return {"messages": [AIMessage(content="I can help with your campaigns, outreach, and user assets. For external web research, please query the Research Agent!")]}
        
    system_prompt = f"""
    You are the General Agent of OutreachX Deva.
    CRITICAL RULES:
    1. NEVER hallucinate user data. If the answer is not in the context or profile, say you don't know.
    2. NEVER use external search tools.
    3. Maintain a helpful, conversational tone.
    
    USER PROFILE: {profile}
    DB HISTORY: {history}
    RAG KNOWLEDGE: {rag_results}
    """
    
    try:
        mode = state.get("mode", "balanced")
        model = get_llm(mode, keys)
        response = model.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_query)
        ])
        return {"messages": [response]}
    except Exception as e:
        return {"messages": [AIMessage(content="Sorry, I encountered an error generating the response.")]}

workflow = StateGraph(GeneralAgentState)
workflow.add_node("loader", context_loader)
workflow.add_node("router", decision_router)
workflow.add_node("rag_retriever", rag_retriever)
workflow.add_node("response_generator", response_generator)

workflow.add_edge(START, "loader")
workflow.add_edge("loader", "router")
workflow.add_conditional_edges("router", route_next_step)
workflow.add_edge("rag_retriever", "response_generator")
workflow.add_edge("response_generator", END)

general_agent = workflow.compile()

@app.post("/execute_agent")
async def execute_agent(request: Request):
    body = await request.json()
    prompt = body.get("prompt")
    keys = body.get("keys", {})
    context = body.get("context", "")
    mode = body.get("mode", "balanced")
    
    event_queue = asyncio.Queue()

    async def run_graph():
        try:
            initial_state = {
                "user_id": "dummy_id",
                "messages": [HumanMessage(content=prompt)],
                "mode": mode,
                "keys": keys
            }
            
            async for event in general_agent.astream(initial_state, stream_mode="updates"):
                for node, output in event.items():
                    await event_queue.put({
                        "type": "status",
                        "step": node,
                        "message": f"Finished node {node}..."
                    })
            
            final_state = await general_agent.ainvoke(initial_state)
            final_message = final_state["messages"][-1].content
            
            await event_queue.put({
                "type": "partial_output",
                "content": final_message
            })
            
            await event_queue.put({"type": "success", "message": "General processing completed.", "cost_estimate": 0.0})
        except Exception as e:
            await event_queue.put({
                "type": "agent_unavailable",
                "reason": f"General Agent failed: {str(e)}",
                "recoverable": False,
                "suggested_agent": None
            })
        finally:
            await event_queue.put(None)

    async def stream_generator():
        tracer = Tracer()
        token = current_tracer.set(tracer)
        try:
            req_span = tracer.start_span("General Agent Workflow")
            task = asyncio.create_task(run_graph())
            while True:
                event = await event_queue.get()
                if event is None:
                    break
                yield f"data: {json.dumps(event)}\n\n"
            await task
        finally:
            tracer.end_span("General Agent Workflow")
            tracer.generate_report()
            current_tracer.reset(token)

    return StreamingResponse(stream_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8005)))
