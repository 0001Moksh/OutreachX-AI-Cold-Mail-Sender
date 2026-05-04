"""
AI & RAG System for OutreachX
Implements conversational AI with memory using LangChain and vector embeddings
"""

import os
import json
from typing import Optional, List, Dict, Any
from datetime import datetime
import asyncio
import httpx
from langchain_groq import ChatGroq
from langchain_core.embeddings import Embeddings
from langchain_community.vectorstores import Pinecone
from langchain_classic.memory import ConversationBufferMemory
from langchain_classic.chains import ConversationalRetrievalChain
from langchain_text_splitters import CharacterTextSplitter
import pinecone
from pydantic import BaseModel


class CohereRemoteEmbeddings(Embeddings):
    """Remote embedding client backed by Cohere's managed API."""

    def __init__(self, api_key: str, model: str, output_dimension: int = 1536):
        self.api_key = api_key
        self.model = model
        self.output_dimension = output_dimension
        self.base_url = "https://api.cohere.com/v2/embed"

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return self._embed(texts, input_type="search_document")

    def embed_query(self, text: str) -> List[float]:
        return self._embed([text], input_type="search_query")[0]

    def _embed(self, texts: List[str], input_type: str) -> List[List[float]]:
        if not self.api_key:
            raise ValueError("COHERE_API_KEY must be set")

        payload = {
            "model": self.model,
            "input_type": input_type,
            "texts": texts,
            "output_dimension": self.output_dimension,
            "embedding_types": ["float"],
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        with httpx.Client(timeout=60.0) as client:
            response = client.post(self.base_url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()

        embeddings = data.get("embeddings", {}).get("float")
        if not embeddings:
            raise ValueError("Cohere embedding response did not include float embeddings")

        return embeddings


class ChatMessage(BaseModel):
    """Chat message structure"""
    role: str  # "user" or "assistant"
    content: str
    timestamp: Optional[datetime] = None


class ConversationContext(BaseModel):
    """Context for conversation"""
    resume_content: Optional[str] = None
    assets_content: Optional[str] = None
    leads_data: Optional[str] = None
    templates_data: Optional[str] = None
    previous_messages: List[ChatMessage] = []


class OutreachXAI:
    """AI system for OutreachX with RAG capabilities"""
    
    def __init__(self):
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.groq_model = os.getenv("GROQ_MODEL", "llama-3.1-70b-versatile")
        self.groq_temperature = float(os.getenv("GROQ_TEMPERATURE", "0.7"))
        self.cohere_api_key = os.getenv("COHERE_API_KEY")
        self.cohere_embedding_model = os.getenv("COHERE_EMBED_MODEL", "embed-v4.0")
        self.cohere_output_dimension = int(os.getenv("COHERE_OUTPUT_DIMENSION", "1536"))
        self.pinecone_api_key = os.getenv("PINECONE_API_KEY")
        self.pinecone_env = os.getenv("PINECONE_ENV", "us-west1-gcp")
        self.pinecone_index = os.getenv("PINECONE_INDEX", "outreachx")
        
        # Initialize LangChain components
        self.llm = ChatGroq(
            model_name=self.groq_model,
            temperature=self.groq_temperature,
            groq_api_key=self.groq_api_key
        )
        
        self.embeddings = CohereRemoteEmbeddings(
            api_key=self.cohere_api_key,
            model=self.cohere_embedding_model,
            output_dimension=self.cohere_output_dimension,
        )
        
        # Initialize Pinecone
        try:
            pinecone.init(
                api_key=self.pinecone_api_key,
                environment=self.pinecone_env
            )
        except:
            pass  # Already initialized
    
    def create_user_context_embedding(
        self,
        user_id: str,
        resume_data: Dict[str, Any],
        assets: List[str],
        templates: List[str]
    ) -> str:
        """Create and index user context for RAG"""
        
        # Build context document
        context_doc = f"""
        User Resume:
        {json.dumps(resume_data, indent=2)}
        
        Assets:
        {json.dumps(assets, indent=2)}
        
        Templates:
        {json.dumps(templates, indent=2)}
        """
        
        # Split and embed
        text_splitter = CharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        docs = text_splitter.split_text(context_doc)
        
        # Create embeddings and store in Pinecone
        namespace = f"user_{user_id}"
        
        for i, doc in enumerate(docs):
            embedding = self.embeddings.embed_query(doc)
            pinecone.Index(self.pinecone_index).upsert(
                vectors=[(
                    f"{user_id}_{i}",
                    embedding,
                    {"text": doc, "user_id": user_id}
                )],
                namespace=namespace
            )
        
        return namespace
    
    async def chat(
        self,
        user_id: str,
        message: str,
        context: ConversationContext,
        conversation_id: str
    ) -> Dict[str, Any]:
        """
        Process user message and return AI response
        """
        try:
            # Get user's context namespace
            namespace = f"user_{user_id}"
            
            # Create RAG chain
            memory = ConversationBufferMemory(
                memory_key="chat_history",
                return_messages=True
            )
            
            # Add previous messages to memory
            for msg in context.previous_messages:
                if msg.role == "user":
                    memory.chat_memory.add_user_message(msg.content)
                else:
                    memory.chat_memory.add_ai_message(msg.content)
            
            # Get relevant context from vector DB
            vector_store = Pinecone.from_existing_index(
                self.pinecone_index,
                self.embeddings,
                namespace=namespace
            )
            
            # Create retrieval chain
            qa_chain = ConversationalRetrievalChain.from_llm(
                llm=self.llm,
                retriever=vector_store.as_retriever(),
                memory=memory,
                return_source_documents=True
            )
            
            # Custom prompt for outreach context
            system_prompt = """You are DevaAI, an intelligent assistant for OutreachX - 
            a cold outreach automation platform. Your role is to help users craft compelling 
            outreach messages, optimize their campaigns, and leverage their resume and assets 
            effectively. Be concise, actionable, and personalized based on the user's data."""
            
            full_message = f"{system_prompt}\n\nUser message: {message}"
            
            # Get response
            response = await asyncio.to_thread(
                qa_chain,
                {"question": full_message}
            )
            
            # Extract important information for memory
            important_info = self._extract_important_info(message, response["answer"])
            
            return {
                "success": True,
                "response": response["answer"],
                "conversation_id": conversation_id,
                "timestamp": datetime.utcnow(),
                "important_info": important_info,
                "source_documents": response.get("source_documents", [])
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "conversation_id": conversation_id
            }
    
    def _extract_important_info(self, user_message: str, ai_response: str) -> Dict[str, Any]:
        """Extract and score important information for memory"""
        
        # Score importance (0-10)
        importance = 0
        extracted = {}
        
        # Check for action items
        if any(word in ai_response.lower() for word in ['recommend', 'suggest', 'should', 'can', 'can']):
            importance += 3
            extracted['contains_recommendation'] = True
        
        # Check for specific skills mentioned
        if any(word in user_message.lower() for word in ['skill', 'expertise', 'experience']):
            importance += 2
            extracted['skill_related'] = True
        
        # Check for lead/campaign info
        if any(word in user_message.lower() for word in ['lead', 'campaign', 'template', 'email']):
            importance += 3
            extracted['campaign_related'] = True
        
        extracted['importance_score'] = min(importance, 10)
        return extracted
    
    def generate_template_suggestion(
        self,
        user_profile: Dict[str, Any],
        lead_info: Dict[str, Any],
        context: str = ""
    ) -> Dict[str, str]:
        """Generate personalized email template suggestions"""
        
        prompt = f"""Based on this profile and lead info, generate 3 personalized email templates:
        
        User Profile:
        {json.dumps(user_profile, indent=2)}
        
        Lead Info:
        {json.dumps(lead_info, indent=2)}
        
        Additional Context: {context}
        
        Generate templates with {{{{subject_line}}}} and {{{{body}}}}.
        Make them personalized and compelling.
        """
        
        try:
            response = self.llm.invoke(prompt)
            response_text = response.content if hasattr(response, "content") else str(response)
            templates = self._parse_templates(response_text)
            return {
                "success": True,
                "templates": templates
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    @staticmethod
    def _parse_templates(response: str) -> List[Dict[str, str]]:
        """Parse AI response into structured templates"""
        # Simple parsing - in production, use more robust method
        templates = []
        sections = response.split("Template")
        
        for section in sections[1:]:
            template = {}
            if "Subject:" in section:
                parts = section.split("Subject:")
                if len(parts) > 1:
                    subject_part = parts[1].split("\n")[0].strip()
                    template['subject'] = subject_part
            
            if "Body:" in section or "Message:" in section:
                template['body'] = section.split("Body:" if "Body:" in section else "Message:")[1].strip()
            
            if template:
                templates.append(template)
        
        return templates


# Initialize AI system
ai_system = OutreachXAI()
