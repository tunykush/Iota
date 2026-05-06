<!--
DOCUMENT METADATA
Owner: @systems-architect
Update trigger: System architecture changes, new integrations, component additions
Update scope:
  @systems-architect: Entire document
  @frontend-developer: May append to "Frontend Architecture" (never overwrite)
  @backend-developer: May append to "Backend Architecture" (never overwrite)
Read by: All agents. Always read before making implementation decisions.
For design tokens, component specs, and UX flows see DESIGN_SYSTEM.md (@ui-ux-designer).
-->

# System Architecture

> Last updated: 2026-05-06
> Version: 1.0

---

## Overview

Private RAG Chatbot uses retrieval-augmented generation to answer questions from user-owned knowledge. Sources are ingested into normalized text chunks, converted to embeddings, stored with source metadata, retrieved by semantic similarity, and passed into an LLM prompt that requires grounded answers and citations.

The MVP keeps metadata and vectors together in PostgreSQL with pgvector. This reduces operational complexity while preserving an upgrade path to Qdrant, Pinecone, Milvus, or another vector database through a vector store interface.

```text
User
  |
  v
Next.js Web App
  |
  v
FastAPI Backend
  |--------------------------|
  |                          |
  v                          v
PostgreSQL + pgvector        Provider Adapters
  |                          |
  |                          |-- Embeddings: OpenAI or local model
  |                          |-- LLM: OpenAI or Ollama-compatible model
  |
  v
Documents, chunks, embeddings, jobs, chat history
```

---

## Tech Stack

| Layer | Technology | Version | Why Chosen |
|-------|------------|---------|------------|
| Frontend | Next.js + React + TypeScript | TBD | Strong app UI ecosystem and clear API integration |
| Styling | Tailwind CSS or chosen design system | TBD | Fast accessible UI implementation |
| Backend | Python FastAPI | TBD | Python AI ecosystem, typed API layer, OpenAPI docs |
| Metadata DB | PostgreSQL | 16 target | Reliable relational model for users, docs, chunks, jobs, chat |
| Vector DB | pgvector | latest compatible | MVP simplicity: vectors live beside metadata |
| ORM / Migrations | SQLAlchemy + Alembic | TBD | Mature Python schema and migration workflow |
| PDF parsing | PyMuPDF, pdfplumber fallback | TBD | Page-aware extraction for citations |
| Website extraction | trafilatura + BeautifulSoup | TBD | Readable content extraction from HTML |
| Embeddings | OpenAI default, local adapter optional | TBD | Good quality with provider abstraction |
| LLM | OpenAI default, Ollama-compatible optional | TBD | Swappable generation provider |
| Auth | JWT or httpOnly session cookies | TBD | User data isolation |
| Jobs | FastAPI background tasks for MVP | TBD | Simple path before queue worker |
| Deployment | Docker Compose local, cloud target TBD | TBD | Repeatable local stack |

---

## System Components

### Frontend Architecture

The frontend will be a Next.js application with four primary screens:

- Chat workspace: ask questions, view answers, inspect citations.
- Upload PDF: submit files and watch ingestion status.
- Crawl website: submit URLs and view crawl results.
- Documents: list, filter, and delete ingested sources.

**Routing**: Next.js App Router, planned under `apps/web/src/app/`.

**State management**: Server state via React Query or native Next.js data patterns; final choice TBD during scaffolding.

**Component structure**:

```text
apps/web/src/components/
  ui/             # primitives: Button, Input, Dialog, Tabs
  chat/           # message list, composer, citation panel
  documents/      # source list, filters, delete flow
  ingestion/      # upload and crawl forms, job status
  layout/         # app shell and navigation
```

### Backend Architecture

The backend will be a FastAPI application with thin route handlers and explicit services:

```text
apps/api/app/
  api/            # route modules
  core/           # config, auth, logging
  db/             # sessions, migrations, models
  schemas/        # request/response DTOs
  services/
    ingestion/    # PDF, website, database source ingestion
    rag/          # chunking, embeddings, retrieval, prompt assembly
    providers/    # embedding and LLM adapters
```

**API style**: REST with JSON responses and OpenAPI docs.

**Middleware stack**:

1. Request ID and structured logging.
2. Authentication for private endpoints.
3. Request validation through Pydantic schemas.
4. Error handling with standard error format.

**Service layer pattern**: Routes validate input and call services. Services own ingestion, retrieval, provider calls, persistence, and error handling.

### Provider Abstraction

Embedding and LLM providers must be interfaces, not direct calls spread through business logic.

```text
EmbeddingProvider.embed_texts(texts) -> list[Embedding]
LLMProvider.generate(messages, options) -> LLMResponse
VectorStore.search(query_embedding, filters, top_k) -> list[RetrievedChunk]
```

---

## Infrastructure

**Environments**:

| Environment | URL | Branch | Notes |
|-------------|-----|--------|-------|
| Production | TBD | `main` | Deployment target not chosen |
| Local web | `http://localhost:3000` | any | Next.js dev server |
| Local API | `http://localhost:8000` | any | FastAPI dev server |
| Local DB | `localhost:5432` | any | PostgreSQL with pgvector via Docker Compose |

**CI/CD**: GitHub Actions planned for lint, tests, type checks, migration checks, and build verification.

---

## Data Flow

### PDF Ingestion

```text
1. User uploads PDF.
2. API creates a document row and ingestion job row.
3. PDF parser extracts page-aware text.
4. Text cleaner removes empty content and normalizes whitespace.
5. Chunker splits text into 500-1000 token chunks with 100-200 token overlap.
6. Embedding provider generates embeddings for chunks.
7. Chunks, embeddings, and citation metadata are stored.
8. Ingestion job status changes to succeeded or failed.
```

### Website Ingestion

```text
1. User submits URL.
2. API validates URL against security and crawl rules.
3. Fetcher downloads content using configured user agent.
4. Extractor removes boilerplate and keeps readable text.
5. Chunker and embedding pipeline process the text.
6. Document and chunk metadata store URL, title, crawl time, and content hash.
```

### Chat Retrieval

```text
1. User asks a question.
2. API stores the user message.
3. Embedding provider embeds the question.
4. Vector store searches user-owned chunks with optional document filters.
5. Optional reranker reorders candidates.
6. Prompt assembler builds system, context, and user messages.
7. LLM provider generates an answer.
8. API stores assistant message and retrieved source references.
9. Frontend renders answer and citations.
```

---

## Design system and UX

The canonical design system, component inventory, and user flow summaries live in `DESIGN_SYSTEM.md`.

---

## Security Architecture

**Authentication model**: JWT or httpOnly session cookies. Final decision TBD.

**Authorization**: All document, chunk, job, and chat queries filter by authenticated `user_id`.

**Data protection**:

- No API keys stored in source code.
- Uploaded files size-limited and content-type validated.
- URL ingestion validates scheme and host to reduce SSRF risk.
- Retrieval logs exclude raw secrets.

---

## Performance Considerations

- Use pgvector indexes for vector search.
- Store content hashes to avoid duplicate ingestion when possible.
- Make chunk size and overlap configurable.
- Use batch embedding calls when provider supports it.
- Move ingestion to a queue worker when in-process jobs become a bottleneck.

---

## Known Constraints and Technical Debt

| Item | Impact | Plan |
|------|--------|------|
| In-process ingestion for MVP | Long PDF or crawl jobs may tie up API workers | Move to queue worker after MVP |
| pgvector as initial vector store | Simpler operations but less specialized vector scaling | Keep vector store interface swappable |
| OCR excluded from v1 | Scanned PDFs may have poor extraction | Add OCR pipeline if product owner confirms need |
| Single-page crawl first | Does not build a whole site knowledge base automatically | Add depth-limited crawl after security rules are approved |
