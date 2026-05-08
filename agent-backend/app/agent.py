from __future__ import annotations

import asyncio
import json
import uuid
from typing import Annotated, Any, TypedDict

from fastapi import HTTPException, status
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_core.tools import tool
from langchain_groq import ChatGroq
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages
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
)

settings = get_settings()


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    user_id: str
    conversation_id: str
    context_bundle: dict[str, Any]
    final_output: dict[str, Any]


class DevaAgentService:
    def __init__(self) -> None:
        self.memory = MemorySaver()

    def _build_tools(self, user_id: str):
        @tool
        async def get_user_assets(limit: int = 5) -> dict[str, Any]:
            """Return the user's latest assets."""
            return await asyncio.to_thread(list_assets, user_id, limit)

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
                self._update_campaign,
                user_id,
                campaign_id,
                name,
                description,
                status,
                template_id,
            )

        @tool
        async def delete_campaign_tool(campaign_id: str, confirm: bool = False) -> dict[str, Any]:
            """Delete a campaign only after explicit confirmation."""
            if not confirm:
                return {
                    "success": False,
                    "needs_confirmation": True,
                    "message": "Ask the user to confirm before deleting the campaign.",
                    "proposal": {"campaign_id": campaign_id},
                }

            return await asyncio.to_thread(self._delete_campaign, user_id, campaign_id)

        @tool
        async def save_memory_note(content: str, importance_score: int = 3) -> dict[str, Any]:
            """Save a user note into long-term memory."""
            return await asyncio.to_thread(self._save_memory, user_id, content, importance_score)

        return [
            get_user_assets,
            get_user_templates,
            get_user_campaigns,
            get_user_leads,
            create_campaign_tool,
            update_campaign_tool,
            delete_campaign_tool,
            save_memory_note,
        ]

    def _create_campaign(self, user_id: str, name: str, description: str | None):
        campaign = create_campaign(user_id=user_id, name=name, description=description)
        return {"success": True, "message": "Campaign created.", "data": campaign}

    def _update_campaign(
        self,
        user_id: str,
        campaign_id: str,
        name: str | None,
        description: str | None,
        status: str | None,
        template_id: str | None,
    ):
        updated = update_campaign(
            user_id=user_id,
            campaign_id=campaign_id,
            name=name,
            description=description,
            status=status,
            template_id=template_id,
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
            user_id=user_id,
            role="assistant",
            content=content,
            message_type="note",
            importance_score=importance_score,
            metadata={"source": "deva"},
        )
        return {"success": True, "message": "Memory note saved.", "data": row}

    def _build_graph(self, user_id: str):
        if not settings.groq_api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="GROQ_API_KEY is not configured",
            )

        tools = self._build_tools(user_id)
        llm = ChatGroq(
            model=settings.groq_model,
            temperature=settings.groq_temperature,
            groq_api_key=settings.groq_api_key,
        ).bind_tools(tools)

        def context_retriever(state: AgentState):
            return {"context_bundle": build_context_bundle(user_id, limit=settings.context_limit)}

        async def agent_node(state: AgentState):
            context_text = json.dumps(state.get("context_bundle", {}), indent=2, default=str)
            system_prompt = (
                "You are Deva, the central AI agent for OutreachX. "
                "You help the user understand, create, update, and review outreach assets, leads, templates, campaigns, and notes. "
                "Respect user isolation. Never expose another user's data. "
                "When a mutation is requested, ask for confirmation before calling a destructive or persistent tool. "
                "Return concise but useful answers. When possible, include JSON keys: message, actions, suggested_prompts, next_steps. "
                f"\n\nCurrent user context:\n{context_text}"
            )
            messages = [SystemMessage(content=system_prompt)] + list(state["messages"])
            response = await llm.ainvoke(messages)
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
            suggested_prompts = parsed.get("suggested_prompts")
            if not isinstance(suggested_prompts, list):
                suggested_prompts = [
                    "Summarize my latest campaign status.",
                    "Draft a campaign using my strongest template.",
                    "Show assets and leads ready for outreach.",
                ]

            actions = parsed.get("actions")
            if not isinstance(actions, list):
                actions = []

            return {
                "final_output": {
                    "message": message,
                    "actions": actions,
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
        builder.add_node("context_retriever", context_retriever)
        builder.add_node("agent", agent_node)
        builder.add_node("tools", ToolNode(tools))
        builder.add_node("formatter", formatter_node)

        builder.set_entry_point("context_retriever")
        builder.add_edge("context_retriever", "agent")
        builder.add_conditional_edges(
            "agent",
            route_agent_output,
            {"tools": "tools", "formatter": "formatter"},
        )
        builder.add_edge("tools", "agent")
        builder.add_edge("formatter", END)

        return builder.compile(checkpointer=self.memory)

    async def chat(self, user_id: str, message: str, conversation_id: str | None = None):
        conversation_id = conversation_id or str(uuid.uuid4())
        graph = self._build_graph(user_id)
        config = {"configurable": {"thread_id": conversation_id}}

        store_memory(
            user_id=user_id,
            role="user",
            content=message,
            conversation_id=conversation_id,
            message_type="prompt",
            importance_score=2,
            metadata={"source": "chat"},
        )

        result = await graph.ainvoke(
            {
                "messages": [HumanMessage(content=message)],
                "user_id": user_id,
                "conversation_id": conversation_id,
            },
            config=config,
        )

        output = result.get("final_output") or {}
        assistant_message = str(output.get("message") or "")

        store_memory(
            user_id=user_id,
            role="assistant",
            content=assistant_message,
            conversation_id=conversation_id,
            message_type="response",
            importance_score=3,
            metadata={"source": "deva"},
        )

        return {
            "conversation_id": conversation_id,
            "message": assistant_message,
            "actions": output.get("actions") or [],
            "suggested_prompts": output.get("suggested_prompts") or [],
            "raw_output": output.get("raw_output") or {},
            "context": result.get("context_bundle") or build_context_bundle(user_id, limit=settings.context_limit),
        }


deva_service = DevaAgentService()
