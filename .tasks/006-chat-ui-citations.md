---
id: "006"
title: "Build chat UI with citations"
status: "todo"
area: "frontend"
agent: "@frontend-developer"
priority: "normal"
created_at: "2026-05-06"
due_date: null
started_at: null
completed_at: null
prd_refs: ["FR-050", "FR-053", "FR-054", "FR-055", "FR-056"]
blocks: ["012"]
blocked_by: ["001", "003", "004"]
---

## Description

Build the primary chat interface for asking questions and reviewing grounded answers. The UI should show user and assistant messages, loading states, refusal messages, and citations with source metadata.

## Acceptance Criteria

- [ ] User can send a message and see the assistant response.
- [ ] UI displays citations with PDF page, URL, or record metadata when present.
- [ ] Empty, loading, error, and insufficient-context states are polished.
- [ ] Optional document filter control is planned or implemented based on API readiness.
- [ ] Keyboard and screen-reader basics are covered.
- [ ] Relevant tests written and passing.
- [ ] Relevant documentation updated.

## Technical Notes

Follow `docs/technical/DESIGN_SYSTEM.md`. Avoid turning the app into a landing page; the first screen should be the usable chat workspace once authenticated.

## History

| Date | Agent / Human | Event |
|------|---------------|-------|
| 2026-05-06 | human | Task created |
