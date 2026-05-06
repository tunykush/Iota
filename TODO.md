# TODO / Backlog

> **Governor**: @project-manager - invoke for sprint planning, prioritization, and feature breakdown.
> **Agents**: May add items to "Backlog" and move completed items to "Completed". Preserve section order. Never reorder items within a section unless explicitly asked.

---

## In Progress

No active implementation task.

---

## Up Next (prioritized)

- [ ] #001 - Scaffold FastAPI and Next.js application shells [area: setup] -> [.tasks/001-scaffold-application-shells.md](.tasks/001-scaffold-application-shells.md)
- [ ] #002 - Design PostgreSQL and pgvector schema with migrations [area: database] -> [.tasks/002-rag-database-schema.md](.tasks/002-rag-database-schema.md)
- [ ] #003 - Build PDF ingestion pipeline [area: backend] -> [.tasks/003-pdf-ingestion-pipeline.md](.tasks/003-pdf-ingestion-pipeline.md)
- [ ] #004 - Build core retrieval and chat API [area: backend] -> [.tasks/004-retrieval-chat-api.md](.tasks/004-retrieval-chat-api.md)

---

## Backlog

- [ ] #005 - Build website crawl ingestion pipeline [area: backend] -> [.tasks/005-website-crawl-ingestion.md](.tasks/005-website-crawl-ingestion.md)
- [ ] #006 - Build chat UI with citations [area: frontend] -> [.tasks/006-chat-ui-citations.md](.tasks/006-chat-ui-citations.md)
- [ ] #007 - Build document management UI [area: frontend] -> [.tasks/007-document-management-ui.md](.tasks/007-document-management-ui.md)
- [ ] #008 - Implement authentication and user data isolation [area: backend] -> [.tasks/008-auth-user-isolation.md](.tasks/008-auth-user-isolation.md)
- [ ] #009 - Add ingestion job tracking and retry-safe status states [area: backend] -> [.tasks/009-ingestion-job-tracking.md](.tasks/009-ingestion-job-tracking.md)
- [ ] #010 - Add hybrid retrieval and reranking [area: backend] -> [.tasks/010-hybrid-retrieval-reranking.md](.tasks/010-hybrid-retrieval-reranking.md)
- [ ] #011 - Add Docker Compose local development environment [area: infra] -> [.tasks/011-docker-compose-local-dev.md](.tasks/011-docker-compose-local-dev.md)
- [ ] #012 - Add RAG evaluation and E2E test suite [area: qa] -> [.tasks/012-rag-evaluation-e2e-tests.md](.tasks/012-rag-evaluation-e2e-tests.md)

---

## Completed

- [x] #000 - Initial project setup and template configuration -> [.tasks/000-initial-project-setup.md](.tasks/000-initial-project-setup.md)

---

## Item Format Guide

When adding new items, use this format:

```text
- [ ] #NNN - Brief description of the task [area: frontend|backend|database|qa|docs|infra|design|setup] -> .tasks/NNN-short-title.md
```

Every TODO item must have a corresponding `.tasks/NNN-*.md` file. @project-manager creates both together.
