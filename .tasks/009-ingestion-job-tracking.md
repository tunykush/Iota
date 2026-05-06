---
id: "009"
title: "Add ingestion job tracking and retry-safe status states"
status: "todo"
area: "backend"
agent: "@backend-developer"
priority: "normal"
created_at: "2026-05-06"
due_date: null
started_at: null
completed_at: null
prd_refs: ["FR-014", "FR-022"]
blocks: ["007", "012"]
blocked_by: ["002", "003"]
---

## Description

Make ingestion status robust enough for real users. Jobs should expose queued, running, succeeded, and failed states, along with safe error messages and current processing stage.

## Acceptance Criteria

- [ ] Ingestion jobs store status, stage, start time, completion time, and safe error messages.
- [ ] `GET /ingestion-jobs/{jobId}` returns current job status.
- [ ] PDF ingestion updates job status through all major stages.
- [ ] Website ingestion uses the same job model when implemented.
- [ ] Failed jobs do not leave documents marked as ready.
- [ ] Relevant tests written and passing.
- [ ] Relevant documentation updated.

## Technical Notes

Keep the model compatible with future queue workers. Avoid assuming jobs will always run in the API process.

## History

| Date | Agent / Human | Event |
|------|---------------|-------|
| 2026-05-06 | human | Task created |
