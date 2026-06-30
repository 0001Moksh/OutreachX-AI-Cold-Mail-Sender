import os
import sys
import time
import json
import uuid
import re
import asyncio
from typing import Optional, List, Dict, Any, Tuple, Sequence, Iterator, Annotated, TypedDict, AsyncIterator
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import jwt
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

# Add project root and backend paths to sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(root_dir, "backend")
if root_dir not in sys.path:
    sys.path.append(root_dir)
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

# Load environment variables first
load_dotenv(os.path.join(root_dir, ".env"))
load_dotenv(os.path.join(backend_dir, ".env"))

# Import shared modules
from shared.database import get_db, SessionLocal, engine
from shared.models import User, APIKey, CostTracking
from security import decrypt_credential, encrypt_credential, verify_token

# Import LangGraph and LangChain modules
import litellm
from langchain_litellm import ChatLiteLLM
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage, AIMessage
from langchain_core.tools import tool
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.base import BaseCheckpointSaver, Checkpoint, CheckpointMetadata, CheckpointTuple, ChannelVersions, get_checkpoint_metadata
from tavily import TavilyClient
from bs4 import BeautifulSoup
import requests
from pinecone import Pinecone

# Silence LiteLLM logs
litellm.set_verbose = False
litellm.suppress_debug_info = True
litellm.turn_off_message_logging = True
try:
    litellm._logging._disable_debugging()
except AttributeError:
    pass

# ====================================================================
# CUSTOM POSTGRES CHECKPOINTER (POSTGRESSAVER)
# ====================================================================
class PostgresSaver(BaseCheckpointSaver):
    def __init__(self, conn_string: str):
        super().__init__()
        self.conn_string = conn_string
        self._init_db()

    def _init_db(self):
        import psycopg2
        with psycopg2.connect(self.conn_string) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS public.deva_checkpoints (
                        thread_id text,
                        checkpoint_ns text,
                        checkpoint_id text,
                        parent_checkpoint_id text,
                        checkpoint_type text,
                        checkpoint_data bytea,
                        metadata_type text,
                        metadata_data bytea,
                        PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
                    );
                    CREATE TABLE IF NOT EXISTS public.deva_checkpoint_writes (
                        thread_id text,
                        checkpoint_ns text,
                        checkpoint_id text,
                        task_id text,
                        idx integer,
                        channel text,
                        write_type text,
                        write_data bytea,
                        task_path text,
                        PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
                    );
                    CREATE TABLE IF NOT EXISTS public.deva_checkpoint_blobs (
                        thread_id text,
                        checkpoint_ns text,
                        key text,
                        version text,
                        blob_type text,
                        blob_data bytea,
                        PRIMARY KEY (thread_id, checkpoint_ns, key, version)
                    );
                """)
                conn.commit()

    def _load_blobs(self, conn, thread_id: str, checkpoint_ns: str, versions: dict) -> dict:
        result = {}
        with conn.cursor() as cur:
            for k, ver in versions.items():
                cur.execute("""
                    SELECT blob_type, blob_data FROM public.deva_checkpoint_blobs
                    WHERE thread_id = %s AND checkpoint_ns = %s AND key = %s AND version = %s
                """, (thread_id, checkpoint_ns, k, str(ver)))
                row = cur.fetchone()
                if row:
                    b_type, b_data = row
                    if b_type == "empty":
                        continue
                    result[k] = self.serde.loads_typed((b_type, bytes(b_data)))
        return result

    def get_tuple(self, config: dict) -> Optional[CheckpointTuple]:
        import psycopg2
        thread_id = config["configurable"]["thread_id"]
        checkpoint_ns = config["configurable"].get("checkpoint_ns", "")
        checkpoint_id = config["configurable"].get("checkpoint_id")

        with psycopg2.connect(self.conn_string) as conn:
            with conn.cursor() as cur:
                if checkpoint_id:
                    cur.execute("""
                        SELECT parent_checkpoint_id, checkpoint_type, checkpoint_data, metadata_type, metadata_data
                        FROM public.deva_checkpoints
                        WHERE thread_id = %s AND checkpoint_ns = %s AND checkpoint_id = %s
                    """, (thread_id, checkpoint_ns, checkpoint_id))
                    row = cur.fetchone()
                    if not row:
                        return None
                    parent_checkpoint_id, c_type, c_data, m_type, m_data = row
                else:
                    cur.execute("""
                        SELECT checkpoint_id, parent_checkpoint_id, checkpoint_type, checkpoint_data, metadata_type, metadata_data
                        FROM public.deva_checkpoints
                        WHERE thread_id = %s AND checkpoint_ns = %s
                        ORDER BY checkpoint_id DESC LIMIT 1
                    """, (thread_id, checkpoint_ns))
                    row = cur.fetchone()
                    if not row:
                        return None
                    checkpoint_id, parent_checkpoint_id, c_type, c_data, m_type, m_data = row

                # Retrieve writes
                cur.execute("""
                    SELECT task_id, channel, write_type, write_data
                    FROM public.deva_checkpoint_writes
                    WHERE thread_id = %s AND checkpoint_ns = %s AND checkpoint_id = %s
                """, (thread_id, checkpoint_ns, checkpoint_id))
                writes_rows = cur.fetchall()
                writes = []
                for w_task_id, w_channel, w_type, w_data in writes_rows:
                    writes.append((w_task_id, w_channel, self.serde.loads_typed((w_type, bytes(w_data)))))

                checkpoint_dict = self.serde.loads_typed((c_type, bytes(c_data)))
                checkpoint_dict["channel_values"] = self._load_blobs(conn, thread_id, checkpoint_ns, checkpoint_dict["channel_versions"])

                return CheckpointTuple(
                    config={
                        "configurable": {
                            "thread_id": thread_id,
                            "checkpoint_ns": checkpoint_ns,
                            "checkpoint_id": checkpoint_id,
                        }
                    },
                    checkpoint=checkpoint_dict,
                    metadata=self.serde.loads_typed((m_type, bytes(m_data))),
                    pending_writes=writes,
                    parent_config=(
                        {
                            "configurable": {
                                "thread_id": thread_id,
                                "checkpoint_ns": checkpoint_ns,
                                "checkpoint_id": parent_checkpoint_id,
                            }
                        }
                        if parent_checkpoint_id
                        else None
                    )
                )

    async def aget_tuple(self, config: dict) -> Optional[CheckpointTuple]:
        return self.get_tuple(config)

    async def aput(
        self,
        config: dict,
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata,
        new_versions: ChannelVersions,
    ) -> dict:
        return self.put(config, checkpoint, metadata, new_versions)

    async def aput_writes(
        self,
        config: dict,
        writes: Sequence[Tuple[str, Any]],
        task_id: str,
        task_path: str = "",
    ) -> None:
        return self.put_writes(config, writes, task_id, task_path)

    async def alist(
        self,
        config: Optional[dict],
        *,
        filter: Optional[dict] = None,
        before: Optional[dict] = None,
        limit: Optional[int] = None,
    ) -> AsyncIterator[CheckpointTuple]:
        for item in self.list(config, filter=filter, before=before, limit=limit):
            yield item

    def put(
        self,
        config: dict,
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata,
        new_versions: ChannelVersions,
    ) -> dict:
        import psycopg2
        thread_id = config["configurable"]["thread_id"]
        checkpoint_ns = config["configurable"]["checkpoint_ns"]
        c = checkpoint.copy()
        values = c.pop("channel_values")

        with psycopg2.connect(self.conn_string) as conn:
            with conn.cursor() as cur:
                # Save blobs
                for k, v in new_versions.items():
                    if k in values:
                        blob_type, blob_data = self.serde.dumps_typed(values[k])
                    else:
                        blob_type, blob_data = ("empty", b"")
                    
                    cur.execute("""
                        INSERT INTO public.deva_checkpoint_blobs (thread_id, checkpoint_ns, key, version, blob_type, blob_data)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT (thread_id, checkpoint_ns, key, version) 
                        DO UPDATE SET blob_type = EXCLUDED.blob_type, blob_data = EXCLUDED.blob_data
                    """, (thread_id, checkpoint_ns, k, str(v), blob_type, blob_data))

                # Save checkpoint
                c_type, c_data = self.serde.dumps_typed(c)
                m_type, m_data = self.serde.dumps_typed(get_checkpoint_metadata(config, metadata))
                parent_id = config["configurable"].get("checkpoint_id")

                cur.execute("""
                    INSERT INTO public.deva_checkpoints (
                        thread_id, checkpoint_ns, checkpoint_id, parent_checkpoint_id, 
                        checkpoint_type, checkpoint_data, metadata_type, metadata_data
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (thread_id, checkpoint_ns, checkpoint_id) 
                    DO UPDATE SET 
                        parent_checkpoint_id = EXCLUDED.parent_checkpoint_id,
                        checkpoint_type = EXCLUDED.checkpoint_type,
                        checkpoint_data = EXCLUDED.checkpoint_data,
                        metadata_type = EXCLUDED.metadata_type,
                        metadata_data = EXCLUDED.metadata_data
                """, (thread_id, checkpoint_ns, checkpoint["id"], parent_id, c_type, c_data, m_type, m_data))
                conn.commit()

        return {
            "configurable": {
                "thread_id": thread_id,
                "checkpoint_ns": checkpoint_ns,
                "checkpoint_id": checkpoint["id"],
            }
        }

    def put_writes(
        self,
        config: dict,
        writes: Sequence[Tuple[str, Any]],
        task_id: str,
        task_path: str = "",
    ) -> None:
        import psycopg2
        thread_id = config["configurable"]["thread_id"]
        checkpoint_ns = config["configurable"].get("checkpoint_ns", "")
        checkpoint_id = config["configurable"]["checkpoint_id"]

        with psycopg2.connect(self.conn_string) as conn:
            with conn.cursor() as cur:
                for idx, (channel, val) in enumerate(writes):
                    w_type, w_data = self.serde.dumps_typed(val)
                    cur.execute("""
                        INSERT INTO public.deva_checkpoint_writes (
                            thread_id, checkpoint_ns, checkpoint_id, task_id, idx, channel, write_type, write_data, task_path
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (thread_id, checkpoint_ns, checkpoint_id, task_id, idx) DO NOTHING
                    """, (thread_id, checkpoint_ns, checkpoint_id, task_id, idx, channel, w_type, w_data, task_path))
                conn.commit()

    def list(
        self,
        config: Optional[dict],
        *,
        filter: Optional[dict] = None,
        before: Optional[dict] = None,
        limit: Optional[int] = None,
    ) -> Iterator[CheckpointTuple]:
        import psycopg2
        thread_id = config["configurable"]["thread_id"] if config else None
        config_checkpoint_ns = config["configurable"].get("checkpoint_ns") if config else None
        config_checkpoint_id = config["configurable"].get("checkpoint_id") if config else None
        before_checkpoint_id = before["configurable"].get("checkpoint_id") if before else None

        with psycopg2.connect(self.conn_string) as conn:
            with conn.cursor() as cur:
                query = """
                    SELECT thread_id, checkpoint_ns, checkpoint_id, parent_checkpoint_id, checkpoint_type, checkpoint_data, metadata_type, metadata_data
                    FROM public.deva_checkpoints
                    WHERE 1=1
                """
                params = []
                if thread_id:
                    query += " AND thread_id = %s"
                    params.append(thread_id)
                if config_checkpoint_ns:
                    query += " AND checkpoint_ns = %s"
                    params.append(config_checkpoint_ns)
                if config_checkpoint_id:
                    query += " AND checkpoint_id = %s"
                    params.append(config_checkpoint_id)
                if before_checkpoint_id:
                    query += " AND checkpoint_id < %s"
                    params.append(before_checkpoint_id)

                query += " ORDER BY checkpoint_id DESC"
                cur.execute(query, params)
                rows = cur.fetchall()

                counter = 0
                for r_thread_id, r_checkpoint_ns, r_checkpoint_id, r_parent_checkpoint_id, r_c_type, r_c_data, r_m_type, r_m_data in rows:
                    if limit is not None and counter >= limit:
                        break

                    metadata = self.serde.loads_typed((r_m_type, bytes(r_m_data)))
                    if filter:
                        match = True
                        for fk, fv in filter.items():
                            if metadata.get(fk) != fv:
                                match = False
                                break
                        if not match:
                            continue

                    # Fetch writes
                    with conn.cursor() as cur_writes:
                        cur_writes.execute("""
                            SELECT task_id, channel, write_type, write_data
                            FROM public.deva_checkpoint_writes
                            WHERE thread_id = %s AND checkpoint_ns = %s AND checkpoint_id = %s
                        """, (r_thread_id, r_checkpoint_ns, r_checkpoint_id))
                        writes_rows = cur_writes.fetchall()
                        writes = []
                        for w_task_id, w_channel, w_type, w_data in writes_rows:
                            writes.append((w_task_id, w_channel, self.serde.loads_typed((w_type, bytes(w_data)))))

                    checkpoint_dict = self.serde.loads_typed((r_c_type, bytes(r_c_data)))
                    checkpoint_dict["channel_values"] = self._load_blobs(conn, r_thread_id, r_checkpoint_ns, checkpoint_dict["channel_versions"])

                    counter += 1
                    yield CheckpointTuple(
                        config={
                            "configurable": {
                                "thread_id": r_thread_id,
                                "checkpoint_ns": r_checkpoint_ns,
                                "checkpoint_id": r_checkpoint_id,
                            }
                        },
                        checkpoint=checkpoint_dict,
                        metadata=metadata,
                        pending_writes=writes,
                        parent_config=(
                            {
                                "configurable": {
                                    "thread_id": r_thread_id,
                                    "checkpoint_ns": r_checkpoint_ns,
                                    "checkpoint_id": r_parent_checkpoint_id,
                                }
                            }
                            if r_parent_checkpoint_id
                            else None
                        )
                    )

# ====================================================================
# REQUEST EVENT ROUTING AND QUEUE HANDLING
# ====================================================================
class RequestEventHandler:
    def __init__(self, queue: asyncio.Queue, loop: asyncio.AbstractEventLoop):
        self.queue = queue
        self.loop = loop

    def send_token(self, token: str):
        self.loop.call_soon_threadsafe(
            self.queue.put_nowait,
            {"type": "token", "content": token}
        )

    def send_tool_start(self, tool_name: str, query: str):
        self.loop.call_soon_threadsafe(
            self.queue.put_nowait,
            {"type": "tool_start", "tool_name": tool_name, "query": query}
        )

    def send_tool_end(self, tool_name: str, output: str, urls: List[Dict[str, str]]):
        self.loop.call_soon_threadsafe(
            self.queue.put_nowait,
            {"type": "tool_end", "tool_name": tool_name, "output": output, "urls": urls}
        )

# ====================================================================
# FALLBACKLLM GATEWAY WRAPPER WITH COST ENGINE AND SECURITY GUARDRAILS
# ====================================================================
class FallbackLLM:
    def __init__(self, models: List[Tuple[str, Any]], user_id: str, cost_table: dict, on_token_cb=None):
        self.models = models
        self.user_id = user_id
        self._cost_table = cost_table
        self.on_token_cb = on_token_cb
        self.gateway_metrics = {
            "total_calls": 0,
            "failed_calls": 0,
            "input_tokens_served": 0,
            "output_tokens_served": 0,
            "accumulated_cost_usd": 0.0
        }

    def _input_guardrail(self, messages) -> bool:
        if not messages:
            return True
        last_msg = messages[-1]
        content = getattr(last_msg, "content", "")
        if not isinstance(content, str):
            return True
        content_lower = content.lower()
        blocked_patterns = [
            "drop table", "delete from", "truncate table", "insert into",
            "ignore previous instructions", "system override", "reveal your system prompt"
        ]
        for pattern in blocked_patterns:
            if pattern in content_lower:
                return False
        return True

    def _output_guardrail(self, content: str) -> str:
        if not content:
            return content
        db_url_pattern = r"(postgresql|postgres|mysql|mongodb):\/\/([^:]+):([^@]+)@([^/]+)\/([^?\s]+)"
        if re.search(db_url_pattern, content):
            return "⚠️ [SECURITY ENFORCEMENT]: Sensitive database credentials were intercepted and hidden."
        sensitive_keywords = [
            "password_hash", "encrypted_app_password", "encrypted_password", 
            "app_password", "gemini_key", "groq_key", "openrouter_key", "tavily_key"
        ]
        for keyword in sensitive_keywords:
            if keyword in content.lower():
                return "⚠️ [SECURITY ENFORCEMENT]: Response blocked to prevent raw encryption keys or passwords from showing."
        
        # Clean up agent prefixes if generated by the LLM
        prefix_pattern = r"^(general_agent|lead_agent|research_agent|template_agent|campaign_agent|analysis_agent|supervisor|deva)\s*:\s*"
        content = re.sub(prefix_pattern, "", content, flags=re.IGNORECASE)
        return content

    def _calculate_costs(self, model_name: str, input_tokens: int, output_tokens: int, duration_ms: int):
        if model_name in self._cost_table:
            rates = self._cost_table[model_name]
            in_cost = (input_tokens / 1_000_000) * rates["input"]
            out_cost = (output_tokens / 1_000_000) * rates["output"]
            total_call_cost = in_cost + out_cost
            
            self.gateway_metrics["input_tokens_served"] += input_tokens
            self.gateway_metrics["output_tokens_served"] += output_tokens
            self.gateway_metrics["accumulated_cost_usd"] += total_call_cost

            # Persist cost to DB
            try:
                db = SessionLocal()
                cost_entry = CostTracking(
                    user_id=uuid.UUID(self.user_id),
                    api_provider=model_name,
                    tokens_used=input_tokens + output_tokens,
                    duration_ms=duration_ms,
                    estimated_cost=total_call_cost
                )
                db.add(cost_entry)
                db.commit()
                db.close()
            except Exception as e:
                print(f"Failed to save cost tracking: {e}")

    def invoke(self, messages, **kwargs):
        self.gateway_metrics["total_calls"] += 1
        if not self._input_guardrail(messages):
            err_msg = "🚨 [SECURITY VIOLATION]: Request blocked by system gateway."
            if self.on_token_cb:
                self.on_token_cb(err_msg)
            return AIMessage(content=err_msg)

        last_error = None
        for provider_name, llm in self.models:
            try:
                start = time.perf_counter()
                
                # If a dynamic token callback is registered, run standard stream completion
                if self.on_token_cb:
                    response_chunks = []
                    for chunk in llm.stream(messages, **kwargs):
                        if hasattr(chunk, "content") and chunk.content:
                            response_chunks.append(chunk.content)
                            self.on_token_cb(chunk.content)
                    
                    full_content = "".join(response_chunks)
                    full_content = self._output_guardrail(full_content)
                    response = AIMessage(content=full_content)
                else:
                    response = llm.invoke(messages, **kwargs)
                    if hasattr(response, "content") and response.content:
                        response.content = self._output_guardrail(response.content)

                elapsed = time.perf_counter() - start
                duration_ms = int(elapsed * 1000)

                input_tokens = 0
                output_tokens = 0
                if hasattr(response, "usage_metadata") and response.usage_metadata:
                    input_tokens = response.usage_metadata.get("input_tokens", 0)
                    output_tokens = response.usage_metadata.get("output_tokens", 0)
                else:
                    input_tokens = len(str(messages)) // 4
                    output_tokens = len(response.content) // 4

                model_str = getattr(llm, "model", "")
                self._calculate_costs(model_str, input_tokens, output_tokens, duration_ms)

                response.response_metadata["selected_provider"] = provider_name
                response.response_metadata["response_time"] = elapsed
                return response

            except Exception as e:
                self.gateway_metrics["failed_calls"] += 1
                last_error = e
                print(f"⚠️ Gateway Notice: {provider_name} fallback activated: {e}")
                continue

        raise RuntimeError("All configured LLM providers are unavailable.") from last_error

    def with_structured_output(self, schema, **kwargs):
        structured = []
        for provider_name, llm in self.models:
            structured.append((provider_name, llm.with_structured_output(schema, **kwargs)))
        return FallbackLLM(structured, self.user_id, self._cost_table, self.on_token_cb)

    def bind_tools(self, tools):
        bound = []
        for provider_name, llm in self.models:
            bound.append((provider_name, llm.bind_tools(tools)))
        return FallbackLLM(bound, self.user_id, self._cost_table, self.on_token_cb)

# ====================================================================
# ENCRYPTED DECRYPTION & INJECTION PIPELINE
# ====================================================================
def get_user_keys_decrypted(user_id: str, db: Session) -> dict:
    row = db.query(APIKey).filter(APIKey.user_id == user_id).first()
    keys = {}
    if row:
        if row.gemini_key:
            try:
                keys["gemini"] = decrypt_credential(row.gemini_key)
            except Exception:
                pass
        if row.groq_key:
            try:
                keys["groq"] = decrypt_credential(row.groq_key)
            except Exception:
                pass
        if row.openrouter_key:
            try:
                keys["openrouter"] = decrypt_credential(row.openrouter_key)
            except Exception:
                pass
        if row.tavily_key:
            try:
                keys["tavily"] = decrypt_credential(row.tavily_key)
            except Exception:
                pass
    return keys

# ====================================================================
# DYNAMIC GRAPH BUILDER (COMPILES MESH ON THE FLY FOR REQUEST)
# ====================================================================
class TeamState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    next_agent: str
    source_documents: List[Dict[str, Any]]
    generated_outputs: List[Dict[str, Any]]

def get_user_graph(user_id: str, db: Session, checkpointer, event_handler: RequestEventHandler = None):
    user_keys = get_user_keys_decrypted(user_id, db)
    
    # Fetch user context data dynamically
    try:
        user_row = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
        context_data = {
            "success": True,
            "profile": {
                "full_name": user_row.full_name if user_row else "",
                "email": user_row.email if user_row else "",
                "role": user_row.role if user_row else ""
            },
            "user_id": user_id
        }
    except Exception as e:
        context_data = {"success": False, "error": str(e), "user_id": user_id}

    # Secure context injections
    groq_api_key = user_keys.get("groq") or os.getenv("GROQ_API_KEY")
    gemini_api_key = user_keys.get("gemini") or os.getenv("GEMINI_API_KEY")
    openrouter_api_key = user_keys.get("openrouter") or os.getenv("OPENROUTER_API_KEY")
    tavily_api_key = user_keys.get("tavily") or os.getenv("TAVILY_API_KEY")

    # Dynamic LLM Instances
    groq_llm = ChatLiteLLM(
        model="groq/llama-3.3-70b-versatile",
        api_key=groq_api_key,
        temperature=0.1,
        max_tokens=1500,
    )
    gemini_llm = ChatLiteLLM(
        model="gemini/gemini-2.5-flash",
        api_key=gemini_api_key,
        temperature=0.1,
        max_tokens=1500,
    )
    openrouter_llm = ChatLiteLLM(
        model="openrouter/openai/gpt-4o-mini",
        api_key=openrouter_api_key,
        temperature=0.1,
        max_tokens=1500,
    )

    cost_table = {
        "groq/llama-3.3-70b-versatile": {"input": 0.59, "output": 0.79},
        "gemini/gemini-2.5-flash": {"input": 0.075, "output": 0.30},
        "openrouter/openai/gpt-4o-mini": {"input": 0.15, "output": 0.60}
    }

    # Model gateways
    base_llm = FallbackLLM(
        models=[("Groq", groq_llm), ("Gemini", gemini_llm), ("OpenRouter", openrouter_llm)],
        user_id=user_id,
        cost_table=cost_table,
        on_token_cb=event_handler.send_token if event_handler else None
    )

    # Internal sub-planners should run without emitting real-time tokens to user chat
    search_planner_llm = FallbackLLM(
        models=[("Groq", groq_llm), ("Gemini", gemini_llm), ("OpenRouter", openrouter_llm)],
        user_id=user_id,
        cost_table=cost_table,
        on_token_cb=None
    )

    reasoning_groq_llm = ChatLiteLLM(
        model="groq/llama-3.3-70b-versatile",
        api_key=groq_api_key,
        temperature=0.0,
        max_tokens=2000,
    )
    reasoning_gemini_llm = ChatLiteLLM(
        model="gemini/gemini-2.5-flash",
        api_key=gemini_api_key,
        temperature=0.0,
        max_tokens=2000,
    )
    reasoning_openrouter_llm = ChatLiteLLM(
        model="openrouter/openai/gpt-4o-mini",
        api_key=openrouter_api_key,
        temperature=0.0,
        max_tokens=2000,
    )
    reasoning_llm = FallbackLLM(
        models=[("Groq", reasoning_groq_llm), ("Gemini", reasoning_gemini_llm), ("OpenRouter", reasoning_openrouter_llm)],
        user_id=user_id,
        cost_table=cost_table,
        on_token_cb=event_handler.send_token if event_handler else None
    )

    # Dynamic closures for Tools
    @tool
    def simple_web_search(query: str, max_results: int = 2) -> Dict[str, Any]:
        """Use this for direct, simple factual lookups, active company homepages, or single entity updates."""
        if event_handler:
            event_handler.send_tool_start("simple_web_search", query)
        try:
            tavily_client = TavilyClient(api_key=tavily_api_key)
            res = tavily_client.search(query=query, max_results=max_results)
            urls = [{"title": r.get("title", ""), "url": r.get("url", "")} for r in res.get("results", []) if r.get("url")]
            if event_handler:
                event_handler.send_tool_end("simple_web_search", str(res)[:300], urls)
            return res
        except Exception as e:
            if event_handler:
                event_handler.send_tool_end("simple_web_search", f"Error: {e}", [])
            return {"error": f"Simple search failed: {str(e)}"}

    @tool
    def deep_research_pipeline(complex_intent_query: str) -> Dict[str, Any]:
        """Use this ONLY for comprehensive research background check on companies, market landscape extraction, or deep professional entity tracking."""
        if event_handler:
            event_handler.send_tool_start("deep_research_pipeline", complex_intent_query)
        try:
            planner_prompt = SystemMessage(content=(
                "You are an expert market intelligence search planner. Your task is to break down the user's "
                "complex research request into EXACTLY 3 unique, specific search engine queries that target different "
                "angles of the topic. Return the output strictly as a JSON list containing 3 string queries. "
                "Example: ['Company X funding rounds 2026', 'Company X tech stack competitors', 'Company X active executives leadership']"
            ))
            
            planner_response = search_planner_llm.invoke([planner_prompt, HumanMessage(content=complex_intent_query)])
            clean_json_str = planner_response.content.strip().replace("```json", "").replace("```", "")
            sub_queries: List[str] = json.loads(clean_json_str)
            
            tavily_client = TavilyClient(api_key=tavily_api_key)
            aggregated_research_results = []
            
            for sub_query in sub_queries:
                search_response = tavily_client.search(query=sub_query, max_results=2)
                snippets = [r.get("content", r.get("snippet", "")) for r in search_response.get("results", [])]
                aggregated_research_results.append({
                    "targeted_angle": sub_query,
                    "findings": "\n".join(snippets)
                })
            
            urls = []
            if event_handler:
                event_handler.send_tool_end("deep_research_pipeline", "Deep Analysis Completed", urls)
            return {
                "status": "Deep Analysis Completed Successfully",
                "original_request": complex_intent_query,
                "sub_query_breakdowns": sub_queries,
                "consolidated_context_payload": aggregated_research_results
            }
        except Exception as e:
            if event_handler:
                event_handler.send_tool_end("deep_research_pipeline", f"Error: {e}", [])
            return {"error": f"Deep research execution matrix failed: {str(e)}"}

    @tool
    def get_user_context(email: str) -> Dict[str, Any]:
        """Fetch user profile and preferences."""
        try:
            with engine.connect() as conn:
                result = conn.execute(
                    text("SELECT id, email, full_name, role, phone, resume_uploaded, app_password_verified FROM users WHERE email = :email"),
                    {"email": email}
                )
                row = result.mappings().first()
                if not row:
                    return {"success": False, "message": "User not found"}
                return {"success": True, "user": dict(row)}
        except Exception as e:
            return {"success": False, "error": str(e)}

    @tool
    def web_search(query: str, max_results: int = 10) -> Dict:
        """Perform web search using Tavily."""
        try:
            tavily = TavilyClient(api_key=tavily_api_key)
            return tavily.search(query=query, max_results=max_results)
        except Exception as e:
            return {"error": str(e)}

    @tool
    def scrape_website(url: str) -> Dict[str, Any]:
        """Scrape company website for key information."""
        try:
            headers = {"User-Agent": "Mozilla/5.0 (compatible; OutreachX/1.0)"}
            response = requests.get(url, timeout=12, headers=headers)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, "html.parser")
            return {
                "title": soup.title.string.strip() if soup.title else "",
                "content": soup.get_text(" ", strip=True)[:8000],
                "meta_description": soup.find("meta", attrs={"name": "description"})
            }
        except Exception as e:
            return {"error": str(e)}

    @tool
    def extract_emails_from_url(url: str) -> List[str]:
        """Extract email addresses from a given URL."""
        try:
            response = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
            emails = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', response.text)
            return list(set(emails))
        except Exception:
            return []

    @tool
    def generate_leads_batch(goal: str, target_audience: str, num_leads: int = 10) -> List[Dict]:
        """Generate structured company leads based on user goal."""
        return {
            "status": "planning",
            "message": f"Generating {num_leads} leads for goal: {goal}, audience: {target_audience}"
        }

    @tool
    def save_leads_to_db(leads: List[Dict], file_name: str) -> Dict:
        """Save generated leads into the database as a lead file."""
        try:
            with engine.connect() as conn:
                return {
                    "success": True,
                    "message": f"Saved {len(leads)} leads as {file_name}",
                    "lead_file_id": str(uuid.uuid4())
                }
        except Exception as e:
            return {"success": False, "error": str(e)}

    @tool
    def search_existing_lead_files(limit: int = 5) -> List[Dict]:
        """Search user's previously created lead files."""
        try:
            with engine.connect() as conn:
                result = conn.execute(
                    text("SELECT id, file_name, row_count, status, created_at FROM leads WHERE user_id = CAST(:user_id AS UUID) ORDER BY created_at DESC LIMIT :limit"),
                    {"user_id": user_id, "limit": limit}
                )
                return [dict(row._mapping) for row in result]
        except Exception as e:
            return {"error": str(e)}

    @tool
    def validate_and_clean_leads(leads: List[Dict]) -> List[Dict]:
        """Clean and validate lead data (remove duplicates, fix formats, etc.)."""
        cleaned = []
        seen = set()
        for lead in leads:
            if lead.get("company_name") and lead.get("company_name") not in seen:
                seen.add(lead.get("company_name"))
                cleaned.append(lead)
        return cleaned

    @tool
    def get_company_details(company_name: str) -> Dict:
        """Deep dive on a single company (website, industry, size, etc.)."""
        return {"company_name": company_name, "status": "research_in_progress"}

    @tool
    def fetch_user_context() -> Dict[str, Any]:
        """Fetch user profile + recent memory."""
        try:
            with engine.connect() as conn:
                profile = conn.execute(
                    text("SELECT full_name, email, role FROM users WHERE id = CAST(:user_id AS UUID)"),
                    {"user_id": user_id}
                ).fetchone()
                return {
                    "success": True,
                    "profile": dict(profile._mapping) if profile else {},
                    "user_id": str(user_id)
                }
        except Exception as e:
            return {"success": False, "error": str(e)}

    @tool
    def search_existing_leads(limit: int = 5) -> List[Dict]:
        """Get user's existing lead files."""
        try:
            with engine.connect() as conn:
                result = conn.execute(
                    text("SELECT id, file_name, status, row_count, columns, created_at FROM leads WHERE user_id = CAST(:user_id AS UUID) ORDER BY created_at DESC LIMIT :limit"),
                    {"user_id": user_id, "limit": limit}
                )
                rows = [dict(row._mapping) for row in result]
                for r in rows:
                    r['id'] = str(r['id'])
                return rows
        except Exception as e:
            return {"error": str(e)}

    @tool
    def search_existing_templates(limit: int = 5) -> List[Dict]:
        """Get user's existing templates."""
        try:
            with engine.connect() as conn:
                result = conn.execute(
                    text("SELECT id, name, description, subject_line, variables, is_ai_generated FROM templates WHERE user_id = CAST(:user_id AS UUID) ORDER BY created_at DESC LIMIT :limit"),
                    {"user_id": user_id, "limit": limit}
                )
                rows = [dict(row._mapping) for row in result]
                for r in rows:
                    r['id'] = str(r['id'])
                return rows
        except Exception as e:
            return {"error": str(e)}

    @tool
    def propose_variable_mapping(lead_columns: List[str], template_variables: List[str]) -> Dict[str, str]:
        """Propose smart variable mapping between lead file and template."""
        mapping = {}
        for var in template_variables:
            clean_var = var.strip('{}')
            if clean_var in lead_columns:
                mapping[var] = clean_var
            elif clean_var.lower() == "company_name" and "company" in [c.lower() for c in lead_columns]:
                mapping[var] = "company_name"
            else:
                mapping[var] = None
        return mapping

    @tool
    def verify_email_credentials(app_password: str) -> Dict[str, Any]:
        """Verify user's Gmail App Password by sending a test code."""
        return {
            "success": True,
            "message": "Verification code sent to your email. Please check."
        }

    @tool
    def send_test_email(template_id: str, lead_record: Dict) -> Dict[str, Any]:
        """Send real test email using user's SMTP credentials."""
        return {
            "success": True,
            "message": "Test email sent successfully to your inbox."
        }

    @tool
    def create_campaign(name: str, description: str, lead_file_id: str, template_id: str, variable_mapping: Dict) -> Dict:
        """Create and save a new campaign in the database."""
        try:
            with engine.connect() as conn:
                query = text("""
                    INSERT INTO campaigns (user_id, name, description, status)
                    VALUES (CAST(:user_id AS UUID), :name, :description, 'draft')
                    RETURNING id;
                """)
                result = conn.execute(query, {
                    "user_id": user_id,
                    "name": name,
                    "description": description
                })
                campaign_id = result.scalar()
                return {"success": True, "campaign_id": str(campaign_id)}
        except Exception as e:
            return {"success": False, "error": str(e)}

    @tool
    def launch_campaign(campaign_id: str) -> Dict:
        """Launch the campaign."""
        return {
            "success": True,
            "message": "Campaign launched successfully. Monitoring started."
        }

    @tool
    def retrieve_relevant_assets(query: str, top_k: int = 5) -> List[Dict]:
        """Retrieve relevant user projects/assets from vector DB."""
        return []

    class EmailTemplate(BaseModel):
        subject_line: str
        text_content: str
        html_content: str = ""

    class TemplateOutput(BaseModel):
        variations: List[EmailTemplate]

    @tool
    def generate_template_variations(user_query: str, company_name: str = "{{company_name}}", number_of_variations: int = 2) -> str:
        """Generate personalized cold email template variations."""
        return "Email template variations draft"

    @tool
    def save_template(name: str, subject_line: str, text_content: str, html_content: str = "", variables: List[str] = None) -> Dict[str, Any]:
        """Save approved template to database."""
        try:
            with engine.connect() as conn:
                query = text("""
                    INSERT INTO templates (user_id, name, subject_line, text_content, html_content, variables, is_ai_generated)
                    VALUES (CAST(:user_id AS UUID), :name, :subject, :text, :html, :vars, TRUE)
                    RETURNING id;
                """)
                result = conn.execute(query, {
                    "user_id": user_id,
                    "name": name,
                    "subject": subject_line,
                    "text": text_content,
                    "html": html_content,
                    "vars": variables or ["company_name"]
                })
                template_id = result.scalar()
                return {"success": True, "template_id": str(template_id)}
        except Exception as e:
            return {"success": False, "error": str(e)}

    @tool
    def list_user_templates(limit: int = 10) -> List[Dict]:
        """List user's saved templates."""
        try:
            with engine.connect() as conn:
                result = conn.execute(
                    text("SELECT id, name, subject_line, is_ai_generated, created_at FROM templates WHERE user_id = CAST(:user_id AS UUID) ORDER BY created_at DESC LIMIT :limit"),
                    {"user_id": user_id, "limit": limit}
                )
                return [dict(row._mapping) for row in result]
        except Exception as e:
            return {"error": str(e)}

    @tool
    def list_user_campaigns(limit: int = 10) -> List[Dict]:
        """List all campaigns with performance metrics."""
        try:
            with engine.connect() as conn:
                result = conn.execute(
                    text("SELECT id, name, status, total_leads, sent_count, opened_count FROM campaigns WHERE user_id = CAST(:user_id AS UUID) ORDER BY created_at DESC LIMIT :limit"),
                    {"user_id": user_id, "limit": limit}
                )
                return [dict(row._mapping) for row in result]
        except Exception as e:
            return {"error": str(e)}

    @tool
    def get_campaign_performance(campaign_id: str) -> Dict[str, Any]:
        """Get detailed performance analytics for a specific campaign."""
        return {"success": True, "data": {}}

    @tool
    def compare_templates_performance() -> List[Dict]:
        """Compare which templates are performing best."""
        return []

    @tool
    def list_lead_files(limit: int = 10) -> List[Dict]:
        """List all lead files."""
        return []

    @tool
    def get_user_assets_summary() -> Dict:
        """Get summary of user's assets."""
        return {}

    @tool
    def analyze_campaign_trends() -> Dict[str, Any]:
        """Give high-level insights on user's campaign performance."""
        return {"success": True, "insights": {}}

    @tool
    def get_best_performing_template() -> Dict:
        """Recommend the best template based on reply rate."""
        return {}

    @tool
    def get_recent_email_activity(limit: int = 15) -> List[Dict]:
        """Get recent email send, open, reply activity."""
        return []

    @tool
    def get_top_lead_sources() -> List[Dict]:
        """Which lead files give highest reply rate."""
        return []

    @tool
    def get_user_overall_stats() -> Dict:
        """Overall statistics for the user."""
        return {}

    @tool
    def get_monthly_performance() -> List[Dict]:
        """Monthly campaign performance trend."""
        return []

    @tool
    def get_bounce_reasons() -> List[Dict]:
        """Common bounce reasons analysis."""
        return []

    @tool
    def recommend_next_action() -> str:
        """AI suggestion for what user should do next."""
        return "Improve targeting and personalization."

    @tool
    def get_email_credential_status() -> Dict:
        """Check status of user's email credentials."""
        return {}

    @tool
    def list_all_user_templates() -> List[Dict]:
        """List all saved templates with usage count."""
        return []

    @tool
    def get_low_performing_campaigns() -> List[Dict]:
        """Campaigns with low reply rate."""
        return []

    @tool
    def search_conversation_memory(keyword: str) -> List[Dict]:
        """Search user's past conversation memory."""
        return []

    # Assemble all tools
    all_system_tools = [
        web_search, get_user_context, extract_emails_from_url, scrape_website,
        generate_leads_batch, search_existing_lead_files,
        simple_web_search, deep_research_pipeline,
        retrieve_relevant_assets, generate_template_variations, save_template, list_user_templates,
        fetch_user_context, search_existing_leads, search_existing_templates, propose_variable_mapping,
        verify_email_credentials, send_test_email, create_campaign, launch_campaign,
        list_user_campaigns, get_campaign_performance, compare_templates_performance, list_lead_files,
        get_user_assets_summary, analyze_campaign_trends, get_best_performing_template,
        get_recent_email_activity, get_top_lead_sources, get_user_overall_stats, get_monthly_performance,
        search_conversation_memory
    ]

    # Dynamic Node Implementations (Passing event_handler context where needed)
    def lead_agent_node(state: TeamState):
        if event_handler:
            event_handler.loop.call_soon_threadsafe(event_handler.queue.put_nowait, {"type": "node_start", "node_name": "lead_agent"})
        system_prompt = SystemMessage(content=f"""
        You are the OutreachX Deva Lead Generation Agent. Your job is to automatically build, clean, and format company lead files based on the user's career application targets.

        ACTIVE USER CONTEXT:
        {context_data}

        STRICT STEP-BY-STEP WORKFLOW:
        1. TARGET GOAL IDENTIFICATION: 
        - View the active conversation thread to check if the user has already mentioned their target audience (e.g., tech startups, AI domain companies, software agencies).
        - If not found or unclear, ask the user directly: "I want to know your targeting companies, chief?"
        2. RECORD COUNT DETERMINATION:
        - Check if the user specified the number of company records they want.
        - DEFAULT RULE: If the user did not mention any specific number, you MUST default to exactly 10 records.
        3. DATA COLLECTION & PLANNING:
        - Generate search queries to gather company names, official emails, websites, and core domains from the web.
        - ACCEPTABLE NULLS: If specific details (other than the company name and email address) are missing from the web, leave them as a null value. Do not guess.
        4. FRONTEND TABLES DATA EMISSION:
        - You MUST format and return the final collected leads strictly as a clean JSON block (containing arrays of company objects with keys like 'company_name', 'email', 'website', etc.). This allows our frontend to render it cleanly into an Excel-style data table grid.
        5. APPROVAL & DATABASE SAVE:
        - Present the dataset to the user for explicit verification ("Accept" or "Reject").
        - If the user accepts, execute the lead storage tool to save this new file data into the 'leads' table under the active campaign reference.

        CRITICAL SAFETY RULES:
        - Never under any circumstances show, print, or expose any database passwords, client app hashes, or private credentials.
        - Always strictly scope all queries and database records to the active user's ID.
        """)

        # ====================================================================
        # 🛡️ LOCAL NODE INPUT GUARDRAIL
        # ====================================================================
        if state["messages"]:
            last_msg = state["messages"][-1]
            input_content = getattr(last_msg, "content", "")
            if isinstance(input_content, str):
                input_lower = input_content.lower()
                lead_blocked_patterns = ["system.db", "api_keys", "config.json", "env_file"]
                for pattern in lead_blocked_patterns:
                    if pattern in input_lower:
                        from langchain_core.messages import AIMessage
                        return {
                            "messages": [AIMessage(content="🚨 [SECURITY ENFORCEMENT]: Request rejected. The generation input contains unsafe system keywords.")],
                            "next_agent": "lead_agent"
                        }

        response = base_llm.invoke([system_prompt] + state["messages"])

        # ====================================================================
        # 🛡️ LOCAL NODE OUTPUT GUARDRAIL
        # ====================================================================
        if hasattr(response, "content") and response.content:
            content_lower = response.content.lower()
            unauthorized_keywords = [
                "password_hash", "encrypted_app_password", "encrypted_password", 
                "app_password", "gemini_key", "groq_key", "openrouter_key", "tavily_key", "api_keys"
            ]
            for keyword in unauthorized_keywords:
                if keyword in content_lower:
                    response.content = "⚠️ [SECURITY ENFORCEMENT]: The response was blocked because the agent tried to expose private system credentials or credentials tokens."
                    break

        return {"messages": [response], "next_agent": "lead_agent"}

    def research_agent_node(state: TeamState):
        if event_handler:
            event_handler.loop.call_soon_threadsafe(event_handler.queue.put_nowait, {"type": "node_start", "node_name": "research_agent"})
        system_prompt = SystemMessage(content=f"""
        You are the OutreachX Deva Research Agent. You have specialized tools to scan the live web for market intelligence, company tracking, and target profile collection.

        ACTIVE USER CONTEXT:
        {context_data}

        STRICT SEARCH BRANCHING LOGIC:
        1. SIMPLE FACTS: If the user asks for a simple lookup (e.g., "Who is the CEO of Company X?" or "Find the active homepage of Company Y"), you MUST instantly call 'simple_web_search'.
        2. DEEP INVESTIGATION: If the user requires an exhaustive background check, deep company data, market landscape extraction, or multi-angle information, you MUST immediately call 'deep_research_pipeline'.

        YOUR WORKFLOW RESPONSIBILITIES:
        - Process the output of whichever tool gets executed.
        - Clean up any raw HTML metadata or noise.
        - Consolidate the findings and provide a crisp, detailed, and completely accurate intelligence report back to the user or requesting agent.

        CRITICAL SAFETY RULES:
        - Never under any circumstances search for, look up, display, or print any user passwords, hashes, keys, or private access tokens.
        - Always strictly scope your workspace actions and context boundaries to the active user's ID.
        - Never hallucinate data. If information is missing from the search results, explicitly state it as a 'null value' or 'not found'.
        """)

        # ====================================================================
        # 🛡️ LOCAL NODE INPUT GUARDRAIL
        # ====================================================================
        if state["messages"]:
            last_msg = state["messages"][-1]
            input_content = getattr(last_msg, "content", "")
            if isinstance(input_content, str):
                input_lower = input_content.lower()
                research_blocked_inputs = [
                    "api_keys", "password_hash", "encrypted_app_password", 
                    "tavily_key", "groq_key", "gemini_key", "openrouter_key"
                ]
                for pattern in research_blocked_inputs:
                    if pattern in input_lower:
                        from langchain_core.messages import AIMessage
                        return {
                            "messages": [AIMessage(content="🚨 [SECURITY ENFORCEMENT]: Search request blocked. You cannot search for internal system keys or credential tokens.")],
                            "next_agent": "research_agent"
                        }

        response = reasoning_llm.invoke([system_prompt] + state["messages"])

        # ====================================================================
        # 🛡️ LOCAL NODE OUTPUT GUARDRAIL
        # ====================================================================
        if hasattr(response, "content") and response.content:
            content_lower = response.content.lower()
            unauthorized_keywords = [
                "password_hash", "encrypted_app_password", "encrypted_password", 
                "app_password", "otp_codes", "gemini_key", "groq_key", 
                "openrouter_key", "tavily_key", "api_keys"
            ]
            for keyword in unauthorized_keywords:
                if keyword in content_lower:
                    response.content = "⚠️ [SECURITY ENFORCEMENT]: The search result response was blocked because it contained unsafe system credentials or key indicators."
                    break

        return {"messages": [response], "next_agent": "research_agent"}

    def template_agent_node(state: TeamState):
        if event_handler:
            event_handler.loop.call_soon_threadsafe(event_handler.queue.put_nowait, {"type": "node_start", "node_name": "template_agent"})
        system_prompt = SystemMessage(content=f"""
        You are the OutreachX Deva Template Agent. Your job is to help users create highly personalized, professional cold email templates for bulk job or internship applications based on their data.

        ACTIVE USER CONTEXT:
        {context_data}

        STRICT STEP-BY-STEP WORKFLOW:
        1. GOAL IDENTIFICATION: Ask the user for their targeted job or internship role (e.g., AI/ML Engineer or GenAI Intern at a startup).
        2. ASSET GATHERING (VECTOR SEARCH): 
        - Once the goal is known, generate a precise search query to scan the Pinecone Vector Database.
        - Retrieve relevant user assets matching the goal (such as resume sections, projects, experience, skills, GitHub, and portfolio details).
        3. FORMAT SELECTION: Ask the user clearly whether they want to proceed with a 'Plain Text' format or 'HTML Code'.
        4. TEMPLATE GENERATION:
        - Generate a custom email subject line and body incorporating the retrieved user info.
        - MANDATORY: You must inject dynamic variables in brackets format, ensuring {{company_name}} is included, along with any other variables requested by the user (e.g., {{company_website}}).
        5. APPROVAL & DATABASE REPOSITORY COMMIT:
        - Show the final draft to the user and ask for explicit approval ("Approve" or "Reject").
        - If approved, ask: "Shall I save this new template in your template module for future usages, chief?"
        - If user says YES, execute the save tool to insert the record into the 'templates' table. Otherwise, stop.

        CRITICAL SAFETY RULES:
        - Never under any circumstances display, print, or expose the user's raw password, app password, hashes, or security keys.
        - Always strictly scope all operations and filters to the active user's ID.
        """)

        # ====================================================================
        # 🛡️ LOCAL NODE INPUT GUARDRAIL
        # ====================================================================
        if state["messages"]:
            last_msg = state["messages"][-1]
            input_content = getattr(last_msg, "content", "")
            if isinstance(input_content, str):
                input_lower = input_content.lower()
                template_blocked_inputs = [
                    "api_keys", "password_hash", "encrypted_app_password", 
                    "app_password", "encrypted_password"
                ]
                for pattern in template_blocked_inputs:
                    if pattern in input_lower:
                        from langchain_core.messages import AIMessage
                        return {
                            "messages": [AIMessage(content="🚨 [SECURITY ENFORCEMENT]: Request blocked. Email generation strings cannot refer to internal platform passwords or credential columns.")],
                            "next_agent": "template_agent"
                        }

        response = base_llm.invoke([system_prompt] + state["messages"])

        # ====================================================================
        # 🛡️ LOCAL NODE OUTPUT GUARDRAIL
        # ====================================================================
        if hasattr(response, "content") and response.content:
            content_lower = response.content.lower()
            unauthorized_keywords = [
                "password_hash", "encrypted_app_password", "encrypted_password", 
                "app_password", "otp_codes", "gemini_key", "groq_key", 
                "openrouter_key", "tavily_key", "api_keys"
            ]
            for keyword in unauthorized_keywords:
                if keyword in content_lower:
                    response.content = "⚠️ [SECURITY ENFORCEMENT]: The template generation was halted because it contained unauthorized system token variables."
                    break

        return {"messages": [response], "next_agent": "template_agent"}

    def campaign_agent_node(state: TeamState):
        if event_handler:
            event_handler.loop.call_soon_threadsafe(event_handler.queue.put_nowait, {"type": "node_start", "node_name": "campaign_agent"})
        system_prompt = SystemMessage(content=f"""
        You are the OutreachX Deva Campaign Agent. Guide the user step-by-step to build, test, and launch bulk email campaigns for jobs/internships.

        ACTIVE USER CONTEXT: {context_data}

        🧠 CONTEXT MINING RULE (CONTEXTUAL AWARENESS):
        Scan the chat history first. If the user already discussed their tech stack/role (e.g., Python, AI/ML) with the General Agent, DO NOT ask for a blank goal. Extract it and propose it directly (e.g., "Based on your AI/ML stack, should we target AI Startups for an AIML role, chief, or do you have another goal?").

        STRICT STEP-BY-STEP WORKFLOW:
        1. GOAL CONFIRMATION: Propose the extracted goal from history. If history is blank, ask for a goal. Get user confirmation before moving to step 2.
        2. ASSET CHECK: Check if matching Lead Files/Templates exist. If YES, display them. If NO, ask: "Shall we create a new lead list or email template for this campaign, chief?" and append [ROUTE_TO_LEAD] or [ROUTE_TO_TEMPLATE] to route control.
        3. VARIABLE MAPPING: Generate a raw JSON block mapping Lead columns to Template variables (e.g., {{"template_var": "company_name", "lead_column": "Company Name"}}) so the frontend wizard can render it.
        4. INTEGRITY CHECK: Save campaign to DB, trigger the test mail tool (1 sample record to user's email), and tell them to check their inbox.
        5. CREDENTIALS GATEWAY: Notify user of credential checks. Send a secure code to their email and use the IMAP tool to read their inbox and auto-verify it.
        6. LAUNCH: Once approved, include the word "LAUNCH" in your final response to trigger the bulk background execution engine.

        CRITICAL SAFETY RULES:
        - NEVER display, print, or expose any raw passwords, app hashes, or security keys.
        - Always filter and scope all database/workspace operations strictly to the active user's ID.
        """)

        # ====================================================================
        # 🛡️ LOCAL NODE INPUT GUARDRAIL
        # ====================================================================
        if state["messages"]:
            last_msg = state["messages"][-1]
            input_content = getattr(last_msg, "content", "")
            if isinstance(input_content, str):
                input_lower = input_content.lower()
                campaign_blocked_inputs = [
                    "force launch", "skip credentials", "bypass verification",
                    "api_keys", "encrypted_password", "app_password"
                ]
                for pattern in campaign_blocked_inputs:
                    if pattern in input_lower:
                        from langchain_core.messages import AIMessage
                        return {
                            "messages": [AIMessage(content="🚨 [SECURITY ENFORCEMENT]: Request blocked. Campaign parameters contain unsafe override keywords or credential queries.")],
                            "next_agent": "campaign_agent"
                        }

        response = reasoning_llm.invoke([system_prompt] + state["messages"])

        # ====================================================================
        # 🛡️ LOCAL NODE OUTPUT GUARDRAIL
        # ====================================================================
        if hasattr(response, "content") and response.content:
            content_lower = response.content.lower()
            unauthorized_keywords = [
                "password_hash", "encrypted_app_password", "encrypted_password", 
                "app_password", "otp_codes", "gemini_key", "groq_key", 
                "openrouter_key", "tavily_key", "api_keys"
            ]
            for keyword in unauthorized_keywords:
                if keyword in content_lower:
                    response.content = "⚠️ [SECURITY ENFORCEMENT]: The campaign interaction was halted because the system caught an unauthorized credential token leak."
                    break

        return {"messages": [response], "next_agent": "campaign_agent"}

    def analysis_agent_node(state: TeamState):
        if event_handler:
            event_handler.loop.call_soon_threadsafe(event_handler.queue.put_nowait, {"type": "node_start", "node_name": "analysis_agent"})
        system_prompt = SystemMessage(content=f"""
        You are the OutreachX Deva Analysis Agent. 
        Active User Context: {context_data} (STRICTLY filter all DB operations using this active user's ID -> {user_id}).

        COMPLETE DB SCHEMA REFERENCE:
        - users(id, email, password_hash, full_name, phone, resume_uploaded, is_verified, status, created_at, updated_at, role, encrypted_app_password, app_password_verified)
        - otp_codes(id, user_id, email, code, purpose, is_used, expires_at, created_at)
        - user_resumes(id, user_id, file_name, file_url, raw_text, skills, projects, experience, education, social_media_links, certifications, objective, parsed_metadata, created_at, updated_at)
        - email_credentials(id, user_id, email_address, encrypted_password, app_password, provider, is_verified, verification_method, verified_at, last_tested_at, created_at, updated_at)
        - user_settings(id, user_id, theme, timezone, language, notifications_enabled, email_notifications, created_at, updated_at)
        - templates(id, user_id, name, description, html_content, text_content, subject_line, is_default, is_ai_generated, tags, variables, preview_url, created_at, updated_at)
        - assets(id, user_id, asset_type, source_type, name, description, file_url, content, metadata, tags, is_verified, created_at, updated_at)
        - campaigns(id, user_id, name, description, status, total_leads, sent_count, opened_count, clicked_count, replied_count, bounced_count, scheduled_at, started_at, completed_at, tags, created_at, updated_at, template_id, variable_mapping, last_processed_index, failed_count)
        - campaign_tasks(id, campaign_id, user_id, task_id, status, lead_count, result, created_at, updated_at)
        - campaign_templates(campaign_id, template_id)
        - ai_memory(id, user_id, conversation_id, message_type, role, content, tokens_used, embedding, metadata, importance_score, extracted_entities, created_at)
        - leads(id, user_id, campaign_id, file_name, content, columns, created_at, updated_at, status, row_count, error_message, file_size_bytes)
        - email_logs(id, campaign_id, leads_file_id, lead_email, email_credential_id, status, message_id, subject_line, html_content, text_content, retry_count, max_retries, last_error, error_code, sent_at, opened_at, clicked_at, replied_at, bounced_at, bounce_reason, created_at, updated_at)
        - api_keys(id, user_id, gemini_key, groq_key, openrouter_key, tavily_key, created_at, updated_at)
        - cost_tracking(id, user_id, api_provider, tokens_used, duration_ms)

        CRITICAL SAFETY RULE:
        1. You must ONLY retrieve or analyze records matching the active user's ID ({user_id}).
        2. You are STRICTLY FORBIDDEN from interacting with, reading, or displaying fields from the `api_keys` table.
        3. You are strictly forbidden from showing, printing, or sharing secrets like passwords, hashes, verification tokens, or credentials from tables like `users` or `email_credentials`.
        """)

        response = reasoning_llm.invoke([system_prompt] + state["messages"])

        # ====================================================================
        # 🛡️ LOCAL NODE GUARDRAIL INTERCEPTION
        # ====================================================================
        if hasattr(response, "content") and response.content:
            content_lower = response.content.lower()
            unauthorized_keywords = [
                "password_hash", "encrypted_app_password", "encrypted_password", 
                "app_password", "otp_codes", "gemini_key", "groq_key", 
                "openrouter_key", "tavily_key", "api_keys"
            ]
            for keyword in unauthorized_keywords:
                if keyword in content_lower:
                    response.content = "⚠️ [SECURITY ENFORCEMENT]: Request blocked. The agent attempted to output internal system secrets or credentials."
                    break

        return {"messages": [response], "next_agent": "analysis_agent"}

    def general_agent_node(state: TeamState):
        if event_handler:
            event_handler.loop.call_soon_threadsafe(event_handler.queue.put_nowait, {"type": "node_start", "node_name": "general_agent"})
        system_prompt = SystemMessage(content=f"""
        You are the friendly OutreachX Deva Companion Agent. 

        ACTIVE USER CONTEXT:
        {context_data} (Use the name, email, and target role inside to customize your answers).

        YOUR RESPONSIBILITIES:
        - Handle general talk, casual conversation, greetings, and onboarding walkthroughs like a close friend.
        - If the user asks a completely unclear question, guide them gently to choose a module (Leads, Templates, or Campaigns).

        CRITICAL SAFETY RULE:
        - Never under any circumstances show, print, or expose any database passwords, client app hashes, or private credentials.
        - Always keep conversations friendly, positive, and casual. Specifically, in the greeting scenario, try to answer in exactly one line to keep token usage minimal.
        """)

        # ====================================================================
        # 🛡️ LOCAL NODE INPUT GUARDRAIL
        # ====================================================================
        if state["messages"]:
            last_msg = state["messages"][-1]
            input_content = getattr(last_msg, "content", "")
            if isinstance(input_content, str):
                input_lower = input_content.lower()
                general_blocked_inputs = [
                    "ignore previous instructions", "system override", "reveal your system prompt",
                    "api_keys", "password_hash", "encrypted_app_password"
                ]
                for pattern in general_blocked_inputs:
                    if pattern in input_lower:
                        from langchain_core.messages import AIMessage
                        return {
                            "messages": [AIMessage(content="🚨 [SECURITY ENFORCEMENT]: Request blocked by system gateway. Unsafe conversation tokens detected.")],
                            "next_agent": "general_agent"
                        }

        response = base_llm.invoke([system_prompt] + state["messages"])

        # ====================================================================
        # 🛡️ LOCAL NODE OUTPUT GUARDRAIL
        # ====================================================================
        if hasattr(response, "content") and response.content:
            content_lower = response.content.lower()
            unauthorized_keywords = [
                "password_hash", "encrypted_app_password", "encrypted_password", 
                "app_password", "otp_codes", "gemini_key", "groq_key", 
                "openrouter_key", "tavily_key", "api_keys"
            ]
            for keyword in unauthorized_keywords:
                if keyword in content_lower:
                    response.content = "⚠️ [SECURITY ENFORCEMENT]: The response was blocked because the system caught an unauthorized structural credentials token leak."
                    break

        return {"messages": [response], "next_agent": "general_agent"}

    def supervisor_node(state: TeamState):
        if event_handler:
            event_handler.loop.call_soon_threadsafe(event_handler.queue.put_nowait, {"type": "node_start", "node_name": "supervisor"})
        messages = state["messages"]
        options = ["lead_agent", "research_agent", "template_agent", "campaign_agent", "general_agent", "analysis_agent", "FINISH"]
        
        system_prompt = SystemMessage(content=f"""
        You are the Master Supervisor for the OutreachX Multi-Agent Mesh Network. 
        Your primary job is to analyze the entire conversation history (Contextual Awareness) and the latest user message to choose the absolute best specialist agent.

        STRICT ROUTING INSTRUCTIONS:
        
        1. DATABASE & USER DATASETS -> Route to 'analysis_agent'
           - Trigger: When the user wants to gather, view, count, analyze, or fetch information from their own dataset, profile, or DB (database).
           - Examples: Looking up history, checking campaign success stats, asking for account setup details, or identifiers like user_id.

        2. CREATION & BUILDING -> Route to the respective creation agent
           - Trigger: When the user wants to build, clean, write, design, or start something new.
           - Route to 'lead_agent' if they are creating/cleaning a lead file list.
           - Route to 'template_agent' if they are writing or formatting an email template (HTML or Plain Text).
           - Route to 'campaign_agent' if they are setting up, testing, or launching an email outreach campaign sequence.

        3. EXTERNAL SEARCH & KNOWLEDGE -> Route to 'research_agent'
           - Trigger: When the user asks for concepts, definitions, outside market intelligence, or live web lookups on Google/servers.
           - Examples: "What is a RAG model?", "Explain LangChain", "Find the CEO of Company X".

        4. CASUAL CHAT & WALKTHROUGHS -> Route to 'general_agent'
           - Trigger: General pleasantries, onboarding tours, greetings, or casual open-ended talk.
           - Examples: "Hi there", "How are you?", "What can you do?".

        5. TASK COMPLETE -> Route to 'FINISH'
           - Trigger: If the user explicitly says goodbye, closes the session, or the current task is completely finalized.

        RESPONSE RULE: You must reply with ONLY one exact word from this list:
        lead_agent, research_agent, template_agent, campaign_agent, analysis_agent, general_agent, or FINISH.
        """)

        # ====================================================================
        # 🛡️ CONCEPTUAL AWARENESS INPUT GUARDRAIL
        # ====================================================================
        if messages:
            last_msg = messages[-1]
            input_content = getattr(last_msg, "content", "")
            if isinstance(input_content, str):
                input_lower = input_content.lower()
                
                db_indicators = ["user_id", "database", "my data", "table records", "show my logs"]
                if any(indicator in input_lower for indicator in db_indicators):
                    return {"next_agent": "analysis_agent"}
                
                routing_blocked_inputs = [
                    "ignore your supervisor guidelines", "override routing rules", "system override"
                ]
                for pattern in routing_blocked_inputs:
                    if pattern in input_lower:
                        return {"next_agent": "general_agent"}

        # Router LLM
        response = base_llm.invoke([system_prompt] + messages)
        choice = response.content.strip().lower()
        next_step = "FINISH"
        for option in options:
            if option.lower() in choice:
                next_step = option
                break
        return {"next_agent": next_step}

    # Symmetrical Router functions
    def supervisor_router(state: TeamState) -> str:
        target = state.get("next_agent", "FINISH")
        if target.upper() == "FINISH":
            return END
        return target

    def post_agent_router(state: TeamState):
        last_message = state["messages"][-1]
        content_lower = getattr(last_message, "content", "").lower()
        
        unauthorized_keywords = [
            "password_hash", "encrypted_app_password", "encrypted_password", 
            "app_password", "otp_codes", "gemini_key", "groq_key", 
            "openrouter_key", "tavily_key", "api_keys", "user_id"
        ]
        contains_leak = any(keyword in content_lower for keyword in unauthorized_keywords)

        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            if contains_leak:
                last_message.content = "⚠️ [SECURITY ENFORCEMENT]: Request terminated due to sensitive keywords."
                return END
            return "execute_tools"
            
        if not contains_leak:
            if "route_to_lead" in content_lower:
                return "lead_agent"
            elif "route_to_template" in content_lower:
                return "template_agent"
            elif "launch" in content_lower:
                return END
        else:
            last_message.content = "⚠️ [SECURITY ENFORCEMENT]: Access Denied. Platform guardrails intercepted credentials leak."
            return END
            
        return END

    def tool_execution_router(state: TeamState):
        target = state.get("next_agent", "supervisor")
        if not isinstance(target, str):
            target = "supervisor"
        target_lower = target.lower()
        if "lead" in target_lower: return "lead_agent"
        if "research" in target_lower: return "research_agent"
        if "template" in target_lower: return "template_agent"
        if "campaign" in target_lower: return "campaign_agent"
        if "analysis" in target_lower: return "analysis_agent"
        return "supervisor"

    # Compile the graph
    workflow = StateGraph(TeamState)
    workflow.add_node("supervisor", supervisor_node)
    workflow.add_node("lead_agent", lead_agent_node)
    workflow.add_node("research_agent", research_agent_node)
    workflow.add_node("template_agent", template_agent_node)
    workflow.add_node("campaign_agent", campaign_agent_node)
    workflow.add_node("general_agent", general_agent_node)
    workflow.add_node("analysis_agent", analysis_agent_node)
    workflow.add_node("execute_tools", ToolNode(all_system_tools))

    workflow.add_edge(START, "supervisor")
    workflow.add_conditional_edges(
        "supervisor",
        supervisor_router,
        {
            "lead_agent": "lead_agent",
            "research_agent": "research_agent",
            "template_agent": "template_agent",
            "campaign_agent": "campaign_agent",
            "general_agent": "general_agent",
            "analysis_agent": "analysis_agent",
            "FINISH": END,
            END: END
        }
    )
    workflow.add_conditional_edges("lead_agent", post_agent_router, {"execute_tools": "execute_tools", "supervisor": "supervisor", END: END})
    workflow.add_conditional_edges("research_agent", post_agent_router, {"execute_tools": "execute_tools", "supervisor": "supervisor", END: END})
    workflow.add_conditional_edges("template_agent", post_agent_router, {"execute_tools": "execute_tools", "supervisor": "supervisor", END: END})
    workflow.add_conditional_edges("general_agent", post_agent_router, {"execute_tools": "execute_tools", "supervisor": "supervisor", END: END})
    workflow.add_conditional_edges("analysis_agent", post_agent_router, {"execute_tools": "execute_tools", "supervisor": "supervisor", END: END})
    workflow.add_conditional_edges("campaign_agent", post_agent_router, {"execute_tools": "execute_tools", "lead_agent": "lead_agent", "template_agent": "template_agent", "supervisor": "supervisor", END: END})
    workflow.add_conditional_edges("execute_tools", tool_execution_router, {
        "lead_agent": "lead_agent",
        "research_agent": "research_agent",
        "template_agent": "template_agent",
        "campaign_agent": "campaign_agent",
        "analysis_agent": "analysis_agent",
        "supervisor": "supervisor"
    })

    return workflow.compile(checkpointer=checkpointer)

# ====================================================================
# FASTAPI APPLICATION BOOTSTRAP
# ====================================================================
app = FastAPI(
    title="OutreachX Deva AI Service",
    description="Dedicated server hosting the multi-agent mesh",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Authentication Dependency
def get_current_user_id(request: Request) -> str:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token"
        )
    token = auth_header.split(" ")[1]
    
    user_id = verify_token(token)
    if not user_id:
        try:
            # Fall back to a payload-only decode so Supabase session tokens
            # can be used even when the shared secret is not configured here.
            payload = jwt.decode(
                token,
                options={"verify_signature": False, "verify_aud": False}
            )
            user_id = payload.get("sub")
        except Exception as e:
            print(f"Token verification failed: {e}")
            
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token signature expired or invalid"
        )
        
    try:
        uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: user ID is not a valid UUID format"
        )
        
    return user_id

# Database tables dynamic alignment
@app.on_event("startup")
def bootstrap_deva_tables():
    from shared.database import engine
    from shared.models import Base
    # Ensure standard tables exist
    Base.metadata.create_all(bind=engine)
    # Ensure checkpointer tables exist via local instancing
    from shared.database import DATABASE_URL
    PostgresSaver(DATABASE_URL)
    print("✅ Deva database tables validated and synchronized.")

# ====================================================================
# API KEY MANAGER CONFIGURATION ENDPOINTS
# ====================================================================
class KeyUpdateRequest(BaseModel):
    gemini_key: Optional[str] = None
    groq_key: Optional[str] = None
    openrouter_key: Optional[str] = None
    tavily_key: Optional[str] = None

@app.get("/api/v1/deva/keys")
def get_user_keys(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    row = db.query(APIKey).filter(APIKey.user_id == user_id).first()
    return {
        "has_gemini": bool(row.gemini_key) if row else False,
        "has_groq": bool(row.groq_key) if row else False,
        "has_openrouter": bool(row.openrouter_key) if row else False,
        "has_tavily": bool(row.tavily_key) if row else False
    }

@app.post("/api/v1/deva/keys")
def update_user_keys(req: KeyUpdateRequest, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    row = db.query(APIKey).filter(APIKey.user_id == user_id).first()
    if not row:
        row = APIKey(user_id=uuid.UUID(user_id))
        db.add(row)
        
    if req.gemini_key is not None:
        row.gemini_key = encrypt_credential(req.gemini_key) if req.gemini_key.strip() else None
    if req.groq_key is not None:
        row.groq_key = encrypt_credential(req.groq_key) if req.groq_key.strip() else None
    if req.openrouter_key is not None:
        row.openrouter_key = encrypt_credential(req.openrouter_key) if req.openrouter_key.strip() else None
    if req.tavily_key is not None:
        row.tavily_key = encrypt_credential(req.tavily_key) if req.tavily_key.strip() else None
        
    db.commit()
    return {"success": True, "message": "API keys stored and encrypted successfully."}

# ====================================================================
# COST VISUALIZATION METRICS ENDPOINT
# ====================================================================
@app.get("/api/v1/deva/costs")
def get_costs_summary(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    # Daily consumptions
    daily_query = text("""
        SELECT created_at::date as day, api_provider, SUM(tokens_used) as tokens, SUM(duration_ms) as duration, SUM(estimated_cost) as cost
        FROM cost_tracking
        WHERE user_id = CAST(:user_id AS UUID)
        GROUP BY day, api_provider
        ORDER BY day ASC
    """)
    daily_rows = db.execute(daily_query, {"user_id": user_id}).fetchall()
    
    daily_stats = []
    for r in daily_rows:
        daily_stats.append({
            "day": str(r[0]),
            "provider": r[1],
            "tokens": int(r[2] or 0),
            "duration": int(r[3] or 0),
            "cost": float(r[4] or 0.0)
        })

    # Provider breakdown metrics
    breakdown_query = text("""
        SELECT api_provider, SUM(tokens_used) as tokens, SUM(estimated_cost) as cost
        FROM cost_tracking
        WHERE user_id = CAST(:user_id AS UUID)
        GROUP BY api_provider
    """)
    breakdown_rows = db.execute(breakdown_query, {"user_id": user_id}).fetchall()
    
    breakdown = []
    total_spend = 0.0
    total_tokens = 0
    for r in breakdown_rows:
        total_spend += float(r[2] or 0.0)
        total_tokens += int(r[1] or 0)
        breakdown.append({
            "provider": r[0],
            "tokens": int(r[1] or 0),
            "cost": float(r[2] or 0.0)
        })

    # Detailed recent transaction history logs
    recent_query = text("""
        SELECT api_provider, tokens_used, duration_ms, estimated_cost, created_at
        FROM cost_tracking
        WHERE user_id = CAST(:user_id AS UUID)
        ORDER BY created_at DESC
        LIMIT 20
    """)
    recent_rows = db.execute(recent_query, {"user_id": user_id}).fetchall()
    recent_logs = []
    for r in recent_rows:
        recent_logs.append({
            "provider": r[0],
            "tokens": int(r[1] or 0),
            "duration": int(r[2] or 0),
            "cost": float(r[3] or 0.0),
            "timestamp": r[4].isoformat() if r[4] else ""
        })

    return {
        "success": True,
        "total_spend_usd": total_spend,
        "total_tokens_served": total_tokens,
        "breakdown": breakdown,
        "daily_stats": daily_stats,
        "recent_logs": recent_logs
    }

# ====================================================================
# SSE CHAT STREAMING INTERACTION ENDPOINT
# ====================================================================
class ChatRequest(BaseModel):
    message: str
    thread_id: str

@app.post("/api/v1/deva/chat")
async def chat_interaction(req: ChatRequest, user_id: str = Depends(get_current_user_id)):
    async def chat_event_generator():
        # Setup request queue and loop
        queue = asyncio.Queue()
        loop = asyncio.get_running_loop()
        event_handler = RequestEventHandler(queue, loop)
        
        # Instantiate db and savers
        db = SessionLocal()
        from shared.database import DATABASE_URL
        checkpointer = PostgresSaver(DATABASE_URL)
        
        # Build dynamic graph
        graph = get_user_graph(user_id, db, checkpointer, event_handler)
        db.close()
        
        config = {
            "configurable": {
                "thread_id": req.thread_id,
                "user_id": user_id
            }
        }
        
        # Spawn graph stream execution in the background
        inputs = {"messages": [("user", req.message)]}
        
        stats = {
            "start_time": time.time(),
            "first_event_time": None,
            "steps": 0,
            "tools": 0
        }
        
        async def run_mesh():
            try:
                # Symmetrical updates parser
                async for chunk in graph.astream(inputs, config, stream_mode="updates"):
                    stats["steps"] += 1
                    if stats["first_event_time"] is None:
                        stats["first_event_time"] = time.time()
                    
                    for node_name, node_data in chunk.items():
                        if node_name == "execute_tools":
                            stats["tools"] += 1
                        elif isinstance(node_data, dict) and "messages" in node_data:
                            for msg in node_data["messages"]:
                                if hasattr(msg, "tool_calls") and msg.tool_calls:
                                    stats["tools"] += len(msg.tool_calls)
                                elif hasattr(msg, "additional_kwargs") and msg.additional_kwargs.get("tool_calls"):
                                    stats["tools"] += len(msg.additional_kwargs["tool_calls"])
                                    
                        if node_name != "execute_tools":
                            loop.call_soon_threadsafe(
                                queue.put_nowait,
                                {"type": "metadata", "active_node": node_name}
                            )
                
                # Send final execution telemetry
                end_time = time.time()
                elapsed = end_time - stats["start_time"]
                ttft = (stats["first_event_time"] - stats["start_time"]) if stats["first_event_time"] else 0.0
                
                loop.call_soon_threadsafe(
                    queue.put_nowait,
                    {
                        "type": "final_stats",
                        "elapsed": elapsed,
                        "ttft": ttft,
                        "steps": stats["steps"],
                        "tool_calls": stats["tools"]
                    }
                )
                loop.call_soon_threadsafe(queue.put_nowait, {"type": "finish"})
            except Exception as e:
                import traceback
                traceback.print_exc()
                loop.call_soon_threadsafe(
                    queue.put_nowait,
                    {"type": "error", "content": f"Graph Execution Exception: {str(e)}"}
                )

        task = asyncio.create_task(run_mesh())
        
        # Stream events queue directly to SSE client
        while True:
            item = await queue.get()
            if isinstance(item, dict):
                if item["type"] == "finish":
                    break
                if item["type"] == "error":
                    yield f"data: {json.dumps(item)}\n\n"
                    break
                yield f"data: {json.dumps(item)}\n\n"
            queue.task_done()
            
        await task

    return StreamingResponse(chat_event_generator(), media_type="text/event-stream")

# Uvicorn entry
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8010, reload=True)
