---
id: "007"
title: "Build document management UI"
status: "todo"
area: "frontend"
agent: "@frontend-developer"
priority: "normal"
created_at: "2026-05-06"
due_date: null
started_at: null
completed_at: null
prd_refs: ["FR-010", "FR-014", "FR-020", "FR-040", "FR-041", "FR-042"]
blocks: ["012"]
blocked_by: ["001", "003", "005"]
---

## Description

Build the UI for uploading PDFs, submitting URLs, viewing ingestion status, filtering documents, and deleting sources. This is the user's control center for managing the private knowledge base.

## Acceptance Criteria

- [ ] PDF upload form validates file type and size before submit.
- [ ] URL crawl form validates URL before submit.
- [ ] Document list shows source type, title, status, chunk count, and created time.
- [ ] Users can filter by source type and status.
- [ ] Delete flow asks for confirmation and removes the source from the list.
- [ ] Failed ingestion states show safe, actionable errors.
- [ ] Relevant tests written and passing.
- [ ] Relevant documentation updated.

## Technical Notes

This task depends on the PDF ingestion API and should integrate website ingestion when task #005 is available.

## History

| Date | Agent / Human | Event |
|------|---------------|-------|
| 2026-05-06 | human | Task created |
