<!--
DOCUMENT METADATA
Owner: @systems-architect
Update trigger: Any significant architectural, technology, or design pattern decision is made
Update scope: Append new ADRs only. Never edit the body of an Accepted ADR.
Read by: All agents. Check this file before proposing architectural changes.
-->

# Architecture Decision Records

> This log captures the context and reasoning behind key decisions so they are never lost.
>
> **Rule**: Once an ADR is marked **Accepted**, do not edit its body. If a decision needs to change, write a new ADR that explicitly supersedes the old one.

---

## Decision Index

| ID | Title | Status | Date |
|----|-------|--------|------|
| ADR-001 | Initial RAG MVP stack selection | Accepted | 2026-05-06 |

---

## ADR-001: Initial RAG MVP Stack Selection

**Date**: 2026-05-06
**Status**: Accepted
**Deciders**: Product owner TBD / @systems-architect

### Context

The product needs to ingest PDFs, website content, and structured database knowledge, then answer questions through a grounded RAG chatbot. The MVP should be quick to build locally, production-friendly, and flexible enough to change embedding or LLM providers later.

### Options Considered

1. **FastAPI + Next.js + PostgreSQL/pgvector**: Strong Python AI ecosystem, good frontend framework, simple database operations. Trade-off: two app runtimes.
2. **Full-stack Next.js + PostgreSQL/pgvector**: Simpler single-language web stack. Trade-off: weaker fit for Python PDF parsing, AI tooling, and ingestion workflows.
3. **FastAPI + Next.js + dedicated vector DB such as Qdrant or Pinecone**: Better specialized vector scaling. Trade-off: more operational complexity for MVP.

### Decision

Use FastAPI for the backend, Next.js for the frontend, PostgreSQL with pgvector for metadata and vectors, SQLAlchemy/Alembic for schema management, and provider interfaces for embeddings and LLM calls.

This choice keeps the MVP practical while preserving a path to dedicated vector databases and alternative model providers.

### Consequences

- **Positive**: Excellent fit for PDF parsing, crawling, embeddings, and RAG orchestration.
- **Positive**: pgvector keeps local setup simpler than running a separate vector database.
- **Positive**: Provider interfaces reduce lock-in to one LLM or embedding vendor.
- **Negative**: Frontend and backend use different runtimes and package managers.
- **Negative**: pgvector may require migration if retrieval scale grows significantly.
- **Neutral**: Docker Compose becomes the standard local-development entry point.
