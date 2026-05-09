# OutreachX AI Agent Workflow

This document explains the end-to-end workflow of the **Deva AI Agent** within the `agent-backend` directory, specifically detailing how it processes information from asset upload to final response generation.

## 1. Asset Upload & Vectorization
When a user uploads a knowledge source (PDFs, HTML, GitHub repo, or plain text) via the backend API:
- The text is extracted using various parsers.
- The extracted text is sent to the `vector_store.py` where it is chunked and embedded using text embedding models.
- The semantic vectors are stored in a **Pinecone** vector database with the `user_id` as metadata to ensure data isolation.
- The raw text and basic metadata are also saved in the local Postgres database.

## 2. User Message & State Initialization
When a user sends a message from the frontend chat interface, the request hits the `chat` endpoint in the agent backend.
- A LangGraph `AgentState` is initialized containing the user's message, `user_id`, and `conversation_id`.
- The user's prompt is saved into the long-term memory store (`ai_memory` table) for persistence and future context.

## 3. Intent Routing (`intent_router` node)
The message first passes through the `IntentRouter`:
- It uses a deterministic, zero-temperature LLM prompt (powered by `llama-3.3-70b-versatile` via Groq) to classify the user's intent.
- Intents include `query_assets`, `create_campaign`, `update_campaign`, `delete_operation`, `ui_generation`, and `general_chat`.
- The classified intent is attached to the state to guide the agent's behavior.

## 4. Context Retrieval (`context_retriever` node)
Before generating an answer, the agent gathers the user's current working context:
- It fetches recent assets, templates, campaigns, and leads from the database using `build_context_bundle`.
- This ensures the LLM is always aware of the user's existing setup without needing to query for basic dashboard stats.

## 5. Main Agent Processing (`agent` node)
The core agent node receives the state (with intent and context):
- The LLM (`ChatGroq`) evaluates the user prompt against the system instructions and provided context.
- It has access to several **tools**, such as:
  - `query_assets_hybrid`: Performs a semantic search on the Pinecone vector store to find specific answers inside uploaded assets.
  - `create_campaign_tool`, `delete_operation_tool`: Capable of mutating state (always asks for explicit confirmation before executing).
  - `get_user_templates`, `get_user_leads`: Read tools to fetch detailed lists.
  
## 6. Tool Execution (`tools` node)
- If the LLM decides to call a tool (for example, using `query_assets_hybrid` to search an uploaded document), the graph transitions to the `tools` node.
- The tool executes (e.g., retrieving semantic matches from Pinecone) and returns the payload back to the `agent` node.
- The `agent` node uses this new information to formulate a comprehensive answer.

## 7. Output Formatting (`formatter` node)
Once the LLM generates its final text:
- The graph transitions to the `formatter_node`.
- It parses the LLM's response, extracting a structured JSON object containing:
  - `message`: The conversational text response.
  - `actions`: UI actions to trigger on the frontend (like opening a modal).
  - `suggested_prompts`: Follow-up questions for the user to easily click.
  
## 8. Final Response
- The structured response is returned to the HTTP client.
- The assistant's response is appended to the long-term memory store.
- The frontend renders the chat message, displays UI widgets if requested, and provides the suggested follow-ups.
