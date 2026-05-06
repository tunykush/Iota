---
id: "004"
title: "Build core retrieval and chat API"
status: "todo"
area: "backend"
agent: "@backend-developer"
priority: "high"
created_at: "2026-05-06"
due_date: null
started_at: null
completed_at: null
prd_refs: ["FR-050", "FR-051", "FR-052", "FR-053", "FR-054", "FR-055", "FR-056", "FR-060", "FR-063", "FR-070", "FR-071", "FR-072"]
blocks: ["006", "010", "012"]
blocked_by: ["001", "002", "003"]
---

## Description

Build the main RAG chat endpoint. The backend should embed the user question, retrieve top relevant chunks from the authenticated user's knowledge base, assemble the canonical prompt, call the LLM provider, persist the conversation, and return answer citations.

## Acceptance Criteria

- [ ] `POST /chat` accepts a user question, optional conversation ID, optional document filters, and `topK`.
- [ ] Retrieval filters by authenticated `user_id`.
- [ ] Prompt assembly follows `docs/technical/RAG_PROMPTS.md`.
- [ ] LLM calls use a provider interface.
- [ ] Responses include answer text and source citations.
- [ ] Insufficient context produces the required refusal behavior.
- [ ] Chat history and source references are stored.
- [ ] Tests cover grounded answer, refusal, and user isolation cases.
- [ ] Relevant documentation updated.

## Technical Notes

Start with non-streaming responses. Streaming can be added after the core endpoint is correct.

## History

| Date | Agent / Human | Event |
|------|---------------|-------|
| 2026-05-06 | human | Task created |
