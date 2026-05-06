# Private RAG Chatbot

> AI chatbot for answering questions from private PDFs, crawled websites, and structured database knowledge using embeddings, vector retrieval, and an LLM.

---

## Overview

Private RAG Chatbot is a product blueprint for a retrieval-augmented AI assistant that learns from user-owned content. Users can upload PDF files, ingest website pages, connect structured data, and ask questions through a chat interface that answers only from retrieved context.

The system is designed for students, researchers, internal teams, and knowledge workers who need a trustworthy assistant over their own documents instead of a general chatbot that may hallucinate. Every answer should include citations when sources are available, and the assistant must clearly say when the uploaded knowledge base does not contain enough information.

The initial implementation target is a production-ready MVP using FastAPI, Next.js, PostgreSQL, pgvector, background ingestion jobs, and a swappable LLM/embedding provider layer.

---

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | Next.js, React, TypeScript | Chat UI, upload flows, document management |
| Styling | Tailwind CSS or project design system | Final choice captured in `docs/technical/DESIGN_SYSTEM.md` |
| Backend | Python FastAPI | REST API, ingestion orchestration, chat endpoint |
| Metadata DB | PostgreSQL | Users, documents, chunks, jobs, chat history |
| Vector DB | pgvector | Keeps metadata and vectors in one PostgreSQL deployment for MVP |
| ORM / Migrations | SQLAlchemy + Alembic | Explicit schema and reversible migrations |
| PDF Parsing | PyMuPDF first, pdfplumber fallback | Page-aware text extraction and citations |
| Website Extraction | trafilatura + BeautifulSoup | Clean readable text from HTML |
| Embeddings | OpenAI embeddings by default, local option via sentence-transformers | Provider abstraction required |
| LLM | OpenAI by default, Ollama-compatible local option | Provider abstraction required |
| Auth | JWT or session cookies | User-scoped private data |
| Jobs | FastAPI background tasks for MVP, queue in v1.1 | Ingestion status tracking |
| Deployment | Docker Compose for local, cloud target TBD | Postgres + API + web |
| CI/CD | GitHub Actions | Lint, tests, type checks, migrations |

---

## Core Capabilities

- Upload PDF files and ingest page-aware chunks.
- Crawl website URLs and ingest cleaned article/page content.
- Store source metadata, chunk text, embeddings, and citation fields.
- Search relevant chunks using vector similarity, with hybrid keyword search planned.
- Generate grounded Vietnamese answers from retrieved context.
- Return source citations by file name, page number, or URL.
- Refuse unsupported answers when context is missing.
- Keep user data isolated by authenticated user ID.

---

## Getting Started

This repository currently contains the product specification, architecture, API contract, database design, and implementation backlog. Application source code should be created from the tasks in `TODO.md`.

### Prerequisites

- Node.js 20+ for the Next.js frontend.
- Python 3.12+ for the FastAPI backend.
- Docker Desktop for local PostgreSQL with pgvector.
- An LLM provider key, for example `OPENAI_API_KEY`, unless using a local Ollama model.

### Planned Local Commands

```bash
# Backend
cd apps/api
python -m venv .venv
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd apps/web
npm install
npm run dev

# Local services
docker compose up -d postgres
```

### Planned URLs

- Frontend: `http://localhost:3000`
- API: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`

---

## Project Structure

```text
project-root/
  apps/
    api/                    # Planned FastAPI backend
    web/                    # Planned Next.js frontend
  docs/
    technical/
      ARCHITECTURE.md       # System architecture and RAG data flows
      API.md                # REST API contract
      DATABASE.md           # PostgreSQL + pgvector schema plan
      DECISIONS.md          # Architecture decision records
      DESIGN_SYSTEM.md      # UX and reusable UI decisions
      RAG_PROMPTS.md        # LLM prompts and prompt assembly rules
    user/
      USER_GUIDE.md         # User-facing product guide
    content/
      CONTENT_STRATEGY.md   # Public copy and SEO strategy
  .tasks/                   # Detailed implementation backlog
  PRD.md                    # Product requirements source of truth
  TODO.md                   # Prioritized task list
  CLAUDE.md                 # Agent/project instructions
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string with pgvector enabled |
| `OPENAI_API_KEY` | Yes for OpenAI mode | Used for default embeddings and LLM calls |
| `EMBEDDING_PROVIDER` | Yes | `openai`, `local`, or future provider name |
| `EMBEDDING_MODEL` | Yes | Embedding model ID, for example `text-embedding-3-small` |
| `LLM_PROVIDER` | Yes | `openai`, `ollama`, or future provider name |
| `LLM_MODEL` | Yes | Chat model ID |
| `OLLAMA_BASE_URL` | No | Local Ollama endpoint when using local LLMs |
| `JWT_SECRET` | Yes | Secret for signing auth tokens or sessions |
| `APP_BASE_URL` | Yes | Public frontend base URL |
| `API_BASE_URL` | Yes | Public API base URL |
| `MAX_UPLOAD_MB` | Yes | Maximum allowed PDF upload size |
| `CRAWLER_USER_AGENT` | Yes | User agent used for website ingestion |
| `ALLOWED_CRAWL_DOMAINS` | No | Optional comma-separated crawl allowlist |

See `.env.example` for a starter configuration.

---

## Documentation

- Product requirements: `PRD.md`
- Architecture: `docs/technical/ARCHITECTURE.md`
- API contract: `docs/technical/API.md`
- Database plan: `docs/technical/DATABASE.md`
- Prompting rules: `docs/technical/RAG_PROMPTS.md`
- User guide: `docs/user/USER_GUIDE.md`
- Backlog: `TODO.md`

---

## License

TBD.
