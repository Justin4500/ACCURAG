import os
import csv
from typing import List, Dict, Any, Tuple
import fitz
import docx
from app.core.config import settings


class ExtractionError(Exception):
    pass


class ScannedPdfError(ExtractionError):
    pass


class DocumentExtractor:
    """Extracts text page-by-page from PDF, DOCX, TXT, MD, CSV files."""

    SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md", ".csv"}

    @classmethod
    def validate_file(cls, filename: str, file_size_bytes: int) -> str:
        ext = os.path.splitext(filename)[1].lower()
        if ext not in cls.SUPPORTED_EXTENSIONS:
            raise ExtractionError(
                f"Unsupported file type '{ext}'. Supported types: {', '.join(cls.SUPPORTED_EXTENSIONS)}"
            )

        max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
        if file_size_bytes > max_bytes:
            raise ExtractionError(
                f"File size exceeds maximum limit of {settings.MAX_FILE_SIZE_MB}MB."
            )

        return ext

    @classmethod
    def extract(cls, file_path: str, filename: str) -> Tuple[List[Dict[str, Any]], int, bool]:
        """
        Extracts content from document.
        Returns:
            - List of page dicts: [{"page_number": int, "text": str}]
            - Total page count
            - ocr_required boolean flag
        """
        ext = os.path.splitext(filename)[1].lower()

        if ext == ".pdf":
            return cls._extract_pdf(file_path)
        elif ext == ".docx":
            return cls._extract_docx(file_path)
        elif ext in {".txt", ".md"}:
            return cls._extract_text(file_path)
        elif ext == ".csv":
            return cls._extract_csv(file_path)
        else:
            raise ExtractionError(f"Unsupported format: {ext}")

    @classmethod
    def _extract_pdf(cls, file_path: str) -> Tuple[List[Dict[str, Any]], int, bool]:
        pages_content = []
        try:
            doc = fitz.open(file_path)
        except Exception as e:
            raise ExtractionError(f"Failed to open PDF document: {str(e)}")

        total_pages = len(doc)
        if total_pages == 0:
            doc.close()
            raise ExtractionError("PDF file contains no pages.")

        if total_pages > settings.MAX_PDF_PAGES:
            doc.close()
            raise ExtractionError(
                f"PDF exceeds maximum page limit of {settings.MAX_PDF_PAGES} pages (Document has {total_pages})."
            )

        total_extracted_chars = 0

        for page_num in range(total_pages):
            page = doc.load_page(page_num)
            text = page.get_text("text") or ""
            cleaned_text = cls._clean_text(text)
            total_extracted_chars += len(cleaned_text)

            pages_content.append({
                "page_number": page_num + 1,
                "text": cleaned_text
            })

        doc.close()

        # Check for scanned PDF: if average extracted characters per page is extremely low
        avg_chars_per_page = total_extracted_chars / max(total_pages, 1)
        if avg_chars_per_page < 20 and total_extracted_chars < 80:
            return pages_content, total_pages, True

        return pages_content, total_pages, False

    @classmethod
    def _extract_docx(cls, file_path: str) -> Tuple[List[Dict[str, Any]], int, bool]:
        try:
            doc = docx.Document(file_path)
        except Exception as e:
            raise ExtractionError(f"Failed to read DOCX file: {str(e)}")

        full_text = []
        for para in doc.paragraphs:
            if para.text.strip():
                full_text.append(para.text.strip())

        # For tables
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                if row_text:
                    full_text.append(row_text)

        joined_text = "\n\n".join(full_text)
        cleaned = cls._clean_text(joined_text)

        if not cleaned:
            raise ExtractionError("DOCX file is empty or contains no readable text.")

        # Estimate pages based on 2500 characters per page
        page_chunk_size = 2500
        text_chunks = [cleaned[i:i + page_chunk_size] for i in range(0, len(cleaned), page_chunk_size)]
        pages = [{"page_number": idx + 1, "text": chunk} for idx, chunk in enumerate(text_chunks)]

        return pages, len(pages), False

    @classmethod
    def _extract_text(cls, file_path: str) -> Tuple[List[Dict[str, Any]], int, bool]:
        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
        except Exception as e:
            raise ExtractionError(f"Failed to read text file: {str(e)}")

        cleaned = cls._clean_text(content)
        if not cleaned:
            raise ExtractionError("Text document is empty.")

        page_chunk_size = 2500
        text_chunks = [cleaned[i:i + page_chunk_size] for i in range(0, len(cleaned), page_chunk_size)]
        pages = [{"page_number": idx + 1, "text": chunk} for idx, chunk in enumerate(text_chunks)]

        return pages, len(pages), False

    @classmethod
    def _extract_csv(cls, file_path: str) -> Tuple[List[Dict[str, Any]], int, bool]:
        try:
            rows = []
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                reader = csv.reader(f)
                for row in reader:
                    if any(cell.strip() for cell in row):
                        rows.append(" , ".join(cell.strip() for cell in row))
        except Exception as e:
            raise ExtractionError(f"Failed to read CSV file: {str(e)}")

        if not rows:
            raise ExtractionError("CSV document is empty.")

        # Group rows into logical chunks
        batch_size = 40
        row_batches = [rows[i:i + batch_size] for i in range(0, len(rows), batch_size)]
        pages = [
            {"page_number": idx + 1, "text": "\n".join(batch)}
            for idx, batch in enumerate(row_batches)
        ]

        return pages, len(pages), False

    @staticmethod
    def _clean_text(text: str) -> str:
        if not text:
            return ""
        # Remove null bytes and excessive carriage returns
        text = text.replace("\x00", " ").replace("\r\n", "\n").replace("\r", "\n")
        # Collapse excessive whitespace but keep paragraphs
        lines = [line.strip() for line in text.split("\n")]
        return "\n".join(lines).strip()
