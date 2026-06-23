import json
from typing import Dict, Any, List, Optional
from typing_extensions import TypedDict
from sqlalchemy.orm import Session

# Import agent modules
from deva.agents.gateway_agent import GatewayAgent
from deva.agents.planner_agent import PlannerAgent
from deva.agents.template_agent import TemplateAgent
from deva.agents.lead_agent import LeadAgent
from deva.agents.campaign_agent import CampaignAgent
from deva.agents.memory_agent import MemoryAgent
from deva.workflows.state_store import WorkflowStateStore

# LangGraph definitions
try:
    from langgraph.graph import StateGraph, END
except ImportError:
    # Resilient fallback if langgraph is missing during import
    StateGraph = None
    END = "__end__"

class DevaGraphState(TypedDict):
    messages: List[Dict[str, str]]
    user_id: str
    conversation_id: str
    current_goal: Optional[str]
    workflow_state: Dict[str, Any]
    actions: List[Dict[str, Any]]
    next_node: str
    response_message: str

class DevaOrchestrator:
    def __init__(self, db: Session):
        self.db = db
        self.graph = self._build_graph()

    def _build_graph(self):
        """Construct the LangGraph workflow"""
        if StateGraph is None:
            return None

        builder = StateGraph(DevaGraphState)

        # Add nodes
        builder.add_node("gateway", self.gateway_node)
        builder.add_node("planner", self.planner_node)
        builder.add_node("template", self.template_node)
        builder.add_node("lead", self.lead_node)
        builder.add_node("campaign", self.campaign_node)
        builder.add_node("memory", self.memory_node)
        builder.add_node("general", self.general_node)

        # Set entry point
        builder.set_entry_point("gateway")

        # Define conditional routing (via gateway)
        def router(state: DevaGraphState):
            return state["next_node"]

        builder.add_conditional_edges(
            "gateway",
            router,
            {
                "planner": "planner",
                "template": "template",
                "lead": "lead",
                "campaign": "campaign",
                "memory": "memory",
                "general": "general"
            }
        )

        # All functional nodes terminate after processing
        builder.add_edge("planner", END)
        builder.add_edge("template", END)
        builder.add_edge("lead", END)
        builder.add_edge("campaign", END)
        builder.add_edge("memory", END)
        builder.add_edge("general", END)
        
        return builder.compile()

    # --- Graph Nodes ---
    
    async def gateway_node(self, state: DevaGraphState) -> Dict[str, Any]:
        """Classify message intent and update next node routing"""
        last_message = state["messages"][-1]["content"] if state["messages"] else ""
        history = state["messages"][:-1]
        
        routing = await GatewayAgent.route_message(last_message, history)
        
        # Update goal and state
        next_node = routing.get("route", "general")
        intent = routing.get("intent", "general")
        goal = routing.get("goal", state.get("current_goal"))
        
        # Sync with stored persistent state
        saved_state = WorkflowStateStore.get_state(self.db, state["user_id"], state["conversation_id"]) or {}
        workflow_state = {**saved_state, **routing.get("parameters", {})}
        workflow_state["intent"] = intent
        
        return {
            "next_node": next_node,
            "current_goal": goal,
            "workflow_state": workflow_state
        }

    async def planner_node(self, state: DevaGraphState) -> Dict[str, Any]:
        """Determine resource gaps and build campaigns execution plans"""
        goal = state.get("current_goal", "Set up outreach campaign")
        analysis = await PlannerAgent.perform_gap_analysis(
            db=self.db,
            user_id=state["user_id"],
            goal=goal
        )
        
        # Save persistent workflow state
        state["workflow_state"]["missing_resources"] = analysis.get("missing_resources", [])
        WorkflowStateStore.save_state(self.db, state["user_id"], state["conversation_id"], state["workflow_state"])
        
        return {
            "response_message": analysis.get("message", "Planning workflow started."),
            "actions": analysis.get("actions", [])
        }

    async def template_node(self, state: DevaGraphState) -> Dict[str, Any]:
        """Trigger draft template generation widget"""
        goal = state.get("current_goal", "Outreach template")
        target_role = state["workflow_state"].get("role", "Prospect")
        
        template_res = await TemplateAgent.generate_template(
            db=self.db,
            user_id=state["user_id"],
            campaign_purpose=goal,
            target_role=target_role
        )
        
        # Add generated template to persistent workflow data
        state["workflow_state"]["generated_template"] = template_res.get("template_data")
        WorkflowStateStore.save_state(self.db, state["user_id"], state["conversation_id"], state["workflow_state"])
        
        return {
            "response_message": template_res["message"],
            "actions": template_res["actions"]
        }

    async def lead_node(self, state: DevaGraphState) -> Dict[str, Any]:
        """Perform lead search using Tavily tool"""
        last_message = state["messages"][-1]["content"] if state["messages"] else ""
        lead_res = await LeadAgent.find_leads(
            db=self.db,
            user_id=state["user_id"],
            search_request=last_message
        )
        
        return {
            "response_message": lead_res["message"],
            "actions": lead_res["actions"]
        }

    async def campaign_node(self, state: DevaGraphState) -> Dict[str, Any]:
        """Configure campaign parameters and variable mappings"""
        campaign_name = state["workflow_state"].get("campaign_name", "AI Outreach Campaign")
        campaign_res = await CampaignAgent.prepare_campaign_wizard(
            db=self.db,
            user_id=state["user_id"],
            campaign_name=campaign_name
        )
        
        return {
            "response_message": campaign_res["message"],
            "actions": campaign_res["actions"]
        }

    async def general_node(self, state: DevaGraphState) -> Dict[str, Any]:
        """Default conversational responder for general chats"""
        last_message = state["messages"][-1]["content"] if state["messages"] else ""
        history = state["messages"][:-1]
        
        # Simple conversation handler
        prompt = "You are Deva, the AI Operating System of OutreachX. Answer concisely and guide the user toward their goals."
        from deva.services.llm_service import LLMService
        response = await LLMService.call_llm(
            system_prompt=prompt,
            user_message=last_message,
            chat_history=history,
            json_output=False
        )
        
        return {
            "response_message": response,
            "actions": []
        }

    async def memory_node(self, state: DevaGraphState) -> Dict[str, Any]:
        """Directly write a memory and vectorize it without user approval widget"""
        last_message = state["messages"][-1]["content"] if state["messages"] else ""
        user_id = state["user_id"]
        
        # Extract fact: strip prefixes if present
        fact = last_message
        prefixes = ["remember this:", "remember that:", "save memory:", "remember:"]
        for prefix in prefixes:
            if fact.lower().startswith(prefix):
                fact = fact[len(prefix):].strip()
                break
                
        # Clean/summarize fact using LLM if it's still long
        if len(fact) > 100:
            from deva.services.llm_service import LLMService
            prompt = "Extract and summarize the core factual info to remember about the user from their query in 1 short sentence."
            try:
                fact = await LLMService.call_llm(
                    system_prompt=prompt,
                    user_message=fact,
                    json_output=False
                )
                fact = fact.strip().strip('"')
            except Exception:
                pass # Use original if LLM call fails
            
        import uuid
        from shared.models import AIMemory
        from deva.services.vector_service import VectorService
        
        # Persist memory to Postgres
        new_fact = AIMemory(
            id=uuid.uuid4(),
            user_id=uuid.UUID(user_id) if isinstance(user_id, str) else user_id,
            message_type="fact",
            role="system",
            content=fact,
            extracted_entities={"type": "general"},
            importance_score=8
        )
        self.db.add(new_fact)
        self.db.commit()
        
        # Vectorize memory in Pinecone
        vector_id = f"mem_{new_fact.id.hex}"
        await VectorService.upsert_vector(
            user_id=user_id,
            vector_id=vector_id,
            text=fact,
            metadata={"type": "memory", "memory_id": str(new_fact.id)}
        )
        
        return {
            "response_message": f"I've successfully updated my memories to remember: '{fact}'",
            "actions": []
        }

    # --- Public Execution Entry Point ---
    
    async def process_chat(
        self,
        user_id: str,
        conversation_id: str,
        message: str,
        chat_history: List[Dict[str, str]],
        forced_route: Optional[str] = None
    ) -> Dict[str, Any]:
        """Run the orchestrator graph cycle for a message"""
        
        # Build initial graph state
        messages_list = [*chat_history, {"role": "user", "content": message}]
        
        initial_state: DevaGraphState = {
            "messages": messages_list,
            "user_id": user_id,
            "conversation_id": conversation_id,
            "current_goal": None,
            "workflow_state": {},
            "actions": [],
            "next_node": forced_route if forced_route else "general",
            "response_message": ""
        }
        
        # Execute using StateGraph if available and no override route is forced
        if self.graph is not None and not forced_route:
            try:
                final_state = await self.graph.ainvoke(initial_state)
            except Exception as e:
                print(f"LangGraph execution failed: {e}. Running fallback execution.")
                final_state = await self._run_fallback(initial_state, forced_route)
        else:
            final_state = await self._run_fallback(initial_state, forced_route)
            
        # Check Memory Candidates
        actions = final_state.get("actions", [])
        memory_candidate = await MemoryAgent.extract_candidate_memory(self.db, user_id, message)
        if memory_candidate:
            actions.append(memory_candidate)
            
        return {
            "conversation_id": conversation_id,
            "message": final_state.get("response_message", "I didn't receive a response from Deva."),
            "actions": actions
        }

    async def _run_fallback(self, state: DevaGraphState, forced_route: Optional[str] = None) -> DevaGraphState:
        """Manual node sequencing fallback in case LangGraph package has installation errors"""
        if forced_route:
            state["next_node"] = forced_route
        else:
            # Run Gateway
            gateway_state = await self.gateway_node(state)
            state.update(gateway_state)
        
        # Route to target
        target = state.get("next_node", "general")
        if target == "planner":
            node_state = await self.planner_node(state)
        elif target == "template":
            node_state = await self.template_node(state)
        elif target == "lead":
            node_state = await self.lead_node(state)
        elif target == "campaign":
            node_state = await self.campaign_node(state)
        elif target == "memory":
            node_state = await self.memory_node(state)
        else:
            node_state = await self.general_node(state)
            
        state.update(node_state)
        return state
