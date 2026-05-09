import json
from typing import Any, List, Dict, Optional
from pinecone import Pinecone, ServerlessSpec
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import CrossEncoder

from .config import get_settings

settings = get_settings()

class EmbeddingWrapper:
    """Embedding Abstraction Layer"""
    def __init__(self):
        self.embeddings = HuggingFaceEmbeddings(model_name=settings.huggingface_embedding_model)
        
    def embed_query(self, text: str) -> List[float]:
        return self.embeddings.embed_query(text)

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return self.embeddings.embed_documents(texts)


class PineconeManager:
    """Manages Pinecone index and vector operations."""
    def __init__(self):
        self.pc = Pinecone(api_key=settings.pinecone_api_key)
        self.index_name = settings.pinecone_index
        
        # We assume the index is created externally or we create it if missing
        if self.index_name not in self.pc.list_indexes().names():
            # Create a serverless index with the appropriate dimension for all-MiniLM-L6-v2 (384)
            self.pc.create_index(
                name=self.index_name,
                dimension=384,
                metric='cosine',
                spec=ServerlessSpec(
                    cloud='aws',
                    region='us-east-1' # Default, could be made configurable
                )
            )
            
        self.index = self.pc.Index(self.index_name)
        self.embedding_wrapper = EmbeddingWrapper()
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
        self.cross_encoder = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')

    def upsert_asset_chunks(self, user_id: str, asset_id: str, asset_name: str, content: str, metadata: dict = None):
        """Chunks asset text and stores embeddings into Pinecone."""
        if not content:
            return

        chunks = self.text_splitter.split_text(content)
        if not chunks:
            return

        vectors = self.embedding_wrapper.embed_documents(chunks)
        
        pinecone_vectors = []
        for i, (chunk, vector) in enumerate(zip(chunks, vectors)):
            chunk_metadata = {
                "asset_id": str(asset_id),
                "asset_name": asset_name,
                "text": chunk,
                "chunk_index": i,
                "source_type": metadata.get("source_type", "unknown") if metadata else "unknown"
            }
            if metadata:
                chunk_metadata.update({k: str(v) for k, v in metadata.items()})

            pinecone_vectors.append({
                "id": f"{asset_id}-chunk-{i}",
                "values": vector,
                "metadata": chunk_metadata
            })
            
        self.index.upsert(vectors=pinecone_vectors, namespace=user_id)

    def hybrid_search(self, user_id: str, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Performs semantic search with namespace filtering and cross-encoder re-ranking."""
        query_vector = self.embedding_wrapper.embed_query(query)
        
        # Step 1: Fetch top candidates using namespace
        results = self.index.query(
            vector=query_vector,
            namespace=user_id,
            top_k=20,
            include_metadata=True
        )
        
        matches = results.get("matches", [])
        if not matches:
            return []
            
        # Step 2: Cross-Encoder Re-Ranking
        # Prepare pairs of (Query, Document) for the cross encoder
        pairs = [[query, match["metadata"].get("text", "")] for match in matches]
        scores = self.cross_encoder.predict(pairs)
        
        # Combine matches with their new scores
        scored_matches = list(zip(matches, scores))
        # Sort by the cross-encoder score descending
        scored_matches.sort(key=lambda x: x[1], reverse=True)
        
        # Step 3: Return top K
        formatted_results = []
        for match, score in scored_matches[:top_k]:
            formatted_results.append({
                "id": match["id"],
                "score": float(score),
                "metadata": match["metadata"]
            })
            
        return formatted_results

    def delete_asset_vectors(self, user_id: str, asset_id: str):
        """Deletes all chunks for an asset using namespace."""
        try:
            self.index.delete(filter={"asset_id": {"$eq": str(asset_id)}}, namespace=user_id)
        except Exception as e:
            print(f"Error deleting vectors for asset {asset_id}: {e}")

# Global instance
vector_store = PineconeManager()
