import os
import httpx
import uuid
from typing import List, Dict, Any, Optional
from pinecone import Pinecone

class VectorService:
    _pc = None
    _index = None

    @classmethod
    def _get_pinecone_index(cls):
        if cls._index is not None:
            return cls._index
            
        api_key = os.getenv("PINECONE_API_KEY")
        index_name = os.getenv("PINECONE_INDEX", "outreachx")
        host = os.getenv("PINECONE_HOST")
        
        if not api_key:
            print("Warning: PINECONE_API_KEY is not configured.")
            return None
            
        try:
            cls._pc = Pinecone(api_key=api_key)
            if host:
                cls._index = cls._pc.Index(host=host)
            else:
                cls._index = cls._pc.Index(index_name)
            return cls._index
        except Exception as e:
            print(f"Error initializing Pinecone client: {e}")
            return None

    @classmethod
    async def get_embeddings(cls, texts: List[str], input_type: str = "search_document") -> List[List[float]]:
        """Fetch float embeddings from Cohere remote API"""
        api_key = os.getenv("COHERE_API_KEY")
        model = os.getenv("COHERE_EMBED_MODEL", "embed-v4.0")
        output_dim = int(os.getenv("COHERE_OUTPUT_DIMENSION", "1536"))
        
        if not api_key:
            raise ValueError("COHERE_API_KEY is missing in environment.")

        url = "https://api.cohere.com/v2/embed"
        payload = {
            "model": model,
            "input_type": input_type,
            "texts": texts,
            "output_dimension": output_dim,
            "embedding_types": ["float"]
        }
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            
        embeddings = data.get("embeddings", {}).get("float")
        if not embeddings:
            raise ValueError("Cohere embeddings response did not contain float embeddings.")
        return embeddings

    @classmethod
    async def upsert_vector(
        cls,
        user_id: str,
        vector_id: str,
        text: str,
        metadata: Dict[str, Any]
    ) -> bool:
        """Upsert a single text chunk with metadata to Pinecone under user's namespace"""
        index = cls._get_pinecone_index()
        if not index:
            return False
            
        try:
            embeddings = await cls.get_embeddings([text], input_type="search_document")
            vector = embeddings[0]
            
            namespace = f"user_{user_id}"
            meta = {
                **metadata,
                "text": text,
                "user_id": user_id
            }
            
            # Upsert into Pinecone
            index.upsert(
                vectors=[(vector_id, vector, meta)],
                namespace=namespace
            )
            return True
        except Exception as e:
            print(f"Pinecone upsert failed for ID {vector_id}: {e}")
            return False

    @classmethod
    async def upsert_vectors_batch(
        cls,
        user_id: str,
        chunks: List[str],
        metadata_base: Dict[str, Any]
    ) -> List[str]:
        """Upsert multiple chunks to Pinecone, returning list of generated vector IDs"""
        index = cls._get_pinecone_index()
        if not index or not chunks:
            return []
            
        try:
            embeddings = await cls.get_embeddings(chunks, input_type="search_document")
            namespace = f"user_{user_id}"
            
            vectors = []
            vector_ids = []
            for i, chunk in enumerate(chunks):
                v_id = f"chunk_{uuid.uuid4().hex}"
                meta = {
                    **metadata_base,
                    "text": chunk,
                    "user_id": user_id,
                    "chunk_index": i
                }
                vectors.append((v_id, embeddings[i], meta))
                vector_ids.append(v_id)
                
            # Upsert in batches of 100
            for k in range(0, len(vectors), 100):
                batch = vectors[k:k+100]
                index.upsert(vectors=batch, namespace=namespace)
                
            return vector_ids
        except Exception as e:
            print(f"Batch Pinecone upsert failed: {e}")
            return []

    @classmethod
    async def query_relevant_chunks(
        cls,
        user_id: str,
        query: str,
        top_k: int = 5,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Search user's namespace in Pinecone for context match"""
        index = cls._get_pinecone_index()
        if not index:
            return []
            
        try:
            embeddings = await cls.get_embeddings([query], input_type="search_query")
            query_vector = embeddings[0]
            
            namespace = f"user_{user_id}"
            
            kwargs = {}
            if filter_metadata:
                kwargs["filter"] = filter_metadata
                
            response = index.query(
                vector=query_vector,
                top_k=top_k,
                include_metadata=True,
                namespace=namespace,
                **kwargs
            )
            
            results = []
            for match in response.get("matches", []):
                results.append({
                    "id": match["id"],
                    "score": match["score"],
                    "text": match["metadata"].get("text", ""),
                    "metadata": match["metadata"]
                })
            return results
        except Exception as e:
            print(f"Pinecone query failed: {e}")
            return []

    @classmethod
    async def delete_vectors_by_ids(cls, user_id: str, vector_ids: List[str]) -> bool:
        """Remove specific vectors by ID in the user's namespace"""
        index = cls._get_pinecone_index()
        if not index or not vector_ids:
            return False
            
        try:
            namespace = f"user_{user_id}"
            index.delete(ids=vector_ids, namespace=namespace)
            return True
        except Exception as e:
            print(f"Pinecone delete failed: {e}")
            return False

    @classmethod
    async def delete_vectors_by_filter(cls, user_id: str, filter_metadata: Dict[str, Any]) -> bool:
        """Remove vectors matching metadata filter in the user's namespace"""
        index = cls._get_pinecone_index()
        if not index:
            return False
            
        try:
            namespace = f"user_{user_id}"
            index.delete(filter=filter_metadata, namespace=namespace)
            return True
        except Exception as e:
            print(f"Pinecone filter delete failed: {e}")
            return False
