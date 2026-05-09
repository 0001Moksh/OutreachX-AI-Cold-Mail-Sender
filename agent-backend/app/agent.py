from __future__ import annotations

import asyncio
import json
import uuid
from typing import Any

from fastapi import HTTPException, status
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_core.tools import tool
from langchain_groq import ChatGroq
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, StateGraph
from langgraph.prebuilt import ToolNode

from .config import get_settings
from .database import (
    build_context_bundle,
    create_campaign,
    delete_campaign,
    list_assets,
    list_campaigns,
    list_leads,
    list_templates,
    store_memory,
    update_campaign,
    count_memory_messages,
    get_old_memory_messages,
    delete_memory_messages,
)
from .agent_state import AgentState
from .intent_router import intent_router
from .vector_store import vector_store

settings = get_settings()

class DevaAgentService:
    def __init__(self) -> None:
        self.memory = MemorySaver()

    def _build_tools(self, user_id: str):
        @tool
        async def get_user_assets(limit: int = 5) -> dict[str, Any]:
            """Return the user's latest assets."""
            return await asyncio.to_thread(list_assets, user_id, limit)

        @tool
        async def query_assets_hybrid(query: str, limit: int = 5) -> dict[str, Any]:
            """Search user assets using hybrid search (metadata + semantic vector search). Use this for any knowledge questions."""
            # 1. Metadata exact match check could be done via DB (omitted here for simplicity, focusing on vector)
            # 2. Semantic search fallback via Pinecone
            try:
                results = await asyncio.to_thread(vector_store.hybrid_search, user_id, query, limit)
                return {"success": True, "results": results}
            except Exception as e:
                return {"success": False, "error": str(e)}

        @tool
        async def get_user_templates(limit: int = 5) -> dict[str, Any]:
            """Return the user's latest templates."""
            return await asyncio.to_thread(list_templates, user_id, limit)

        @tool
        async def get_user_campaigns(limit: int = 5) -> dict[str, Any]:
            """Return the user's latest campaigns."""
            return await asyncio.to_thread(list_campaigns, user_id, limit)

        @tool
        async def get_user_leads(limit: int = 5) -> dict[str, Any]:
            """Return the user's latest lead files."""
            return await asyncio.to_thread(list_leads, user_id, limit)

        @tool
        async def create_campaign_tool(name: str, description: str | None = None, confirm: bool = False) -> dict[str, Any]:
            """Create a new campaign only after explicit confirmation."""
            if not confirm:
                return {
                    "success": False,
                    "needs_confirmation": True,
                    "message": "Ask the user to confirm before creating the campaign.",
                    "proposal": {"name": name, "description": description},
                }
            return await asyncio.to_thread(self._create_campaign, user_id, name, description)

        @tool
        async def update_campaign_tool(
            campaign_id: str,
            name: str | None = None,
            description: str | None = None,
            status: str | None = None,
            template_id: str | None = None,
            confirm: bool = False,
        ) -> dict[str, Any]:
            """Update an existing campaign only after explicit confirmation."""
            if not confirm:
                return {
                    "success": False,
                    "needs_confirmation": True,
                    "message": "Ask the user to confirm before updating the campaign.",
                    "proposal": {
                        "campaign_id": campaign_id,
                        "name": name,
                        "description": description,
                        "status": status,
                        "template_id": template_id,
                    },
                }
            return await asyncio.to_thread(
                self._update_campaign, user_id, campaign_id, name, description, status, template_id
            )

        @tool
        async def delete_operation_tool(item_type: str, item_id: str, confirm: bool = False) -> dict[str, Any]:
            """Delete an item (campaign, template, etc.) only after explicit confirmation."""
            if not confirm:
                return {
                    "success": False,
                    "needs_confirmation": True,
                    "message": f"Ask the user to confirm before deleting the {item_type}.",
                    "proposal": {"item_type": item_type, "item_id": item_id},
                }
            if item_type == "campaign":
                return await asyncio.to_thread(self._delete_campaign, user_id, item_id)
            elif item_type == "asset":
                # Handle vector delete as well
                await asyncio.to_thread(vector_store.delete_asset_vectors, user_id, item_id)
                return {"success": True, "message": "Asset deleted (placeholder)."}
            return {"success": False, "message": "Unsupported item type for deletion."}

        @tool
        async def save_memory_note(content: str, importance_score: int = 3) -> dict[str, Any]:
            """Save a user note into long-term memory."""
            return await asyncio.to_thread(self._save_memory, user_id, content, importance_score)

        return [
            get_user_assets,
            query_assets_hybrid,
            get_user_templates,
            get_user_campaigns,
            get_user_leads,
            create_campaign_tool,
            update_campaign_tool,
            delete_operation_tool,
            save_memory_note,
        ]

    def _create_campaign(self, user_id: str, name: str, description: str | None):
        campaign = create_campaign(user_id=user_id, name=name, description=description)
        return {"success": True, "message": "Campaign created.", "data": campaign}

    def _update_campaign(self, user_id, campaign_id, name, description, status, template_id):
        updated = update_campaign(
            user_id=user_id, campaign_id=campaign_id, name=name, description=description, status=status, template_id=template_id
        )
        if updated is None:
            return {"success": False, "message": "Nothing to update or campaign not found."}
        return {"success": True, "message": "Campaign updated.", "data": updated}

    def _delete_campaign(self, user_id: str, campaign_id: str):
        deleted = delete_campaign(user_id=user_id, campaign_id=campaign_id)
        if deleted is None:
            return {"success": False, "message": "Campaign not found."}
        return {"success": True, "message": "Campaign deleted.", "data": deleted}

    def _save_memory(self, user_id: str, content: str, importance_score: int = 3):
        row = store_memory(
            user_id=user_id, role="assistant", content=content, message_type="note", importance_score=importance_score, metadata={"source": "deva"}
        )
        return {"success": True, "message": "Memory note saved.", "data": row}

    async def _summarize_memory_if_needed(self, user_id: str):
        count = count_memory_messages(user_id)
        if count <= 15:
            return
            
        old_messages = get_old_memory_messages(user_id, keep_latest=5)
        if not old_messages:
            return
            
        old_messages.sort(key=lambda x: x["created_at"])
        text_to_summarize = "\n".join([f"{m['role']}: {m['content']}" for m in old_messages])
        
        llm = ChatGroq(
            model=settings.groq_model,
            temperature=0,
            groq_api_key=settings.groq_api_key,
        )
        summary_prompt = f"Summarize the following conversation history concisely, retaining key facts, user preferences, and important context:\n\n{text_to_summarize}"
        
        try:
            summary_response = await llm.ainvoke([SystemMessage(content=summary_prompt)])
            summary = summary_response.content
            delete_memory_messages([m["id"] for m in old_messages])
            store_memory(
                user_id=user_id,
                role="system",
                content=f"Previous Conversation Summary: {summary}",
                message_type="summary",
                importance_score=5,
                metadata={"source": "auto_summarizer"}
            )
        except Exception as e:
            print(f"Failed to summarize memory: {e}")

    def _build_graph(self, user_id: str):
        if not settings.groq_api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="GROQ_API_KEY is not configured",
            )

        tools = self._build_tools(user_id)
        base_llm = ChatGroq(
            model=settings.groq_model,
            temperature=settings.groq_temperature,
            groq_api_key=settings.groq_api_key,
        )
        llm_with_tools = base_llm.bind_tools(tools)

        async def route_intent_node(state: AgentState):
            intent = await intent_router.route(state)
            return {"intent": intent}

        def context_retriever(state: AgentState):
            # We can optionally fetch different context based on state['intent']
            context = build_context_bundle(state["user_id"], limit=settings.context_limit)
            return {"memory_context": context}

        async def planner_node(state: AgentState):
            context_text = json.dumps(state.get("memory_context", {}), indent=2, default=str)
            current_intent = state.get("intent", "general_chat")
            
            planner_prompt = (
                f"You are the Planner Agent for Deva, an AI Operating System for OutreachX. "
                f"Your job is to analyze the user's request and the current intent ({current_intent}) "
                "and formulate a step-by-step execution plan for the Executor Agent to follow. "
                "Do not execute anything yourself. Just list the steps clearly. "
                "If no complex plan is needed, just say 'Respond to user'. "
                f"\n\nCurrent user context:\n{context_text}"
            )
            messages = [SystemMessage(content=planner_prompt)] + list(state["messages"])
            response = await base_llm.ainvoke(messages)
            return {"plan": response.content}

        async def executor_node(state: AgentState):
            context_text = json.dumps(state.get("memory_context", {}), indent=2, default=str)
            current_intent = state.get("intent", "general_chat")
            plan = state.get("plan", "No plan provided.")
            
            intent_prompts = {
                "ui_generation": "The user wants a UI widget. Prioritize generating actions for the frontend.",
                "create_campaign": "The user wants to create a campaign. Guide them step by step. Ensure they provide a name and description.",
                "update_campaign": "The user wants to update a campaign. Ask which one and what changes to make.",
                "delete_operation": "The user wants to delete something. ALWAYS ask for confirmation before deleting. Be extremely careful.",
                "query_assets": "The user is asking a knowledge question. Use the query_assets_hybrid tool to search their assets and provide accurate citations.",
                "general_chat": "You are a helpful AI assistant. Answer general questions naturally."
            }
            specific_prompt = intent_prompts.get(current_intent, intent_prompts["general_chat"])
            
            executor_prompt = (
                f"You are the Executor Agent for Deva. "
                f"Current intent: {current_intent}. "
                f"Intent Instructions: {specific_prompt}\n"
                f"Execution Plan from Planner:\n{plan}\n\n"
                "Follow the plan step by step. Use the tools provided if needed. "
                "You help the user understand, create, update, and review outreach assets, leads, templates, campaigns. "
                "Respect user isolation. Never expose another user's data. "
                "When a mutation is requested, ask for confirmation before calling a destructive tool. "
                "If you lack confidence or retrieval scores are low, halt the plan and admit you cannot proceed safely. "
                "Return concise but useful answers. When possible, include JSON keys: message, actions, suggested_prompts. "
                f"\n\nCurrent user context:\n{context_text}"
            )
            messages = [SystemMessage(content=executor_prompt)] + list(state["messages"])
            response = await llm_with_tools.ainvoke(messages)
            return {"messages": [response]}

        def formatter_node(state: AgentState):
            raw_message = state["messages"][-1]
            raw_content = getattr(raw_message, "content", "")
            parsed: dict[str, Any]

            try:
                parsed_candidate = json.loads(raw_content)
                parsed = parsed_candidate if isinstance(parsed_candidate, dict) else {"message": raw_content}
            except Exception:
                parsed = {"message": raw_content}

            message = str(parsed.get("message") or raw_content)
            suggested_prompts = parsed.get("suggested_prompts", [])
            actions_raw = parsed.get("actions", [])
            valid_actions = []
            if isinstance(actions_raw, list):
                for a in actions_raw:
                    if isinstance(a, dict) and "type" in a and "label" in a:
                        valid_actions.append(a)

            return {
                "final_output": {
                    "message": message,
                    "actions": valid_actions,
                    "suggested_prompts": suggested_prompts,
                    "raw_output": parsed,
                }
            }

        def route_agent_output(state: AgentState) -> str:
            last_message = state["messages"][-1]
            if getattr(last_message, "tool_calls", None):
                return "tools"
            return "formatter"

        builder = StateGraph(AgentState)
        builder.add_node("intent_router", route_intent_node)
        builder.add_node("context_retriever", context_retriever)
        builder.add_node("planner", planner_node)
        builder.add_node("executor", executor_node)
        builder.add_node("tools", ToolNode(tools))
        builder.add_node("formatter", formatter_node)

        builder.set_entry_point("intent_router")
        builder.add_edge("intent_router", "context_retriever")
        builder.add_edge("context_retriever", "planner")
        builder.add_edge("planner", "executor")
        builder.add_conditional_edges(
            "executor",
            route_agent_output,
            {"tools": "tools", "formatter": "formatter"},
        )
        builder.add_edge("tools", "executor")
        builder.add_edge("formatter", END)

        return builder.compile(checkpointer=self.memory)

    async def chat(self, user_id: str, message: str, conversation_id: str | None = None):
        await self._summarize_memory_if_needed(user_id)
        conversation_id = conversation_id or str(uuid.uuid4())
        graph = self._build_graph(user_id)
        config = {"configurable": {"thread_id": conversation_id}}

        store_memory(
            user_id=user_id, role="user", content=message, conversation_id=conversation_id, message_type="prompt", importance_score=2, metadata={"source": "chat"}
        )

        result = await graph.ainvoke(
            {
                "messages": [HumanMessage(content=message)],
                "user_id": user_id,
                "conversation_id": conversation_id,
                "ui_actions": [],
                "user_preferences": {},
                "memory_context": {},
            },
            config=config,
        )

        output = result.get("final_output") or {}
        assistant_message = str(output.get("message") or "")

        store_memory(
            user_id=user_id, role="assistant", content=assistant_message, conversation_id=conversation_id, message_type="response", importance_score=3, metadata={"source": "deva"}
        )

        return {
            "conversation_id": conversation_id,
            "message": assistant_message,
            "actions": output.get("actions") or [],
            "suggested_prompts": output.get("suggested_prompts") or [],
            "raw_output": output.get("raw_output") or {},
            "context": result.get("memory_context") or build_context_bundle(user_id, limit=settings.context_limit),
            "intent": result.get("intent", "general_chat")
        }

    async def chat_stream(self, user_id: str, message: str, conversation_id: str | None = None):
        import json
        from langchain_core.messages import HumanMessage
        import uuid
        
        await self._summarize_memory_if_needed(user_id)
        conversation_id = conversation_id or str(uuid.uuid4())
        graph = self._build_graph(user_id)
        config = {"configurable": {"thread_id": conversation_id}}
        
        yield f"data: {json.dumps({'type': 'status', 'content': 'Thinking...'})}\n\n"
        
        try:
            async for event in graph.astream_events({"messages": [HumanMessage(content=message)], "user_id": user_id}, config=config, version="v1"):
                kind = event["event"]
                if kind == "on_tool_start":
                    tool_name = event.get("name", "tool")
                    yield f"data: {json.dumps({'type': 'status', 'content': f'Running tool {tool_name}...'})}\n\n"
                elif kind == "on_chat_model_stream":
                    chunk = event["data"]["chunk"].content
                    if chunk:
                        yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
            
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

deva_service = DevaAgentService()
