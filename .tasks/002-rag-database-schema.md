---
id: "002"
title: "Design PostgreSQL and pgvector schema with migrations"
status: "todo"
area: "database"
agent: "@database-expert"
priority: "high"
created_at: "2026-05-06"
due_date: null
started_at: null
completed_at: null
prd_refs: ["FR-002", "FR-003", "FR-013", "FR-022", "FR-032", "FR-056", "FR-063"]
blocks: ["003", "004", "005", "008", "009", "010", "012"]
blocked_by: ["001"]
---

## Description

Implement the PostgreSQL schema for users, sessions, documents, chunks, ingestion jobs, conversations, chat messages, and chat message sources. Enable pgvector and add indexes needed for user-scoped vector retrieval and document management.

## Acceptance Criteria

- [ ] Migrations enable `vector` and `pgcrypto` extensions.
- [ ] Tables match `docs/technical/DATABASE.md` or the doc is updated with approved changes.
- [ ] Chunk embeddings use the chosen embedding dimension.
- [ ] User isolation columns and indexes are present on private resources.
- [ ] Cascade delete behavior removes chunks and dependent records when a document is deleted.
- [ ] Migration tests or validation commands pass.
- [ ] Relevant documentation updated.

## Technical Notes

Finalize embedding dimension before creating the first production migration. If using OpenAI `text-embedding-3-small`, the planned dimension is 1536.

## History

| Date | Agent / Human | Event |
|------|---------------|-------|
| 2026-05-06 | human | Task created |
