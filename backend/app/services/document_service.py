import os
import uuid
import hashlib
import shutil
import logging
from typing import List, Optional
from fastapi import UploadFile
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.document import Document, DocumentStatus, Collection
from app.rag.extractor import DocumentExtractor, ExtractionError
from app.rag.chunker import TextChunker
from app.rag.embeddings import get_embedding_provider
from app.rag.vector_store import VectorStoreManager

logger = logging.getLogger("accurate_ai.document_service")


class DocumentService:
    @staticmethod
    def _safe_filename(filename: str) -> str:
        # Prevent path traversal and illegal chars
        base = os.path.basename(filename)
        cleaned = "".join(c for c in base if c.isalnum() or c in "._- ")
        return cleaned or "document"

    @classmethod
    def save_upload_and_create(cls, db: Session, user_id: str, file: UploadFile) -> Document:
        filename = cls._safe_filename(file.filename or "upload")
        
        # Determine and validate extension
        ext = os.path.splitext(filename)[1].lower()
        if ext not in DocumentExtractor.SUPPORTED_EXTENSIONS:
            raise ValueError(
                f"Unsupported file type '{ext}'. Supported formats: {', '.join(DocumentExtractor.SUPPORTED_EXTENSIONS)}"
            )

        # Create user upload directory
        user_upload_dir = os.path.join(settings.UPLOAD_DIRECTORY, user_id)
        os.makedirs(user_upload_dir, exist_ok=True)

        doc_id = str(uuid.uuid4())
        saved_filename = f"{doc_id}_{filename}"
        saved_path = os.path.join(user_upload_dir, saved_filename)

        # Write to disk and calculate hash
        hasher = hashlib.sha256()
        bytes_read = 0
        max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024

        with open(saved_path, "wb") as out_file:
            while chunk := file.file.read(1024 * 64):
                bytes_read += len(chunk)
                if bytes_read > max_bytes:
                    out_file.close()
                    if os.path.exists(saved_path):
                        os.remove(saved_path)
                    raise ValueError(f"File size exceeds maximum allowed limit of {settings.MAX_FILE_SIZE_MB}MB.")
                hasher.update(chunk)
                out_file.write(chunk)

        file_hash = hasher.hexdigest()

        # Check duplicate file for this user
        existing_doc = db.query(Document).filter(
            Document.user_id == user_id,
            Document.file_hash == file_hash,
            Document.status == DocumentStatus.COMPLETED
        ).first()

        if existing_doc:
            logger.info(f"Duplicate document detected for user {user_id}: {existing_doc.file_name}. Reusing indexed chunks.")
            doc = Document(
                id=doc_id,
                user_id=user_id,
                file_name=filename,
                file_path=saved_path,
                file_type=ext.lstrip("."),
                file_size_bytes=bytes_read,
                page_count=existing_doc.page_count,
                chunk_count=existing_doc.chunk_count,
                status=DocumentStatus.COMPLETED,
                file_hash=file_hash,
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)
            return doc

        doc = Document(
            id=doc_id,
            user_id=user_id,
            file_name=filename,
            file_path=saved_path,
            file_type=ext.lstrip("."),
            file_size_bytes=bytes_read,
            page_count=0,
            chunk_count=0,
            status=DocumentStatus.UPLOADED,
            file_hash=file_hash,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return doc

    @classmethod
    def process_document(cls, db: Session, document_id: str, user_id: str) -> Document:
        doc = db.query(Document).filter(Document.id == document_id, Document.user_id == user_id).first()
        if not doc:
            raise ValueError("Document not found.")

        if doc.status == DocumentStatus.COMPLETED:
            return doc

        doc.status = DocumentStatus.PROCESSING
        doc.error_message = None
        db.commit()

        try:
            # 1. Extract text and pages
            pages, page_count, ocr_required = DocumentExtractor.extract(doc.file_path, doc.file_name)
            doc.page_count = page_count
            doc.ocr_required = ocr_required

            if ocr_required:
                doc.status = DocumentStatus.FAILED
                doc.error_message = (
                    "Insufficient text extracted from PDF. This document appears to be a scanned image "
                    "or empty. OCR is required to extract text."
                )
                db.commit()
                return doc

            # 2. Get associated collection IDs for metadata
            collections = [c.id for c in doc.collections]

            # 3. Chunk text with metadata preservation
            chunker = TextChunker()
            chunks = chunker.chunk_pages(
                pages=pages,
                document_id=doc.id,
                document_name=doc.file_name,
                user_id=user_id,
                collection_ids=collections
            )

            if not chunks:
                doc.status = DocumentStatus.FAILED
                doc.error_message = "No text content could be extracted into chunks from this document."
                db.commit()
                return doc

            # 4. Generate embeddings
            texts_to_embed = [c.text for c in chunks]
            embedding_provider = get_embedding_provider()
            embeddings = embedding_provider.embed_documents(texts_to_embed)

            # 5. Upsert chunks into ChromaDB
            VectorStoreManager.add_chunks(
                user_id=user_id,
                document_id=doc.id,
                chunks=chunks,
                embeddings=embeddings
            )

            # 6. Mark completed
            doc.status = DocumentStatus.COMPLETED
            doc.chunk_count = len(chunks)
            doc.error_message = None
            db.commit()
            db.refresh(doc)
            return doc

        except Exception as e:
            logger.error(f"Document processing failed for {document_id}: {e}", exc_info=True)
            doc.status = DocumentStatus.FAILED
            doc.error_message = str(e)
            db.commit()
            return doc

    @classmethod
    def retry_document(cls, db: Session, user_id: str, document_id: str) -> Document:
        return cls.process_document(db, document_id, user_id)

    @classmethod
    def delete_document(cls, db: Session, user_id: str, document_id: str) -> bool:
        doc = db.query(Document).filter(Document.id == document_id, Document.user_id == user_id).first()
        if not doc:
            return False

        # Remove from vector store
        VectorStoreManager.delete_document(user_id=user_id, document_id=document_id)

        # Remove physical file
        if doc.file_path and os.path.exists(doc.file_path):
            try:
                os.remove(doc.file_path)
            except Exception as e:
                logger.warning(f"Could not remove file {doc.file_path}: {e}")

        db.delete(doc)
        db.commit()
        return True

    @classmethod
    def list_documents(cls, db: Session, user_id: str) -> List[Document]:
        return db.query(Document).filter(Document.user_id == user_id).order_by(Document.created_at.desc()).all()

    @classmethod
    def get_document(cls, db: Session, user_id: str, document_id: str) -> Optional[Document]:
        return db.query(Document).filter(Document.id == document_id, Document.user_id == user_id).first()
