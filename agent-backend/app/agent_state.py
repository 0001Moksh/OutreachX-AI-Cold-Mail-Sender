from typing import TypedDict, List, Dict, Optional, Any
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from typing import Annotated

class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    user_id: str
    conversation_id: str
    current_template: Optional[Dict[str, Any]]
    selected_leads: Optional[List[Dict[str, Any]]]
    current_campaign: Optional[Dict[str, Any]]
    retrieved_assets: Optional[List[Dict[str, Any]]]
    pending_action: Optional[str]
    confirmation_required: bool
    ui_actions: List[Dict[str, Any]]
    user_preferences: Dict[str, Any]
    memory_context: Dict[str, Any]
    intent: Optional[str]
    plan: Optional[str]
    final_output: Optional[Dict[str, Any]]
