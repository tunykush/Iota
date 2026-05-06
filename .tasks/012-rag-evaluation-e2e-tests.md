---
id: "012"
title: "Add RAG evaluation and E2E test suite"
status: "todo"
area: "qa"
agent: "@qa-engineer"
priority: "normal"
created_at: "2026-05-06"
due_date: null
started_at: null
completed_at: null
prd_refs: ["FR-010", "FR-014", "FR-040", "FR-050", "FR-054", "FR-055", "FR-063"]
blocks: []
blocked_by: ["001", "002", "003", "004", "006", "007", "008", "009", "010", "011"]
---

## Description

Create a quality suite that tests the RAG product from ingestion through grounded answers. The suite should include backend unit/integration tests, curated retrieval evaluations, refusal tests, and frontend E2E flows.

## Acceptance Criteria

- [ ] Test fixtures include at least one small PDF with known expected answers.
- [ ] Evaluation cases verify top-k retrieval finds expected chunks.
- [ ] Refusal cases verify unsupported questions do not hallucinate answers.
- [ ] User isolation tests prove one user's chunks cannot be retrieved by another user.
- [ ] Playwright E2E covers upload, status, chat answer, citation display, and delete flow.
- [ ] CI command is documented.
- [ ] Relevant documentation updated.

## Technical Notes

Keep evaluation fixtures small and deterministic. Do not require paid LLM calls for every test if provider mocks can cover contract behavior.

## History

| Date | Agent / Human | Event |
|------|---------------|-------|
| 2026-05-06 | human | Task created |
