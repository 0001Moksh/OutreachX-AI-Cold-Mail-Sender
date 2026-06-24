import os
import sys
import base64
import uuid
from types import ModuleType

# Mock pkg_resources to prevent Vercel python 3.12 setuptools ModuleNotFoundError
if "pkg_resources" not in sys.modules:
    pkg_resources_mock = ModuleType("pkg_resources")
    def mock_parse_version(version_str):
        try:
            from packaging.version import parse
            return parse(version_str)
        except ImportError:
            import re
            parts = [int(x) if x.isdigit() else x for x in re.split(r'(\d+)', version_str) if x]
            return tuple(parts)
    pkg_resources_mock.parse_version = mock_parse_version
    sys.modules["pkg_resources"] = pkg_resources_mock

from dotenv import load_dotenv

# Load environment variables prior to imports to prevent DB session crash
backend_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(backend_env_path):
    load_dotenv(backend_env_path, override=True)
else:
    load_dotenv()


# Adjust paths to import shared and deva modules
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)
if current_dir not in sys.path:
    sys.path.append(current_dir)

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from shared.database import get_db, SessionLocal
from shared.models import Lead, Asset, User
from deva.api.auth import get_current_user
from deva.services.llm_service import LLMService
from deva.agents.lead_agent import LeadAgent

app = FastAPI(
    title="OutreachX Deva Backend 2 - Leads & Assets (RAG)",
    description="Handles lead queries, file parsing, website crawling, and Pinecone vector database ingestion",
    version="1.0.0"
)

# CORS configuration
origins = ["*"]
allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
if allowed_origins_env:
    origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True if origins != ["*"] else False,
    allow_methods=["*"],
    allow_headers=["*"]
)

class ChatRequest(BaseModel):
    message: str
    conversation_id: str
    user_id: str
    chat_history: List[Dict[str, str]]

class ActionRequest(BaseModel):
    action: str
    payload: Dict[str, Any]
    user_id: str
@app.post("/chat")
async def chat_node(request: ChatRequest):
    """Execute lead search generation or RAG asset question lookup"""
    db = SessionLocal()
    try:
        user_id = request.user_id
        message = request.message
        
        # Check if the query refers to uploaded assets (resume, cv, portfolio, documents, github, project)
        import re
        asset_keywords = ["resume", r"\bcv\b", "portfolio", "document", "github", "asset", "uploaded", "project", "education", "experience"]
        is_asset_query = False
        message_lower = message.lower()
        for k in asset_keywords:
            if k.startswith(r"\b"):
                if re.search(k, message_lower):
                    is_asset_query = True
                    break
            elif k in message_lower:
                is_asset_query = True
                break
        
        if is_asset_query:
            from deva.services.vector_service import VectorService
            chunks = await VectorService.query_relevant_chunks(user_id, message, top_k=4)
            
            if chunks:
                context_str = "\n".join([f"- {c['text']} (Source: {c['metadata'].get('name', 'Asset')})" for c in chunks])
                system_prompt = f"You are Deva, the AI Operating System of OutreachX. Answer the user's question using the following retrieved document context:\n{context_str}"
                
                response = await LLMService.call_llm(
                    system_prompt=system_prompt,
                    user_message=message,
                    chat_history=request.chat_history,
                    json_output=False
                )
                return {
                    "response_message": response,
                    "actions": []
                }
        
        # Default to lead finder query logic
        lead_res = await LeadAgent.find_leads(
            db=db,
            user_id=user_id,
            search_request=message
        )
        return {
            "response_message": lead_res["message"],
            "actions": lead_res["actions"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@app.post("/actions")
async def execute_action(request: ActionRequest):
    """Process lead insertion, file uploading, and website crawling actions"""
    db = SessionLocal()
    try:
        user_id = request.user_id
        action_type = request.action
        payload = request.payload
        
        # 1. Create Lead File
        if action_type == "create_lead_file":
            file_name = payload.get("file_name", "Deva_Leads.csv")
            leads_list = payload.get("leads", [])
            
            if not leads_list:
                raise HTTPException(status_code=400, detail="No leads provided")
                
            columns = ["company_name", "contact_name", "email", "website", "location", "role"]
            
            new_lead_file = Lead(
                id=uuid.uuid4(),
                user_id=uuid.UUID(user_id) if isinstance(user_id, str) else user_id,
                file_name=file_name,
                content=leads_list,
                columns=columns
            )
            db.add(new_lead_file)
            db.commit()
            
            return {
                "success": True,
                "message": f"Saved prospect list to lead file: {file_name}",
                "data": {"leads_id": str(new_lead_file.id)}
            }
            
        # 2. Upload Asset Document (Resume/CV PDF/docx)
        elif action_type == "upload_asset":
            name = payload.get("name", "Asset")
            file_data = payload.get("file_data", "") # base64
            file_type = payload.get("file_type", "application/pdf")
            
            if not file_data:
                raise HTTPException(status_code=400, detail="Empty file upload payload")
                
            decoded = base64.b64decode(file_data)
            
            # Load parsers dynamically
            from backend.services.asset_parser import parse_pdf, parse_docx, parse_text
            text_content = ""
            if "pdf" in file_type.lower():
                text_content = parse_pdf(decoded)
            elif "docx" in file_type.lower() or "word" in file_type.lower():
                text_content = parse_docx(decoded)
            else:
                text_content = parse_text(decoded)
                
            if not text_content:
                raise HTTPException(status_code=400, detail="Unable to parse document text")
                
            new_asset = Asset(
                id=uuid.uuid4(),
                user_id=uuid.UUID(user_id) if isinstance(user_id, str) else user_id,
                asset_type="document",
                source_type="file",
                name=name,
                content=text_content,
                is_verified=True
            )
            db.add(new_asset)
            db.commit()
            
            # Chunk & embed in Pinecone index
            from langchain_text_splitters import CharacterTextSplitter
            text_splitter = CharacterTextSplitter(chunk_size=800, chunk_overlap=150)
            chunks = text_splitter.split_text(text_content)
            
            from deva.services.vector_service import VectorService
            await VectorService.upsert_vectors_batch(
                user_id=user_id,
                chunks=chunks,
                metadata_base={"type": "asset", "asset_id": str(new_asset.id), "name": name}
            )
            
            return {
                "success": True,
                "message": f"Successfully parsed and indexed asset '{name}'."
            }
            
        # 3. Submit Link (Crawling website with Tavily Search Fallback for LinkedIn URLs)
        elif action_type == "submit_link":
            url = payload.get("url", "")
            if not url:
                raise HTTPException(status_code=400, detail="Missing URL parameter")
                
            from backend.services.asset_parser import parse_website, parse_github_repo
            text_content = ""
            name = url
            
            if "github.com" in url.lower():
                token = os.getenv("GITHUB_TOKEN")
                text_content = parse_github_repo(url, token)
                name = f"GitHub: {url.rstrip('/').split('/')[-1]}"
            elif "linkedin.com" in url.lower():
                # LinkedIn anti-scraping bypass: query Google snippets via Tavily Search Tool
                from deva.tools.tavily_search import TavilySearchTool
                tavily = TavilySearchTool()
                username = url.rstrip('/').split('/')[-1]
                search_query = f"{username} linkedin profile experience summary info"
                results = await tavily.search(search_query, max_results=3)
                
                snippets = []
                for res in results:
                    snippets.append(res.get("content", ""))
                text_content = f"LinkedIn Crawl Fallback for URL: {url}\n\nSearch Snippets:\n" + "\n\n".join(snippets)
                name = f"LinkedIn Profile: {username}"
            else:
                text_content = parse_website(url)
                name = f"Webpage: {url}"
                
            if not text_content:
                raise HTTPException(status_code=400, detail="Failed to crawl URL link content")
                
            new_asset = Asset(
                id=uuid.uuid4(),
                user_id=uuid.UUID(user_id) if isinstance(user_id, str) else user_id,
                asset_type="link",
                source_type="url",
                name=name,
                content=text_content,
                is_verified=True
            )
            db.add(new_asset)
            db.commit()
            
            # Chunk & embed in Pinecone index
            from langchain_text_splitters import CharacterTextSplitter
            text_splitter = CharacterTextSplitter(chunk_size=800, chunk_overlap=150)
            chunks = text_splitter.split_text(text_content)
            
            from deva.services.vector_service import VectorService
            await VectorService.upsert_vectors_batch(
                user_id=user_id,
                chunks=chunks,
                metadata_base={"type": "asset", "asset_id": str(new_asset.id), "name": name}
            )
            
            return {
                "success": True,
                "message": f"Successfully crawled and indexed link '{name}'."
            }
            
        else:
            raise HTTPException(status_code=400, detail=f"Action '{action_type}' not supported by Backend 2")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.get("/health")
def health():
    return {"status": "healthy", "backend": 2}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
