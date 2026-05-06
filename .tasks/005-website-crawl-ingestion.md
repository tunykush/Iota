---
id: "005"
title: "Build website crawl ingestion pipeline"
status: "todo"
area: "backend"
agent: "@backend-developer"
priority: "normal"
created_at: "2026-05-06"
due_date: null
started_at: null
completed_at: null
prd_refs: ["FR-020", "FR-021", "FR-022", "FR-023"]
blocks: ["007", "012"]
blocked_by: ["001", "002"]
---

## Description

Implement URL ingestion for website content. The backend should validate URLs, fetch the page safely, extract readable text, remove boilerplate, chunk and embed the content, and store URL-based citations.

## Acceptance Criteria

- [ ] `POST /documents/crawl-url` validates and accepts a URL.
- [ ] Crawler enforces allowed schemes, size limits, configured user agent, and domain allowlist when set.
- [ ] Extractor stores clean readable page text and source URL metadata.
- [ ] Website chunks are embedded and stored.
- [ ] Ingestion failures record safe user-facing errors.
- [ ] Tests cover URL validation, extraction, and blocked/failed crawl cases.
- [ ] Relevant documentation updated.

## Technical Notes

Single-page crawl is the MVP default. Multi-page crawl requires product-owner confirmation.

## History

| Date | Agent / Human | Event |
|------|---------------|-------|
| 2026-05-06 | human | Task created |
