---
id: "011"
title: "Add Docker Compose local development environment"
status: "todo"
area: "infra"
agent: "@docker-expert"
priority: "normal"
created_at: "2026-05-06"
due_date: null
started_at: null
completed_at: null
prd_refs: ["FR-013", "FR-022", "FR-051"]
blocks: ["012"]
blocked_by: ["001"]
---

## Description

Create a repeatable local development environment for the database and app services. At minimum, Docker Compose should run PostgreSQL with pgvector and expose connection details compatible with `.env.example`.

## Acceptance Criteria

- [ ] `docker-compose.yml` includes PostgreSQL with pgvector support.
- [ ] Local database credentials match `.env.example`.
- [ ] Volumes are configured for local persistence.
- [ ] Optional API/web service containers are added if app scaffolding is ready.
- [ ] Startup instructions are documented.
- [ ] Relevant smoke checks pass.
- [ ] Relevant documentation updated.

## Technical Notes

Use a pgvector-ready image or build a minimal Postgres image with the extension installed.

## History

| Date | Agent / Human | Event |
|------|---------------|-------|
| 2026-05-06 | human | Task created |
