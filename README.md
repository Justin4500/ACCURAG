# Accurate AI — Enterprise Document Question-Answering (RAG)

Accurate AI is a modern, production-grade AI document chatbot and Retrieval-Augmented Generation (RAG) platform. It allows users to upload documents (PDF, DOCX, TXT, Markdown, CSV), organize them into collections, ask natural language questions, and receive grounded AI answers accompanied by exact source citations with document names and page numbers.

---

## Key Features

1. **Grounded RAG Pipeline**:
   - Zero hallucination guarantee: answers strictly rely on retrieved excerpts.
   - Transparent, verifiable citations specifying exact document source and page number.
   - Honest fallback: responds clearly when documents do not contain the answer:
     `"I couldn't find sufficient information to answer this question from your uploaded documents."`
   - Anti-prompt-injection defense: treats document content as passive untrusted data that cannot override system instructions.

2. **Multi-Format Document Processing**:
   - PDF text extraction with PyMuPDF with preserved page numbers.
   - Support for Word (`.docx`), Plain Text (`.txt`), Markdown (`.md`), and CSV files.
   - Scanned PDF detection: alerts the user when a document is scanned and requires OCR rather than failing silently.
   - Chunking with configurable parameters (~600 tokens, 80-token overlap).

3. **Persistent Databases**:
   - **PostgreSQL**: Primary relational database for users, user settings, collections, conversations, messages, and document metadata.
   - **ChromaDB**: High-performance persistent vector database storing chunk embeddings and metadata with user-level isolation.
   - Automatic graceful fallback to local SQLite if PostgreSQL is not currently running, preventing application boot crashes during local exploration.

4. **Multi-Provider AI & Embeddings**:
   - **Inference**: Google Gemini API (`gemini-2.5-flash` / configurable).
   - **Embeddings**: Google Gemini `text-embedding-004` (zero RAM footprint) or local FastEmbed (`BAAI/bge-small-en-v1.5` ONNX, optimized for 8GB RAM laptops).
   - Real-time token streaming with Server-Sent Events (SSE).

5. **Document & Chat Management**:
   - Organize documents into custom collections and scope questions to individual collections.
   - Full conversation persistence with history grouped by Today, Yesterday, Previous 7 Days, and Older.
   - Rename, delete, and manage conversations and document uploads.
   - Positive/negative answer feedback buttons and copy-to-clipboard.

6. **Authentication & Security**:
   - JWT authentication with bcrypt password hashing.
   - User data isolation: documents and chats are strictly segregated per user.
   - Real Google OAuth integration support (with honest setup guidance).
   - File upload limits (configurable 50MB, 500 pages, 5 files per batch).

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Axios, React Markdown |
| **Backend** | Python 3.13, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, Uvicorn |
| **Relational DB** | PostgreSQL (psycopg3 / psycopg2) with SQLite local fallback |
| **Vector DB** | ChromaDB (persistent local HNSW index) |
| **AI / RAG** | Google GenAI SDK (`google-genai`), PyMuPDF, FastEmbed ONNX |

---

## Project Structure

```
accurate-ai/
├── backend/
│   ├── alembic/              # Alembic database migration scripts
│   ├── app/
│   │   ├── api/              # FastAPI routers (auth, documents, chat, rag, etc.)
│   │   ├── core/             # Configuration and security (JWT, bcrypt)
│   │   ├── database/         # SQLAlchemy engine, session, and base
│   │   ├── models/           # DB tables (User, Document, Collection, Message, etc.)
│   │   ├── rag/              # Extractor, chunker, embeddings, ChromaDB, RAG engine
│   │   ├── schemas/          # Pydantic v2 validation models
│   │   ├── services/         # Business logic layer
│   │   └── main.py           # FastAPI application entrypoint
│   ├── tests/                # Pytest test suite (auth, RAG, isolation)
│   ├── requirements.txt      # Python dependencies
│   └── alembic.ini           # Migration settings
│
├── frontend/
│   ├── src/
│   │   ├── components/       # UI components (chat, documents, collections, auth, etc.)
│   │   ├── contexts/         # React Contexts (AuthContext, ThemeContext)
│   │   ├── services/         # Axios API clients & SSE streaming handlers
│   │   ├── types/            # TypeScript data interfaces
│   │   ├── App.tsx           # Main workspace coordinator
│   │   └── index.css         # Tailwind v4 styles & design tokens
│   ├── package.json
│   └── vite.config.ts
│
├── data/
│   ├── uploads/              # Local user uploaded documents
│   └── chroma/               # Persistent ChromaDB vector indexes
│
├── evaluation_documents/     # Sample PDF and TXT documents for testing
├── .env.example              # Environment variables template
├── .env                      # Active local configuration
├── .gitignore
└── README.md
```

---

## Prerequisites

1. **Windows 11 / 10**
2. **Python 3.13 or 3.14** (Python 3.13 is recommended for pre-built binary wheels)
3. **Node.js v18+ and npm**
4. **Git**
5. **PostgreSQL** (Optional for local testing; SQLite fallback is built-in if PostgreSQL service is stopped)

---

## Installation & Setup

Open **Windows PowerShell** in the project root directory (`d:\ACCURAG`):

### 1. Environment Configuration

Copy the example environment configuration:
```powershell
Copy-Item .env.example .env
```

Open `.env` in your editor and configure your Gemini API Key:
```ini
GEMINI_API_KEY=your_gemini_api_key_here
```
*(Get a free API key at [Google AI Studio](https://aistudio.google.com/app/apikey))*

> **Note**: If `GEMINI_API_KEY` is not provided, the application will still start and run. You can also paste your Gemini API key directly into the **Settings** view in the UI.

---

### 2. PostgreSQL Setup (Optional / Production)

If you have PostgreSQL installed, create the database:
```sql
CREATE DATABASE accurate_ai;
```

In `.env`, configure your PostgreSQL credentials:
```ini
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/accurate_ai
```

*(If PostgreSQL is not running on your machine, Accurate AI automatically falls back to `./data/accurate_ai_fallback.db` without crashing).*

---

### 3. Backend Setup

From the root directory:

```powershell
# Create virtual environment with Python 3.13
py -3.13 -m venv backend/venv

# Activate virtual environment
.\backend\venv\Scripts\Activate.ps1

# Install backend dependencies
.\backend\venv\Scripts\pip.exe install -r backend/requirements.txt
```

Run Alembic database migrations:
```powershell
$env:PYTHONPATH="backend"
.\backend\venv\Scripts\alembic.exe upgrade head
```

---

### 4. Frontend Setup

In a new PowerShell terminal, install frontend dependencies:
```powershell
cd frontend
npm.cmd install
```

---

## Running the Application

### 1. Start the Backend API Server

In your backend terminal (with virtual environment):
```powershell
cd d:\ACCURAG
$env:PYTHONPATH="backend"
.\backend\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- Backend API Docs (Swagger UI): `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

---

### 2. Start the Frontend Dev Server

In your frontend terminal:
```powershell
cd d:\ACCURAG\frontend
npm.cmd run dev
```
- Open browser at: `http://localhost:3000`

---

## Running the Automated Test Suite

Accurate AI includes end-to-end tests covering authentication, PDF extraction, chunking, embeddings, ChromaDB semantic search, user data isolation, and conversation persistence.

Run the test suite:
```powershell
cd d:\ACCURAG
$env:PYTHONPATH="backend"
.\backend\venv\Scripts\pytest.exe backend/tests -v
```

Expected output:
```
backend/tests/test_auth.py::test_user_registration_and_login PASSED
backend/tests/test_isolation_and_persistence.py::test_user_data_isolation PASSED
backend/tests/test_isolation_and_persistence.py::test_conversation_persistence PASSED
backend/tests/test_rag_pipeline.py::test_file_validation PASSED
backend/tests/test_rag_pipeline.py::test_pdf_extraction_and_page_preservation PASSED
backend/tests/test_rag_pipeline.py::test_scanned_pdf_detection PASSED
backend/tests/test_rag_pipeline.py::test_text_chunking PASSED
backend/tests/test_rag_pipeline.py::test_local_embeddings_and_vector_store PASSED
backend/tests/test_rag_pipeline.py::test_rag_prompt_grounding_and_unanswerable_fallback PASSED
============================== 9 passed in 7.67s ==============================
```

---

## Testing with Sample Documents

Sample documents are pre-generated in `d:\ACCURAG\evaluation_documents/`:
1. `annual_tech_report_2026.pdf` (Multi-page report containing financial metrics, revenue, and SOC2 compliance dates).
2. `company_policy_handbook.txt` (Equipment stipends, 18-week parental leave, travel reimbursements).

### Quick Testing Walkthrough:
1. Open `http://localhost:3000`.
2. Register an account with your email and password.
3. Drag & drop `evaluation_documents/annual_tech_report_2026.pdf` into the upload zone.
4. Watch the document status change to `Completed` with 3 pages indexed.
5. In the chat input, ask:
   > *"What was the consolidated revenue in fiscal year 2026 and what percentage growth does that represent?"*
6. Receive the grounded answer with citations linking directly to **Page 1** of `annual_tech_report_2026.pdf`.
7. Ask an unanswerable question:
   > *"What is the recipe for chocolate chip cookies?"*
8. Observe the honest fallback:
   > *"I couldn't find sufficient information to answer this question from your uploaded documents."*

---

## Common Errors and Solutions

| Issue | Cause | Solution |
|---|---|---|
| `Execution_Policies` error in PowerShell | Windows blocks `.ps1` script execution | Use `npm.cmd` instead of `npm`, and invoke Python binaries directly via `.\backend\venv\Scripts\python.exe` |
| `psycopg.errors.ConnectionTimeout` | PostgreSQL is not running on port 5432 | The system automatically falls back to SQLite (`./data/accurate_ai_fallback.db`). To use PostgreSQL, start PostgreSQL from Windows Services or run `pg_ctl start`. |
| `Gemini API Key Required` message in Chat | `GEMINI_API_KEY` is not configured | Open the **Settings** view in the UI or set `GEMINI_API_KEY` in `.env`. |
| `Scanned PDF detected (OCR required)` | PDF has no text layer (image-only) | Accurate AI alerts you that optical character recognition is needed for image-only scans. |
