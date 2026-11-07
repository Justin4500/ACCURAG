import os
import logging
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings
from app.core.config import settings
from app.rag.chunker import ChunkItem

logger = logging.getLogger("accurate_ai.vector_store")


class VectorStoreManager:
    """Manages persistent ChromaDB vector collections with user-level isolation and dimension safety."""

    _client = None

    @classmethod
    def get_client(cls) -> chromadb.PersistentClient:
        if cls._client is None:
            os.makedirs(settings.CHROMA_PERSIST_DIRECTORY, exist_ok=True)
            cls._client = chromadb.PersistentClient(
                path=settings.CHROMA_PERSIST_DIRECTORY,
                settings=ChromaSettings(anonymized_telemetry=False)
            )
            logger.info(f"Initialized ChromaDB client at {settings.CHROMA_PERSIST_DIRECTORY}")
        return cls._client

    @classmethod
    def _collection_name_for_user(cls, user_id: str, dim: int = 384) -> str:
        # ChromaDB collection names must be 3-63 characters, start/end with alphanumeric
        sanitized = user_id.replace("-", "_")
        return f"u_{sanitized}_d{dim}"[:63]

    @classmethod
    def get_user_collection(cls, user_id: str, dim: int = 384):
        client = cls.get_client()
        name = cls._collection_name_for_user(user_id, dim)
        return client.get_or_create_collection(
            name=name,
            metadata={"user_id": user_id, "dimension": dim, "hnsw:space": "cosine"}
        )

    @classmethod
    def add_chunks(
        cls,
        user_id: str,
        document_id: str,
        chunks: List[ChunkItem],
        embeddings: List[List[float]]
    ) -> int:
        if not chunks or not embeddings:
            return 0

        dim = len(embeddings[0])
        collection = cls.get_user_collection(user_id, dim=dim)

        ids = [c.chunk_id for c in chunks]
        texts = [c.text for c in chunks]
        metadatas = [c.metadata for c in chunks]

        collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=texts,
            metadatas=metadatas
        )
        logger.info(f"Successfully upserted {len(chunks)} chunks for document {document_id} in ChromaDB (dim: {dim})")
        return len(chunks)

    @classmethod
    def delete_document(cls, user_id: str, document_id: str) -> None:
        client = cls.get_client()
        # Clean from both 384 and 768 collections if present
        for dim in [384, 768]:
            try:
                name = cls._collection_name_for_user(user_id, dim)
                col = client.get_collection(name=name)
                col.delete(where={"document_id": document_id})
                logger.info(f"Deleted vector chunks for document {document_id} from {name}")
            except Exception:
                pass

    @classmethod
    def query_similar(
        cls,
        user_id: str,
        query_embedding: List[float],
        top_k: int = 5,
        collection_id: Optional[str] = None,
        document_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        dim = len(query_embedding)
        collection = cls.get_user_collection(user_id, dim=dim)

        total_in_index = collection.count()
        if total_in_index == 0:
            return []

        where_filter = None
        if document_ids and len(document_ids) == 1:
            where_filter = {"document_id": document_ids[0]}
        elif document_ids and len(document_ids) > 1:
            where_filter = {"$or": [{"document_id": doc_id} for doc_id in document_ids]}

        # Request at most the total items in index to avoid ChromaDB out-of-bounds error
        n_results = min(max(top_k * 2, 5), total_in_index)

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=where_filter,
            include=["documents", "metadatas", "distances"]
        )

        retrieved = []
        if not results or not results.get("ids") or len(results["ids"][0]) == 0:
            return retrieved

        ids_list = results["ids"][0]
        docs_list = results["documents"][0]
        meta_list = results["metadatas"][0]
        dist_list = results["distances"][0]

        for i in range(len(ids_list)):
            meta = meta_list[i] or {}
            if collection_id:
                col_str = meta.get("collections", "")
                if collection_id not in col_str.split(","):
                    continue

            distance = dist_list[i]
            similarity_score = max(0.0, 1.0 - distance)

            retrieved.append({
                "chunk_id": ids_list[i],
                "text": docs_list[i],
                "document_id": meta.get("document_id", ""),
                "document_name": meta.get("document_name", ""),
                "page_number": meta.get("page_number", 1),
                "chunk_index": meta.get("chunk_index", 0),
                "score": round(similarity_score, 4),
            })

        retrieved.sort(key=lambda x: x["score"], reverse=True)
        return retrieved[:top_k]
