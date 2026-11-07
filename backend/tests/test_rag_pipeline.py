import os
import tempfile
import pytest
import pymupdf as fitz
from app.rag.extractor import DocumentExtractor, ExtractionError
from app.rag.chunker import TextChunker
from app.rag.embeddings import FastembedProvider
from app.rag.vector_store import VectorStoreManager
from app.rag.engine import RagEngine, FALLBACK_UNANSWERABLE


def create_sample_pdf(file_path: str, pages_text: list):
    doc = fitz.open()
    for text in pages_text:
        page = doc.new_page()
        page.insert_text((50, 72), text)
    doc.save(file_path)
    doc.close()


def test_file_validation():
    # Supported files
    assert DocumentExtractor.validate_file("document.pdf", 1000) == ".pdf"
    assert DocumentExtractor.validate_file("contract.docx", 2000) == ".docx"
    assert DocumentExtractor.validate_file("data.csv", 500) == ".csv"

    # Unsupported file
    with pytest.raises(ExtractionError):
        DocumentExtractor.validate_file("malicious.exe", 1000)

    # Oversized file
    with pytest.raises(ExtractionError):
        DocumentExtractor.validate_file("huge.pdf", 60 * 1024 * 1024)


def test_pdf_extraction_and_page_preservation():
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        pages = [
            "Accurate AI is an enterprise document assistant powered by grounded RAG.",
            "Chapter 2 explains page preservation and citation extraction mechanisms."
        ]
        create_sample_pdf(tmp_path, pages)

        extracted_pages, page_count, ocr_required = DocumentExtractor.extract(tmp_path, "sample.pdf")
        assert page_count == 2
        assert ocr_required is False
        assert len(extracted_pages) == 2
        assert extracted_pages[0]["page_number"] == 1
        assert "Accurate AI" in extracted_pages[0]["text"]
        assert extracted_pages[1]["page_number"] == 2
        assert "Chapter 2" in extracted_pages[1]["text"]
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def test_scanned_pdf_detection():
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        # Create PDF with no text (simulating scanned image PDF)
        doc = fitz.open()
        doc.new_page()
        doc.new_page()
        doc.save(tmp_path)
        doc.close()

        extracted_pages, page_count, ocr_required = DocumentExtractor.extract(tmp_path, "scanned.pdf")
        assert page_count == 2
        assert ocr_required is True
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def test_text_chunking():
    chunker = TextChunker(chunk_size_tokens=50, chunk_overlap_tokens=10)
    pages = [
        {"page_number": 1, "text": "This is page one content. " * 30},
        {"page_number": 2, "text": "This is page two content. " * 20},
    ]

    chunks = chunker.chunk_pages(
        pages=pages,
        document_id="doc-123",
        document_name="TestReport.pdf",
        user_id="user-456"
    )

    assert len(chunks) > 0
    # Every chunk must preserve page_number, document_id, and metadata
    for chunk in chunks:
        assert chunk.document_id == "doc-123"
        assert chunk.document_name == "TestReport.pdf"
        assert chunk.page_number in [1, 2]
        assert chunk.metadata["user_id"] == "user-456"


def test_local_embeddings_and_vector_store():
    provider = FastembedProvider()
    texts = [
        "Photosynthesis is the process by which green plants use sunlight to synthesize nutrients.",
        "Revenue grew by 24 percent in the third fiscal quarter of 2026."
    ]
    embeddings = provider.embed_documents(texts)
    assert len(embeddings) == 2
    assert len(embeddings[0]) == 384  # bge-small dimension

    query_emb = provider.embed_query("How much did revenue grow in Q3?")
    assert len(query_emb) == 384

    # Test ChromaDB indexing and retrieval
    user_id = "test_eval_user_1"
    doc_id = "doc_eval_001"

    chunker = TextChunker()
    chunks = chunker.chunk_pages(
        pages=[
            {"page_number": 1, "text": texts[0]},
            {"page_number": 5, "text": texts[1]},
        ],
        document_id=doc_id,
        document_name="QuarterlyReport.pdf",
        user_id=user_id
    )

    VectorStoreManager.add_chunks(user_id, doc_id, chunks, embeddings)

    # Query for revenue
    results = VectorStoreManager.query_similar(user_id, query_emb, top_k=2)
    assert len(results) > 0
    # The top result should be the revenue sentence on page 5
    top_result = results[0]
    assert "Revenue grew" in top_result["text"]
    assert top_result["page_number"] == 5
    assert top_result["document_name"] == "QuarterlyReport.pdf"

    # Clean up
    VectorStoreManager.delete_document(user_id, doc_id)


def test_rag_prompt_grounding_and_unanswerable_fallback():
    engine = RagEngine(custom_gemini_key=None)

    # 1. Fallback when context is empty and web search disabled
    empty_result = engine.generate_answer(
        user_id="nonexistent_user",
        query="What was the EBITDA in 2025?",
        enable_web_search=False
    )
    assert empty_result["has_sufficient_context"] is False
    assert empty_result["answer"] == FALLBACK_UNANSWERABLE

    # 2. Grounded prompt builder formatting
    sample_chunks = [{
        "chunk_id": "c1",
        "text": "The refund window is 30 days.",
        "document_name": "ReturnPolicy.pdf",
        "page_number": 3,
        "score": 0.92
    }]
    prompt = engine.build_grounded_prompt("What is the refund period?", sample_chunks)
    assert "ReturnPolicy.pdf" in prompt
    assert "Page: 3" in prompt
    assert "The refund window is 30 days." in prompt
