from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class DevaChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=8000)
    conversation_id: str | None = None


class DevaAction(BaseModel):
    type: str
    label: str
    payload: dict[str, Any] = Field(default_factory=dict)
    destructive: bool = False


class DevaContextItem(BaseModel):
    id: str
    title: str
    kind: str
    summary: str | None = None
    created_at: datetime | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class DevaContextResponse(BaseModel):
    success: bool = True
    user_id: str
    profile: dict[str, Any] = Field(default_factory=dict)
    assets: list[DevaContextItem] = Field(default_factory=list)
    templates: list[DevaContextItem] = Field(default_factory=list)
    campaigns: list[DevaContextItem] = Field(default_factory=list)
    leads: list[DevaContextItem] = Field(default_factory=list)
    memory: list[DevaContextItem] = Field(default_factory=list)
    suggested_prompts: list[str] = Field(default_factory=list)


class DevaChatResponse(BaseModel):
    success: bool = True
    conversation_id: str
    message: str
    actions: list[DevaAction] = Field(default_factory=list)
    context: DevaContextResponse | None = None
    suggested_prompts: list[str] = Field(default_factory=list)
    raw_output: dict[str, Any] = Field(default_factory=dict)


class ActionRequest(BaseModel):
    action: Literal["create_campaign", "update_campaign", "delete_campaign", "save_memory"]
    payload: dict[str, Any] = Field(default_factory=dict)


class ActionResponse(BaseModel):
    success: bool
    message: str
    data: dict[str, Any] = Field(default_factory=dict)
