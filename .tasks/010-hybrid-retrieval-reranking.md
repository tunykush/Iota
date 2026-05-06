---
id: "010"
title: "Add hybrid retrieval and reranking"
status: "todo"
area: "backend"
agent: "@backend-developer"
priority: "normal"
created_at: "2026-05-06"
due_date: null
started_at: null
completed_at: null
prd_refs: ["FR-060", "FR-061", "FR-062", "FR-063"]
blocks: ["012"]
blocked_by: ["002", "004"]
---

## Description

Improve retrieval quality by combining vector search with keyword search and optional reranking. This should remain configurable so the MVP can run with simple vector search first.

## Acceptance Criteria

- [ ] Retrieval settings allow vector-only, hybrid, and reranked modes.
- [ ] Keyword search is user-scoped and combines safely with vector results.
- [ ] Reranker adapter is behind an interface.
- [ ] Retrieval diagnostics record scores and selected strategy.
- [ ] Evaluation tests compare retrieval quality against baseline.
- [ ] Relevant documentation updated.

## Technical Notes

Do not make reranking a hard dependency for basic chat. Provider costs and latency must be visible in configuration.

## History

| Date | Agent / Human | Event |
|------|---------------|-------|
| 2026-05-06 | human | Task created |
