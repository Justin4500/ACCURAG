import re
import logging
from typing import List, Dict, Any, Optional, AsyncGenerator
from app.core.config import settings
from app.rag.embeddings import get_embedding_provider
from app.rag.vector_store import VectorStoreManager
from app.rag.web_search import WebSearchEngine
from app.schemas.rag import CitationItem

logger = logging.getLogger("accurate_ai.rag_engine")

SEARCH_WEB_MARKER = "[SEARCH_WEB_NEEDED"
FALLBACK_UNANSWERABLE = "I couldn't find sufficient information to answer this question from your uploaded documents."

DOC_SYSTEM_PROMPT = """You are Accurate AI, an expert document assistant modeled after Google Gemini.
Your goal is to provide clear, beautifully structured, accurate, and easy-to-understand explanations based on the provided DOCUMENT CONTEXT EXCERPTS.

STYLE & FORMATTING GUIDELINES (GOOGLE GEMINI STYLE):
1. Easy to Understand: Explain technical topics (e.g. Data Structures, algorithms, notes, code) in a clear, friendly, and pedagogical manner.
2. Clean Structure: Use clear section titles, bold key terms, numbered steps, and bullet points to break down complex ideas.
3. Code & Output: When notes contain code or outputs (e.g. C++ Stack, Queue, Trees), format them nicely in code blocks with brief explanations of each part.
4. Grounded Citations: Cite the source document and page inline whenever explaining facts or code, e.g.: [Doc: <Document Name>, Page: <Page Number>].
5. Decision on Document vs Web:
   - If the excerpts contain information relevant to the question, answer directly from the excerpts. Do NOT output [SEARCH_WEB_NEEDED] if the document has relevant material.
   - ONLY if the excerpts are COMPLETELY UNRELATED or totally lack the topic asked by the user, reply ONLY with:
     [SEARCH_WEB_NEEDED: <user's question>]
   - If the user asked a multi-part question where some parts are in the document and other entirely separate topics are absent from the document:
     First provide the answer to the parts covered by the documents citing [Doc: ...], and then on a new line output:
     [SEARCH_WEB_NEEDED: <specific missing topic to search for>]
6. Do NOT hallucinate or invent numbers, dates, or code not present in the excerpts.
"""

WEB_SYSTEM_PROMPT = """You are Accurate AI, a helpful research assistant modeled after Google Gemini.
The user asked a question whose answer was NOT found in their uploaded documents, so live web search results were gathered.

CRITICAL INSTRUCTIONS:
1. Always begin your response with this clear notification block:
> 🔍 **Not Found in Uploaded Documents**  
> *This topic was not found in your uploaded files. I searched the live web for you to get the accurate answer:*

2. Then, provide a well-structured, easy-to-read answer synthesized from the live search results, formatted cleanly like Google Gemini:
   - Use clear headings (###), bold key terms, and bullet points.
   - Explain concepts simply, step-by-step, and directly.
   - Cite web sources inline when stating facts: [Web: <Source Name>].
   - Provide key takeaways or summary.
"""

COMBINED_SYSTEM_PROMPT = """You are Accurate AI, a multi-source intelligence assistant modeled after Google Gemini.
You have both DOCUMENT CONTEXT from the user's uploaded files AND LIVE WEB SEARCH RESULTS.

CRITICAL INSTRUCTIONS:
1. Provide a unified, comprehensive answer organized into two clear sections:
   - ### 📄 From Your Uploaded Documents
     (Synthesize what is found in their document with inline citations: [Doc: <Document Name>, Page: <Page Number>])
   - ### 🌐 Additional Information from Live Web Search
     (Explain the remaining parts of their question from live web results with inline citations: [Web: <Source Name>])
2. Ensure the response is easy to read, uses bullet points and bold key terms, and directly addresses the question.
"""


def format_chat_history(history: Optional[List[Dict[str, str]]]) -> str:
    if not history:
        return ""
    lines = ["CONVERSATION HISTORY:"]
    for msg in history:
        role = "User" if msg.get("role") == "user" else "Assistant"
        lines.append(f"{role}: {msg.get('content', '')}")
    lines.append("")
    return "\n".join(lines)


class RagEngine:
    """Hybrid RAG engine: Searches user documents first, seamlessly falls back or combines with real-time Web Search."""

    def __init__(self, custom_gemini_key: Optional[str] = None):
        self.api_key = custom_gemini_key or settings.GEMINI_API_KEY
        self.model_name = settings.GEMINI_MODEL or "gemini-3.5-flash-lite"
        self.embedding_provider = get_embedding_provider(custom_key=self.api_key)
        self.client = None

        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.error(f"Failed to initialize Gemini Client: {e}")
                self.client = None

    def retrieve_context(
        self,
        user_id: str,
        query: str,
        top_k: int = 5,
        collection_id: Optional[str] = None,
        document_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        query = query.strip()
        if not query:
            return []

        try:
            query_embedding = self.embedding_provider.embed_query(query)
            # Retrieve 2x candidates to allow smart deduplication across duplicate uploads
            candidates = VectorStoreManager.query_similar(
                user_id=user_id,
                query_embedding=query_embedding,
                top_k=top_k * 2,
                collection_id=collection_id,
                document_ids=document_ids
            )

            # Deduplicate by document_name + page_number + text snippet
            seen = set()
            unique_chunks = []
            for c in candidates:
                text_preview = c.get("text", "")[:100].strip()
                sig = (c.get("document_name", ""), c.get("page_number", 1), text_preview)
                if sig not in seen:
                    seen.add(sig)
                    unique_chunks.append(c)
                    if len(unique_chunks) >= top_k:
                        break

            return unique_chunks
        except Exception as e:
            logger.error(f"Context retrieval error: {e}")
            return []

    def build_grounded_prompt(
        self,
        query: str,
        context_chunks: List[Dict[str, Any]],
        chat_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        history_text = format_chat_history(chat_history)
        context_blocks = []
        for i, chunk in enumerate(context_chunks, 1):
            doc_name = chunk.get("document_name", "Unknown Document")
            page_num = chunk.get("page_number", 1)
            text = chunk.get("text", "").strip()
            safe_text = text.replace("--- END CONTEXT CHUNK ---", "")
            context_blocks.append(
                f"--- CONTEXT CHUNK {i} ---\n"
                f"Source: {doc_name}\n"
                f"Page: {page_num}\n"
                f"Content:\n{safe_text}\n"
                f"--- END CONTEXT CHUNK ---"
            )

        joined_context = "\n\n".join(context_blocks)
        prompt = (
            f"{history_text}"
            f"DOCUMENT CONTEXT EXCERPTS:\n"
            f"{joined_context}\n\n"
            f"USER QUESTION:\n"
            f"{query}\n\n"
            f"Please evaluate whether these excerpts contain the answer. Follow the instructions strictly."
        )
        return prompt

    def build_web_prompt(
        self,
        query: str,
        web_results: List[Dict[str, Any]],
        chat_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        history_text = format_chat_history(chat_history)
        blocks = []
        for i, item in enumerate(web_results, 1):
            title = item.get("title", "")
            url = item.get("url", "")
            body = item.get("body", "").strip()
            domain = item.get("domain", "")
            blocks.append(f"[{i}] {title} ({domain})\nURL: {url}\nSnippet: {body}")

        joined = "\n\n".join(blocks)
        prompt = (
            f"{history_text}"
            f"LIVE WEB SEARCH RESULTS:\n"
            f"{joined}\n\n"
            f"USER QUESTION:\n"
            f"{query}\n\n"
            f"Please provide a comprehensive, direct, and well-structured answer synthesized from these web search results."
        )
        return prompt

    def build_combined_prompt(
        self,
        query: str,
        context_chunks: List[Dict[str, Any]],
        web_results: List[Dict[str, Any]],
        chat_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        history_text = format_chat_history(chat_history)
        doc_blocks = []
        for i, chunk in enumerate(context_chunks, 1):
            doc_name = chunk.get("document_name", "Unknown Document")
            page_num = chunk.get("page_number", 1)
            text = chunk.get("text", "").strip()
            doc_blocks.append(f"[{i}] {doc_name} (Page {page_num}):\n{text}")

        web_blocks = []
        for i, item in enumerate(web_results, 1):
            title = item.get("title", "")
            url = item.get("url", "")
            body = item.get("body", "").strip()
            web_blocks.append(f"[{i}] {title}\nURL: {url}\nSnippet: {body}")

        joined_docs = "\n\n".join(doc_blocks)
        joined_web = "\n\n".join(web_blocks)

        prompt = (
            f"{history_text}"
            f"USER'S UPLOADED DOCUMENT EXCERPTS:\n"
            f"{joined_docs}\n\n"
            f"LIVE WEB SEARCH RESULTS:\n"
            f"{joined_web}\n\n"
            f"USER QUESTION:\n"
            f"{query}\n\n"
            f"Synthesize a cohesive combined answer addressing all aspects of the user's question, "
            f"clearly attributing document facts to the document and web facts to live web sources."
        )
        return prompt

    def _call_gemini_models(self, prompt: str, system_instruction: str) -> Optional[str]:
        if not self.api_key or not self.client:
            return None

        from google.genai import types
        candidate_models = ["gemini-3.5-flash-lite", self.model_name, "gemini-3.5-flash"]
        unique_models = list(dict.fromkeys(candidate_models))

        for model in unique_models:
            try:
                response = self.client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.3,
                    )
                )
                if response and response.text:
                    return response.text.strip()
            except Exception as e:
                logger.warning(f"Model {model} failed in _call_gemini_models: {e}. Trying fallback...")

        return None

    def _extract_search_query(self, text: str, default_query: str) -> Optional[str]:
        if SEARCH_WEB_MARKER not in text:
            return None
        match = re.search(r'\[SEARCH_WEB_NEEDED(?::\s*([^\]]+))?\]', text)
        if match and match.group(1):
            extracted = match.group(1).strip()
            if extracted:
                return extracted
        return default_query

    def generate_answer(
        self,
        user_id: str,
        query: str,
        top_k: int = 5,
        collection_id: Optional[str] = None,
        document_ids: Optional[List[str]] = None,
        chat_history: Optional[List[Dict[str, str]]] = None,
        enable_web_search: bool = True
    ) -> Dict[str, Any]:
        """Runs the hybrid RAG query pipeline (PDF first, web search fallback, or combined)."""
        chunks = self.retrieve_context(
            user_id=user_id,
            query=query,
            top_k=top_k,
            collection_id=collection_id,
            document_ids=document_ids
        )

        doc_citations = [
            CitationItem(
                document_id=c["document_id"],
                document_name=c["document_name"],
                page_number=c["page_number"],
                excerpt=c["text"][:300] + ("..." if len(c["text"]) > 300 else ""),
                score=c["score"],
                source_type="document"
            )
            for c in chunks
        ]

        has_doc_match = bool(chunks and any(c.get("score", 0) >= 0.35 for c in chunks))

        # 1. Try Document Analysis if document chunks exist with relevance
        if has_doc_match and self.client:
            prompt = self.build_grounded_prompt(query, chunks, chat_history=chat_history)
            doc_answer = self._call_gemini_models(prompt, DOC_SYSTEM_PROMPT)

            if doc_answer:
                search_query = self._extract_search_query(doc_answer, query)

                # Pure document answer
                if not search_query:
                    return {
                        "answer": doc_answer,
                        "citations": doc_citations,
                        "has_sufficient_context": True,
                        "source_type": "document",
                        "raw_chunks": chunks
                    }

                # Clean the partial document answer before the search marker
                clean_doc_part = re.sub(r'\[SEARCH_WEB_NEEDED(?::\s*[^\]]+)?\]', '', doc_answer).strip()

                # If document had partial information, combine with web search!
                if clean_doc_part and len(clean_doc_part) > 25 and enable_web_search:
                    logger.info(f"Partial document match for '{query}'. Running web search for '{search_query}'...")
                    web_results = WebSearchEngine.search(search_query, max_results=4)
                    if web_results:
                        web_citations = [
                            CitationItem(
                                document_id=f"web-{idx}",
                                document_name=item["title"],
                                page_number=None,
                                excerpt=item["body"][:300] + ("..." if len(item["body"]) > 300 else ""),
                                score=1.0,
                                source_type="web",
                                url=item["url"]
                            )
                            for idx, item in enumerate(web_results, 1)
                        ]
                        combined_prompt = self.build_combined_prompt(
                            query=query,
                            context_chunks=chunks,
                            web_results=web_results,
                            chat_history=chat_history
                        )
                        combined_answer = self._call_gemini_models(combined_prompt, COMBINED_SYSTEM_PROMPT)
                        if combined_answer:
                            return {
                                "answer": combined_answer,
                                "citations": doc_citations + web_citations,
                                "has_sufficient_context": True,
                                "source_type": "combined",
                                "raw_chunks": chunks
                            }

        # 2. Topic is not in user's documents -> perform real-time Web Search
        if enable_web_search:
            logger.info(f"Question '{query}' not answered by documents. Triggering live Web Search...")
            try:
                web_results = WebSearchEngine.search(query, max_results=5)
            except Exception as e:
                logger.error(f"Web search error for '{query}': {e}")
                web_results = []

            if web_results and self.client:
                web_citations = [
                    CitationItem(
                        document_id=f"web-{idx}",
                        document_name=item["title"],
                        page_number=None,
                        excerpt=item["body"][:300] + ("..." if len(item["body"]) > 300 else ""),
                        score=1.0,
                        source_type="web",
                        url=item["url"]
                    )
                    for idx, item in enumerate(web_results, 1)
                ]
                web_prompt = self.build_web_prompt(query, web_results, chat_history=chat_history)
                web_answer = self._call_gemini_models(web_prompt, WEB_SYSTEM_PROMPT)

                if web_answer:
                    return {
                        "answer": web_answer,
                        "citations": web_citations,
                        "has_sufficient_context": True,
                        "source_type": "web",
                        "raw_chunks": []
                    }

        # 3. Fallback if no web results or API key missing
        if not self.api_key:
            return {
                "answer": "Please configure `GEMINI_API_KEY` in `.env` or Settings to enable AI responses.",
                "citations": doc_citations,
                "has_sufficient_context": False,
                "source_type": "document",
                "raw_chunks": chunks
            }

        return {
            "answer": FALLBACK_UNANSWERABLE,
            "citations": [],
            "has_sufficient_context": False,
            "source_type": "none",
            "raw_chunks": []
        }

    async def generate_answer_stream(
        self,
        user_id: str,
        query: str,
        top_k: int = 5,
        collection_id: Optional[str] = None,
        document_ids: Optional[List[str]] = None,
        chat_history: Optional[List[Dict[str, str]]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Streams the answer token by token using intelligent hybrid search (doc -> web -> combined)."""
        chunks = self.retrieve_context(
            user_id=user_id,
            query=query,
            top_k=top_k,
            collection_id=collection_id,
            document_ids=document_ids
        )

        doc_citations = [
            {
                "document_id": c["document_id"],
                "document_name": c["document_name"],
                "page_number": c["page_number"],
                "excerpt": c["text"][:300] + ("..." if len(c["text"]) > 300 else ""),
                "score": c["score"],
                "source_type": "document"
            }
            for c in chunks
        ]

        has_doc_match = bool(chunks and any(c.get("score", 0) >= 0.35 for c in chunks))

        if not self.api_key or not self.client:
            yield {
                "type": "text",
                "content": "Please configure `GEMINI_API_KEY` in `.env` to enable AI responses."
            }
            yield {"type": "done"}
            return

        from google.genai import types
        candidate_models = ["gemini-3.5-flash-lite", self.model_name, "gemini-3.5-flash"]
        unique_models = list(dict.fromkeys(candidate_models))

        # 1. Document Evaluation
        if has_doc_match:
            yield {"type": "status", "message": "Analyzing uploaded notes & documents..."}

            prompt = self.build_grounded_prompt(query, chunks, chat_history=chat_history)
            doc_answer = self._call_gemini_models(prompt, DOC_SYSTEM_PROMPT)

            if doc_answer:
                search_query = self._extract_search_query(doc_answer, query)

                # Pure document answer
                if not search_query:
                    yield {"type": "citations", "citations": doc_citations, "source_type": "document"}
                    yield {"type": "status", "message": "Formatting Gemini-style answer from notes..."}
                    for word in doc_answer.split(" "):
                        yield {"type": "text", "content": word + " "}
                    yield {"type": "done"}
                    return

                # If partial, prepare to combine
                clean_doc_part = re.sub(r'\[SEARCH_WEB_NEEDED(?::\s*[^\]]+)?\]', '', doc_answer).strip()
                if clean_doc_part and len(clean_doc_part) > 25:
                    yield {"type": "status", "message": "Partial notes match found. Searching web for additional details..."}
                    try:
                        web_results = WebSearchEngine.search(search_query, max_results=4)
                    except Exception as e:
                        logger.error(f"Web search error: {e}")
                        web_results = []

                    if web_results:
                        web_citations = [
                            {
                                "document_id": f"web-{idx}",
                                "document_name": item["title"],
                                "page_number": None,
                                "excerpt": item["body"][:300] + ("..." if len(item["body"]) > 300 else ""),
                                "score": 1.0,
                                "source_type": "web",
                                "url": item["url"]
                            }
                            for idx, item in enumerate(web_results, 1)
                        ]
                        yield {"type": "citations", "citations": doc_citations + web_citations, "source_type": "combined"}
                        yield {"type": "status", "message": "Synthesizing unified document & web answer..."}

                        combined_prompt = self.build_combined_prompt(query, chunks, web_results, chat_history=chat_history)
                        stream_success = False
                        for model in unique_models:
                            try:
                                stream = self.client.models.generate_content_stream(
                                    model=model,
                                    contents=combined_prompt,
                                    config=types.GenerateContentConfig(
                                        system_instruction=COMBINED_SYSTEM_PROMPT,
                                        temperature=0.3,
                                    )
                                )
                                for chunk in stream:
                                    if chunk.text:
                                        yield {"type": "text", "content": chunk.text}
                                stream_success = True
                                break
                            except Exception as e:
                                logger.warning(f"Combined streaming on {model} failed: {e}")

                        if stream_success:
                            yield {"type": "done"}
                            return

        # 2. Topic is not in documents -> Search the Web!
        yield {"type": "status", "message": "Topic not found in documents. Searching the web for you..."}
        try:
            web_results = WebSearchEngine.search(query, max_results=5)
        except Exception as e:
            logger.error(f"Web search error: {e}")
            web_results = []

        if web_results:
            web_citations = [
                {
                    "document_id": f"web-{idx}",
                    "document_name": item["title"],
                    "page_number": None,
                    "excerpt": item["body"][:300] + ("..." if len(item["body"]) > 300 else ""),
                    "score": 1.0,
                    "source_type": "web",
                    "url": item["url"]
                }
                for idx, item in enumerate(web_results, 1)
            ]
            yield {"type": "citations", "citations": web_citations, "source_type": "web"}
            yield {"type": "status", "message": "Synthesizing web response..."}

            web_prompt = self.build_web_prompt(query, web_results, chat_history=chat_history)
            web_stream_success = False

            for model in unique_models:
                try:
                    stream = self.client.models.generate_content_stream(
                        model=model,
                        contents=web_prompt,
                        config=types.GenerateContentConfig(
                            system_instruction=WEB_SYSTEM_PROMPT,
                            temperature=0.3,
                        )
                    )
                    for chunk in stream:
                        if chunk.text:
                            yield {"type": "text", "content": chunk.text}
                    web_stream_success = True
                    break
                except Exception as e:
                    logger.warning(f"Web streaming on {model} failed: {e}. Trying fallback...")

            if web_stream_success:
                yield {"type": "done"}
                return

        yield {
            "type": "text",
            "content": "I couldn't find sufficient information to answer this question from your uploaded documents or web search."
        }
        yield {"type": "done"}
