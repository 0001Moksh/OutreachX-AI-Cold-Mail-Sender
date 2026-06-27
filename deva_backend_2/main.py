import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.deva_tracer import Tracer, current_tracer, trace_function

import json
import asyncio
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import TypedDict, List, Dict, Any, Literal
from pydantic import BaseModel, Field

from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langgraph.graph import StateGraph, START, END, MessagesState
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langgraph.graph import StateGraph, START, END, MessagesState
from tavily import AsyncTavilyClient

from shared.llm_gateway import get_llm

app = FastAPI(title="Deva Backend 2 - Research Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ResearchAgentState(MessagesState):
    user_id: str
    context_summary: str
    mode: str
    keys: dict
    search_queries: List[str]
    search_results: str
    cache_result: str
    execution_logs: List[str]
    # Event Queue for streaming
    event_queue: asyncio.Queue

def log_trace(state: ResearchAgentState, message: str, step: str = "research"):
    if "execution_logs" not in state or state["execution_logs"] is None:
        state["execution_logs"] = []
    state["execution_logs"].append(message)
    
    # Put into queue for SSE
    if "event_queue" in state:
        state["event_queue"].put_nowait({
            "type": "status",
            "step": step,
            "message": message
        })
    return state

@app.get("/health")
async def health_check():
    return {"status": "ok", "backend": "deva_backend_2"}

# --- LangGraph Nodes ---

@trace_function("Context Retrieval")
def context_retrieval(state: ResearchAgentState):
    log_trace(state, "Extracting context...", "research_context")
    # Context is already injected by the orchestrator in real life, but we map it if needed.
    return {"execution_logs": state["execution_logs"]}

def route_research(state: ResearchAgentState):
    mode = state.get("mode", "balanced")
    if mode in ["fast", "balanced"]:
        return "simple_search"
    return "planner"

class SimpleQueryOutput(BaseModel):
    query: str

@trace_function("Simple Search")
async def simple_search(state: ResearchAgentState):
    log_trace(state, "Executing Tavily basic search...", "simple_search")
    user_query = state["messages"][-1].content
    llm = get_llm("fast", state.get("keys", {}))
    
    try:
        structured_llm = llm.with_structured_output(SimpleQueryOutput)
        optimized_query = structured_llm.invoke([HumanMessage(content=f"Optimize for search engine: {user_query}")]).query
    except:
        optimized_query = user_query
        
    log_trace(state, f"Query: '{optimized_query}'", "simple_search")
    
    try:
        client = AsyncTavilyClient(api_key=state["keys"].get("tavily", ""))
        tavily_response = await client.search(query=optimized_query, search_depth="basic", max_results=3)
        results = "\\n".join([r.get('content', '') for r in tavily_response.get('results', [])])
    except Exception as e:
        results = f"Search failed: {e}"
        
    return {"search_queries": [optimized_query], "search_results": results}

class PlannerOutput(BaseModel):
    queries: List[str]

@trace_function("Deep Research Planner")
def deep_research_planner(state: ResearchAgentState):
    log_trace(state, "Decomposing complex query...", "deep_planner")
    user_query = state["messages"][-1].content
    llm = get_llm("fast", state.get("keys", {}))
    
    try:
        structured_llm = llm.with_structured_output(PlannerOutput)
        queries = structured_llm.invoke([HumanMessage(content=f"Break into 2 or 3 distinct searches: {user_query}")]).queries[:3]
    except:
        queries = [user_query]
        
    for q in queries:
        log_trace(state, f"Sub-query planned: '{q}'", "deep_planner")
        
    return {"search_queries": queries}

@trace_function("Parallel Search Execution")
async def execute_parallel_search(state: ResearchAgentState):
    log_trace(state, "Executing concurrent searches...", "parallel_search")
    queries = state["search_queries"]
    client = AsyncTavilyClient(api_key=state["keys"].get("tavily", ""))
    
    aggregated_results = ""
    tasks = [client.search(query=q, search_depth="advanced", max_results=2) for q in queries]
    
    try:
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        for q, resp in zip(queries, responses):
            if isinstance(resp, Exception):
                aggregated_results += f"\\nFailed query '{q}': {resp}"
            else:
                res = "\\n".join([r.get('content', '') for r in resp.get('results', [])])
                aggregated_results += f"\\n--- Results for '{q}' ---\\n{res}\\n"
    except Exception as e:
        aggregated_results = f"Error during parallel search: {e}"
        
    log_trace(state, "Search aggregation complete.", "parallel_search")
    return {"search_results": aggregated_results}

@trace_function("Response Generation")
async def response_generation(state: ResearchAgentState):
    log_trace(state, "Generating final adaptive response...", "response_generation")
    user_query = state["messages"][-1].content
    mode = state.get("mode", "balanced")
    context = state.get("context_summary", "")
    search_data = state["search_results"]
    llm = get_llm(mode, state.get("keys", {}))
    
    if mode in ["fast", "balanced"]:
        system_prompt = f"You are a Research Assistant. Provide a CONCISE answer based ONLY on the search results.\\n\\nSearch Results:\\n{search_data}"
    else:
        system_prompt = f"You are an Advanced Research Assistant. Provide a DETAILED, well-structured analysis based on deep research. Use headings and bullets.\\n\\nContext:\\n{context}\\n\\nSearch Results:\\n{search_data}"
        
    try:
        # Stream the output chunks back to the client
        final_message = ""
        async for chunk in llm.astream([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_query)
        ]):
            final_message += chunk.content
            if "event_queue" in state:
                state["event_queue"].put_nowait({
                    "type": "partial_output",
                    "content": chunk.content
                })
        
        return {"messages": [AIMessage(content=final_message)]}
    except Exception as e:
        err = f"Error generating response: {e}"
        if "event_queue" in state:
            state["event_queue"].put_nowait({"type": "error", "message": err})
        return {"messages": [AIMessage(content=err)]}

# --- Graph Compilation ---
def build_research_graph():
    workflow = StateGraph(ResearchAgentState)
    workflow.add_node("context", context_retrieval)
    workflow.add_node("simple_search", simple_search)
    workflow.add_node("planner", deep_research_planner)
    workflow.add_node("parallel_search", execute_parallel_search)
    workflow.add_node("response_generation", response_generation)

    workflow.add_edge(START, "context")
    workflow.add_conditional_edges("context", route_research)
    workflow.add_edge("simple_search", "response_generation")
    workflow.add_edge("planner", "parallel_search")
    workflow.add_edge("parallel_search", "response_generation")
    workflow.add_edge("response_generation", END)

    return workflow.compile()

research_app = build_research_graph()

@app.post("/execute_agent")
async def execute_agent(request: Request):
    """
    Accepts forwarded requests from Backend 1.
    """
    body = await request.json()
    prompt = body.get("prompt")
    context = body.get("context", "")
    keys = body.get("keys", {})
    user_id = body.get("user_id", "anonymous")
    mode = body.get("mode", "balanced")
    
    event_queue = asyncio.Queue()
    
    async def run_graph():
        input_dict = {
            "messages": [HumanMessage(content=prompt)],
            "user_id": user_id,
            "context_summary": context,
            "mode": mode,
            "keys": keys,
            "event_queue": event_queue,
            "execution_logs": []
        }
        try:
            # Run graph async
            await research_app.ainvoke(input_dict)
            await event_queue.put({"type": "success", "message": "Research completed.", "cost_estimate": 0.0})
        except Exception as e:
            await event_queue.put({
                "type": "agent_unavailable",
                "reason": f"Research Agent failed: {str(e)}",
                "recoverable": True,
                "suggested_agent": "General Agent"
            })
        finally:
            await event_queue.put(None) # Sentinel

    async def stream_generator():
        tracer = Tracer()
        token = current_tracer.set(tracer)
        try:
            req_span = tracer.start_span("Research Agent Workflow")
            # Start graph execution in background
            task = asyncio.create_task(run_graph())
            while True:
                event = await event_queue.get()
                if event is None:
                    break
                yield f"data: {json.dumps(event)}\n\n"
            await task
        finally:
            tracer.end_span("Research Agent Workflow")
            tracer.generate_report()
            current_tracer.reset(token)

    return StreamingResponse(stream_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8002)))
