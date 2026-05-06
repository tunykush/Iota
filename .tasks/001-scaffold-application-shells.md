---
id: "001"
title: "Scaffold FastAPI and Next.js application shells"
status: "todo"
area: "setup"
agent: "@project-manager"
priority: "high"
created_at: "2026-05-06"
due_date: null
started_at: null
completed_at: null
prd_refs: ["FR-001", "FR-010", "FR-050"]
blocks: ["002", "003", "004", "006", "007", "008", "011", "012"]
blocked_by: []
---

## Description

Create the initial application structure for the planned monorepo: `apps/api` for the FastAPI backend and `apps/web` for the Next.js frontend. Add baseline configuration, dependency manifests, local run commands, and a health route so later backend, database, and frontend tasks have a stable home.

## Acceptance Criteria

- [ ] `apps/api` contains a runnable FastAPI app with `GET /health`.
- [ ] `apps/web` contains a runnable Next.js app with a minimal authenticated-app shell stub.
- [ ] Dependency manifests and README run commands are added.
- [ ] Environment loading uses `.env.example` as the source of required variables.
- [ ] Relevant tests or smoke checks are documented and passing.
- [ ] Relevant documentation updated.

## Technical Notes

Use the structure described in `docs/technical/ARCHITECTURE.md`. Do not implement full ingestion or chat behavior in this task.

## History

| Date | Agent / Human | Event |
|------|---------------|-------|
| 2026-05-06 | human | Task created |
