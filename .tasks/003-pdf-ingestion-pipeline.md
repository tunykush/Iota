---
id: "003"
title: "Build PDF ingestion pipeline"
status: "todo"
area: "backend"
agent: "@backend-developer"
priority: "high"
created_at: "2026-05-06"
due_date: null
started_at: null
completed_at: null
prd_refs: ["FR-010", "FR-011", "FR-012", "FR-013", "FR-014"]
blocks: ["006", "007", "009", "012"]
blocked_by: ["001", "002"]
---

## Description

Build the PDF upload and ingestion path. The backend should accept PDF files, extract page-aware text, clean it, split it into overlapping chunks, generate embeddings, and store chunks with citation metadata.

## Acceptance Criteria

- [ ] `POST /documents/upload-pdf` accepts a PDF and creates document/job records.
- [ ] Text extraction preserves page numbers for citations.
- [ ] Chunking uses configurable chunk size and overlap.
- [ ] Embeddings are generated through the embedding provider interface.
- [ ] Chunks, embeddings, and metadata are persisted.
- [ ] Ingestion status is visible through the API.
- [ ] Unit tests cover extraction, chunking, embedding adapter calls, and failure cases.
- [ ] Relevant documentation updated.

## Technical Notes

Use PyMuPDF first and keep pdfplumber as a fallback option if extraction quality requires it. Do not add OCR unless the product owner updates scope.

## History

| Date | Agent / Human | Event |
|------|---------------|-------|
| 2026-05-06 | human | Task created |
