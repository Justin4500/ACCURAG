import logging
from abc import ABC, abstractmethod
from typing import List, Optional
from app.core.config import settings

logger = logging.getLogger("accurate_ai.embeddings")


class BaseEmbeddingProvider(ABC):
    @abstractmethod
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        pass

    @abstractmethod
    def embed_query(self, text: str) -> List[float]:
        pass


class GeminiEmbeddingProvider(BaseEmbeddingProvider):
    """Generates embeddings using Google Gemini text-embedding-004 via google.genai."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        try:
            from google import genai
            self.client = genai.Client(api_key=self.api_key)
            self.model = "text-embedding-004"
            logger.info("Initialized GeminiEmbeddingProvider with text-embedding-004 via google.genai")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini embedding client: {e}")
            raise e

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        embeddings = []
        batch_size = 50
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            try:
                response = self.client.models.embed_content(
                    model=self.model,
                    contents=batch,
                )
                for emb in response.embeddings:
                    embeddings.append(emb.values)
            except Exception as e:
                logger.error(f"Gemini document embedding error: {e}")
                for t in batch:
                    try:
                        single = self.client.models.embed_content(
                            model=self.model,
                            contents=t,
                        )
                        embeddings.append(single.embeddings[0].values)
                    except Exception as single_err:
                        logger.error(f"Single text embedding failed: {single_err}")
                        embeddings.append([0.0] * 768)
        return embeddings

    def embed_query(self, text: str) -> List[float]:
        try:
            response = self.client.models.embed_content(
                model=self.model,
                contents=text,
            )
            return response.embeddings[0].values
        except Exception as e:
            logger.error(f"Gemini query embedding error: {e}")
            raise e


class FastembedProvider(BaseEmbeddingProvider):
    """Ultra-lightweight local embedding using FastEmbed (BAAI/bge-small-en-v1.5) ONNX model."""

    _model_instance = None

    def __init__(self):
        if FastembedProvider._model_instance is None:
            try:
                from fastembed import TextEmbedding
                logger.info("Loading FastEmbed BAAI/bge-small-en-v1.5 model...")
                FastembedProvider._model_instance = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
            except Exception as e:
                logger.error(f"Failed to load FastEmbed model: {e}")
                FastembedProvider._model_instance = None
        self.model = FastembedProvider._model_instance

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        if not texts or not self.model:
            return [[0.0] * 384 for _ in texts]
        # Use batch_size=64 for parallel batching and fast CPU embedding
        embeddings = list(self.model.embed(texts, batch_size=64))
        return [emb.tolist() for emb in embeddings]

    def embed_query(self, text: str) -> List[float]:
        if not self.model:
            return [0.0] * 384
        embeddings = list(self.model.embed([text], batch_size=1))
        return embeddings[0].tolist()


def get_embedding_provider(custom_key: Optional[str] = None) -> BaseEmbeddingProvider:
    provider_pref = settings.EMBEDDING_PROVIDER.lower()
    api_key = custom_key or settings.GEMINI_API_KEY

    if provider_pref == "gemini" and api_key:
        try:
            return GeminiEmbeddingProvider(api_key=api_key)
        except Exception as e:
            logger.warning(f"Failed to create GeminiEmbeddingProvider: {e}. Falling back to FastEmbed.")

    # Default to fast, reliable local FastEmbed
    return FastembedProvider()
