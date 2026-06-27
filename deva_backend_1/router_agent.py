import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.deva_tracer import current_tracer
from shared.llm_gateway import get_llm

from typing import TypedDict, List, Dict, Any, Literal
from pydantic import BaseModel, Field

from langchain_core.messages import HumanMessage
from langgraph.graph import StateGraph, START, END, MessagesState

class RouterAgentState(MessagesState):
    user_id: str
    context_summary: str
    previous_agent: Dict[str, Any]
    mode: str
    keys: dict
    
    selected_agent: str
    routing_reason: str
    confidence: int
    execution_logs: List[str]

def log_trace(state: RouterAgentState, message: str):
    if "execution_logs" not in state or state["execution_logs"] is None:
        state["execution_logs"] = []
    state["execution_logs"].append(message)
    return state

class RoutingDecision(BaseModel):
    selected_agent: Literal["General Agent", "Lead Agent", "Template Agent", "Campaign Agent", "Research Agent", "Unknown Agent"] = Field(
        description="Select the best agent for the task."
    )
    confidence: int = Field(description="Confidence score from 0 to 100.")
    routing_reason: str = Field(description="A brief explanation of why this agent was selected.")

def context_retrieval(state: RouterAgentState):
    log_trace(state, "[Node: context_retrieval] Extracting conversation flow...")
    # For now, context is injected into state from the DB before calling the graph
    return {"execution_logs": state["execution_logs"]}

def smart_router_node(state: RouterAgentState):
    user_query = state["messages"][-1].content
    log_trace(state, "[Node: smart_router] Analyzing intent...")
    context = state.get("context_summary", "No previous history.")
    previous = state.get("previous_agent", {})
    mode = state.get("mode", "fast")
    keys = state.get("keys", {})
    
    prompt = f"""
    You are the Fast Router. Analyze the user query and context to determine which agent should handle the request.
    
    RULES:
    1. If the user asks for leads AND templates, default to Campaign Agent.
    2. If the user asks to launch a campaign, select Campaign Agent.
    3. If the user asks to research the web, select Research Agent.
    4. If the user asks to find people or leads ONLY, select Lead Agent.
    5. If the user asks to write/draft an email ONLY, select Template Agent.
    6. If the user says hi, or asks general questions about their own assets/profile, select General Agent.
    7. If the request is completely unrelated, select 'Unknown Agent'.
    
    PREVIOUS AGENT OPTIMIZATION:
    If the user was already working with an agent on a specific workflow (e.g. Campaign) and their new query is a continuation, stick with that agent and give 100 confidence.
    Previous Agent State: {previous}
    
    Context: {context}
    Query: '{user_query}'
    """
    
    try:
        # Use LLM gateway in fast mode for routing if not explicitly asked for deeper logic, but let's stick to the mode if they want it.
        # Actually, routing should always be fast, but we'll use the gateway.
        llm = get_llm("fast", keys)
        structured_llm = llm.with_structured_output(RoutingDecision)
        
        tracer = current_tracer.get()
        if tracer:
            tracer.start_span("Router LLM Generation")
        try:
            decision = structured_llm.invoke([HumanMessage(content=prompt)])
        finally:
            if tracer:
                tracer.end_span("Router LLM Generation")
                
        agent = decision.selected_agent
        reason = decision.routing_reason
        confidence = decision.confidence
    except Exception as e:
        log_trace(state, f"[Error] Routing failed: {str(e)}")
        agent = "General Agent"
        reason = "Fallback applied due to processing error."
        confidence = 0
        
    log_trace(state, f"[Routing Decision] -> {agent} ({confidence}%)")
    return {"selected_agent": agent, "routing_reason": reason, "confidence": confidence, "execution_logs": state["execution_logs"]}

def guardrail_validator(state: RouterAgentState):
    valid_agents = ["General Agent", "Lead Agent", "Template Agent", "Campaign Agent", "Research Agent", "Unknown Agent"]
    selected = state.get("selected_agent", "")
    if selected not in valid_agents:
        log_trace(state, f"[Guardrail] Invalid agent '{selected}' detected. Defaulting to General Agent.")
        return {"selected_agent": "Unknown Agent", "routing_reason": "Guardrail fallback due to invalid agent name."}
    return state

def get_router_app():
    workflow = StateGraph(RouterAgentState)
    workflow.add_node("context", context_retrieval)
    workflow.add_node("router", smart_router_node)
    workflow.add_node("guardrails", guardrail_validator)

    workflow.add_edge(START, "context")
    workflow.add_edge("context", "router")
    workflow.add_edge("router", "guardrails")
    workflow.add_edge("guardrails", END)

    return workflow.compile()
