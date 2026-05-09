from __future__ import annotations

from fastapi import Depends, FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from .agent import deva_service
from .auth import get_user_context
from .config import get_settings
from .database import build_context_bundle, create_campaign, delete_campaign, store_memory, update_campaign
from .schemas import ActionRequest, ActionResponse, DevaChatRequest, DevaChatResponse, DevaContextItem, DevaContextResponse

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="Standalone AI agent backend for OutreachX Deva",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AssetProcessRequest(BaseModel):
    asset_id: str
    content: str
    name: str

def process_asset_embedding(user_id: str, asset_id: str, name: str, content: str):
    from .vector_store import vector_store
    try:
        vector_store.upsert_asset_chunks(user_id=user_id, asset_id=asset_id, asset_name=name, content=content)
    except Exception as e:
        print(f"Error processing asset embedding: {e}")

@app.post("/deva/assets/process")
def process_asset(request: AssetProcessRequest, background_tasks: BackgroundTasks, user: dict = Depends(get_user_context)):
    background_tasks.add_task(process_asset_embedding, user["user_id"], request.asset_id, request.name, request.content)
    return {"success": True, "message": "Embedding generation started in background."}



@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "healthy", "service": "deva-agent"}


@app.get("/")
def root() -> dict[str, str]:
    return {
        "name": settings.app_name,
        "status": "ready",
        "description": "OutreachX Deva agent backend",
    }


def _to_context_items(items: list[dict], kind: str) -> list[DevaContextItem]:
    context_items: list[DevaContextItem] = []
    for item in items:
        title = item.get("name") or item.get("file_name") or item.get("subject_line") or "Untitled"
        summary = item.get("description") or item.get("content") or item.get("status") or ""
        context_items.append(
            DevaContextItem(
                id=str(item.get("id")),
                title=str(title),
                kind=kind,
                summary=str(summary) if summary is not None else None,
                created_at=item.get("created_at"),
                metadata=item,
            )
        )
    return context_items


@app.get("/deva/context", response_model=DevaContextResponse)
def get_context(user: dict = Depends(get_user_context)):
    context = build_context_bundle(user["user_id"], limit=settings.context_limit)
    return DevaContextResponse(
        user_id=user["user_id"],
        profile=context.get("profile") or {},
        assets=_to_context_items(context.get("assets", []), "asset"),
        templates=_to_context_items(context.get("templates", []), "template"),
        campaigns=_to_context_items(context.get("campaigns", []), "campaign"),
        leads=_to_context_items(context.get("leads", []), "lead"),
        memory=_to_context_items(context.get("memory", []), "memory"),
        suggested_prompts=[
            "Summarize my latest campaign status.",
            "Draft a campaign using my strongest template.",
            "Show assets and leads ready for outreach.",
        ],
    )


@app.post("/deva/chat", response_model=DevaChatResponse)
async def deva_chat(request: DevaChatRequest, user: dict = Depends(get_user_context)):
    result = await deva_service.chat(
        user_id=user["user_id"],
        message=request.message,
        conversation_id=request.conversation_id,
    )

    context_bundle = result.get("context") or build_context_bundle(user["user_id"], limit=settings.context_limit)
    return DevaChatResponse(
        conversation_id=result["conversation_id"],
        message=result["message"],
        actions=result.get("actions") or [],
        suggested_prompts=result.get("suggested_prompts") or [],
        raw_output=result.get("raw_output") or {},
        context=DevaContextResponse(
            user_id=user["user_id"],
            profile=context_bundle.get("profile") or {},
            assets=_to_context_items(context_bundle.get("assets", []), "asset"),
            templates=_to_context_items(context_bundle.get("templates", []), "template"),
            campaigns=_to_context_items(context_bundle.get("campaigns", []), "campaign"),
            leads=_to_context_items(context_bundle.get("leads", []), "lead"),
            memory=_to_context_items(context_bundle.get("memory", []), "memory"),
            suggested_prompts=result.get("suggested_prompts") or [],
        ),
    )


@app.post("/deva/chat/stream")
async def deva_chat_stream(request: DevaChatRequest, user: dict = Depends(get_user_context)):
    return EventSourceResponse(deva_service.chat_stream(
        user_id=user["user_id"],
        message=request.message,
        conversation_id=request.conversation_id,
    ))


@app.post("/deva/actions", response_model=ActionResponse)
def run_action(payload: ActionRequest, user: dict = Depends(get_user_context)):
    if payload.action == "save_memory":
        row = store_memory(
            user_id=user["user_id"],
            role="assistant",
            content=str(payload.payload.get("content") or ""),
            message_type="note",
            importance_score=int(payload.payload.get("importance_score") or 3),
            metadata={"source": "manual"},
        )
        return ActionResponse(success=True, message="Memory saved.", data=row)

    if payload.action == "create_campaign":
        row = create_campaign(
            user_id=user["user_id"],
            name=str(payload.payload.get("name") or "Untitled campaign"),
            description=payload.payload.get("description"),
        )
        return ActionResponse(success=True, message="Campaign created.", data=row)

    if payload.action == "update_campaign":
        row = update_campaign(
            user_id=user["user_id"],
            campaign_id=str(payload.payload.get("campaign_id") or ""),
            name=payload.payload.get("name"),
            description=payload.payload.get("description"),
            status=payload.payload.get("status"),
            template_id=payload.payload.get("template_id"),
        )
        if row is None:
            return ActionResponse(success=False, message="Campaign not found or nothing to update.")
        return ActionResponse(success=True, message="Campaign updated.", data=row)

    if payload.action == "delete_campaign":
        row = delete_campaign(user_id=user["user_id"], campaign_id=str(payload.payload.get("campaign_id") or ""))
        if row is None:
            return ActionResponse(success=False, message="Campaign not found.")
        return ActionResponse(success=True, message="Campaign deleted.", data=row)

    return ActionResponse(success=False, message="Unsupported action.")
