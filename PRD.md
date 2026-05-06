# Product Requirements Document

> [!WARNING]
> HUMAN APPROVAL REQUIRED TO EDIT
> This document is the source of truth for what we are building.
> Claude agents must READ this document to understand requirements.
> Do not edit, rewrite, or update to reflect current state unless the human has explicitly instructed you to do so in the current conversation.
> When in doubt, leave it unchanged and ask the human.

---

**Version**: 1.0
**Status**: Draft
**Last updated by human**: 2026-05-06
**Product owner**: TBD

---

## 1. Executive Summary

Private RAG Chatbot is an AI assistant that answers questions using private knowledge supplied by the user. The system ingests PDF files, website content, and structured database records, converts them into searchable vector embeddings, retrieves relevant chunks, and uses an LLM to produce grounded answers with citations. The primary users are students, researchers, internal teams, and knowledge workers who need fast synthesis over trusted materials. The product must avoid unsupported claims and clearly state when the provided knowledge base does not contain enough information.

---

## 2. Problem Statement

### 2.1 Current Situation

Users often keep important knowledge across PDFs, course documents, reports, websites, notes, and databases. To answer a question, they manually search files, open multiple browser tabs, skim long documents, copy text into a general chatbot, and still need to verify whether the answer is supported.

### 2.2 The Problem

General LLM chatbots are useful but are not grounded in a user's private materials by default. They may hallucinate, miss source context, or fail to cite where an answer came from. Users need a reliable way to ingest their own sources, ask natural-language questions, and receive answers that are tied back to specific documents, pages, URLs, or records.

### 2.3 Why Now

Modern embedding models, vector databases, and LLM APIs make retrieval-augmented generation practical for small teams and individual users. pgvector also allows the MVP to keep metadata and vector search inside PostgreSQL, reducing operational complexity while still supporting a path to dedicated vector databases later.

---

## 3. Goals & Success Metrics

### 3.1 Business Goals

- Deliver a working MVP that can answer questions from uploaded PDFs with citations.
- Expand ingestion to website URLs and structured database records without changing the chat interface.
- Build a provider-agnostic architecture so embedding and LLM providers can be swapped.
- Establish trustworthy behavior: no hallucinated answers when context is missing.

### 3.2 Success Metrics

| Metric | Baseline | Target | How Measured |
|--------|----------|--------|--------------|
| Time to first grounded answer | N/A | Under 5 minutes from first PDF upload | Product analytics and manual QA |
| Citation coverage | 0% | 95% of grounded answers include at least one citation | Automated answer inspection and QA |
| Unsupported-answer refusal rate | N/A | 100% refusal for seeded out-of-context questions | Evaluation test set |
| Retrieval relevance | N/A | 80% top-5 recall on curated questions | RAG evaluation set |
| PDF ingestion reliability | N/A | 95% successful ingestion for supported PDFs | Ingestion job metrics |

---

## 4. User Personas

### Persona: Student Researcher

- **Role**: Student or self-learner working with lecture notes, rubrics, papers, and textbooks.
- **Goals**: Upload course PDFs, ask questions, summarize topics, and locate supporting pages quickly.
- **Pain points**: Searching long PDFs manually, losing track of sources, and getting generic answers not tied to course material.
- **Technical level**: Moderate.
- **Usage frequency**: Weekly to daily.

### Persona: Knowledge Team Member

- **Role**: Internal operations, support, compliance, or project team member.
- **Goals**: Query private policies, reports, webpages, and records from a single chat interface.
- **Pain points**: Information is scattered across websites, PDFs, shared drives, and databases.
- **Technical level**: Non-technical to moderate.
- **Usage frequency**: Daily.

### Persona: Developer / Admin

- **Role**: Technical owner configuring providers, databases, ingestion jobs, and deployment.
- **Goals**: Maintain a secure, observable, extensible RAG system.
- **Pain points**: Vendor lock-in, hard-to-debug retrieval behavior, fragile scraping, and untracked ingestion failures.
- **Technical level**: Developer.
- **Usage frequency**: Weekly to daily during setup and maintenance.

---

## 5. Functional Requirements

Requirements are numbered FR-XXX for unambiguous cross-referencing by agents and in tests.

### 5.1 Authentication and User Scope

- **FR-001**: Users must be able to create an account and log in before storing private documents.
- **FR-002**: Every document, chunk, embedding, crawl job, and chat conversation must be scoped to a `user_id`.
- **FR-003**: Users must only retrieve, chat with, update, or delete their own data.

### 5.2 PDF Ingestion

- **FR-010**: Users must be able to upload PDF files through the web UI.
- **FR-011**: The backend must extract text from each PDF while preserving page numbers for citations.
- **FR-012**: Extracted PDF text must be cleaned, split into chunks of about 500-1000 tokens, and stored with 100-200 token overlap.
- **FR-013**: Each PDF chunk must be embedded and stored in the vector database with document metadata.
- **FR-014**: Users must be able to view ingestion status and errors for uploaded PDFs.

### 5.3 Website Ingestion

- **FR-020**: Users must be able to submit a URL for website ingestion.
- **FR-021**: The backend must fetch the page, extract readable content, clean HTML boilerplate, and store the source URL.
- **FR-022**: Website text must be chunked, embedded, and stored with URL and crawl metadata.
- **FR-023**: The crawler must respect configured domain allowlists, content size limits, and robots/legal constraints defined by the project owner.

### 5.4 Structured Database Knowledge

- **FR-030**: Admins must be able to define structured database sources for ingestion or retrieval.
- **FR-031**: Structured records must be converted into canonical text passages with stable source identifiers.
- **FR-032**: Record-derived chunks must be embedded and retrievable with metadata that points back to the originating table and record ID.

### 5.5 Document Management

- **FR-040**: Users must be able to list all ingested documents and sources.
- **FR-041**: Users must be able to delete a document and all associated chunks, embeddings, and metadata.
- **FR-042**: Users must be able to filter documents by source type: PDF, website, or database.

### 5.6 RAG Chat

- **FR-050**: Users must be able to ask questions in a chat interface.
- **FR-051**: The backend must create an embedding for the user question and retrieve the top relevant chunks from the vector database.
- **FR-052**: The backend must assemble a prompt containing retrieved context, source metadata, and the user's question.
- **FR-053**: The LLM must answer in Vietnamese by default unless the user requests another language.
- **FR-054**: The assistant must cite sources using document/page, URL, or database record metadata when available.
- **FR-055**: If retrieved context is insufficient, the assistant must say it did not find the information in the provided data.
- **FR-056**: Chat messages and retrieved source references must be stored for history and audit.

### 5.7 Retrieval Quality

- **FR-060**: The system must support configurable `top_k` retrieval.
- **FR-061**: The system should support hybrid keyword plus vector retrieval after the MVP.
- **FR-062**: The system should support reranking retrieved chunks after the MVP.
- **FR-063**: Retrieval must filter by authenticated user and optionally by selected document IDs.

### 5.8 Provider Abstraction

- **FR-070**: Embedding generation must be abstracted behind a provider interface.
- **FR-071**: LLM completion must be abstracted behind a provider interface.
- **FR-072**: The system must support OpenAI as the default provider and leave a clear path for Ollama/local models.

---

## 6. Non-Functional Requirements

### Performance

- PDF ingestion should handle common PDFs up to the configured upload limit without blocking the chat UI.
- Chat responses should begin within 10 seconds for typical top-5 retrieval and LLM calls under normal provider latency.
- Vector search queries should use indexes and user filters.

### Security

- Authentication is required for all private endpoints.
- Secrets must be loaded from environment variables only.
- Uploaded files must be size-limited and content-type validated.
- User data must be isolated at query level and tested.
- Source URLs must be validated to reduce SSRF risk before crawling.

### Scalability

- The MVP may run ingestion jobs in-process, but the architecture must allow moving ingestion to a queue worker.
- Vector storage must support migration from pgvector to Qdrant, Pinecone, Milvus, or another vector database if scale requires it.

### Accessibility

- The web UI should target WCAG 2.1 AA.
- Chat, upload, ingestion status, and document management screens must be usable by keyboard.

### Browser / Platform Support

- Modern browsers: Chrome, Edge, Firefox, and Safari current stable versions.
- Responsive layout down to 375px width.

### Reliability

- Ingestion jobs must record status, errors, and retry-safe metadata.
- Deleting documents must remove associated chunks and embeddings consistently.
- The system should log retrieval diagnostics without storing raw secrets.

---

## 7. Out of Scope (v1.0)

- Fine-tuning custom LLMs.
- Multi-tenant organization management beyond user-level isolation.
- Payment and subscription billing.
- Browser extension ingestion.
- Real-time collaborative chat.
- Large-scale distributed crawling.
- OCR for scanned PDFs unless chosen later.
- Dedicated vector databases beyond pgvector for MVP.

---

## 8. Open Questions

| # | Question | Owner | Status |
|---|----------|-------|--------|
| 1 | What is the final project/product name? | Product owner | Open |
| 2 | Should the default LLM and embedding provider be OpenAI, a local model, or both? | Product owner | Open |
| 3 | What is the target deployment platform: local only, VPS, Railway, Vercel plus API host, AWS, or another option? | Product owner | Open |
| 4 | Should website crawling be single-page only in MVP or support depth-limited multi-page crawl? | Product owner | Open |
| 5 | Is OCR required for scanned PDFs in v1? | Product owner | Open |
| 6 | Which auth model should be used: JWT, httpOnly session cookies, or a managed auth provider? | Product owner | Open |

---

## 9. Revision History

| Date | Author | Change Description |
|------|--------|--------------------|
| 2026-05-06 | Human request via Codex | Initial RAG chatbot PRD drafted from project requirements |
