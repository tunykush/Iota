# Private RAG Chatbot - Claude Instructions

> Stack: Next.js + TypeScript frontend, FastAPI backend, PostgreSQL + pgvector, SQLAlchemy/Alembic, OpenAI/Ollama provider abstraction, Docker Compose
> Last updated: 2026-05-06

## Project Context

Private RAG Chatbot is an AI assistant for answering questions from private PDFs, crawled websites, and structured database knowledge. The core product is a retrieval-augmented generation system: ingest sources, chunk text, embed chunks, retrieve relevant context, and ask an LLM to answer with citations.

**Tech stack summary**: Next.js frontend, FastAPI backend, PostgreSQL + pgvector metadata/vector store, Docker Compose local deployment.

---

## Agents Available

**Mandatory delegation - this is not optional.** Every task that falls within a specialist's domain MUST be routed to that agent. Do not implement code, design schemas, write docs, or configure pipelines yourself - delegate. Only handle directly: project-level questions, routing decisions, and tasks explicitly outside all specialist domains.

| Agent | Role | Invoke when... |
|-------|------|----------------|
| `project-manager` | Backlog & coordination | "What's next?", sprint planning, breaking down features, reprioritizing |
| `systems-architect` | Architecture & ADRs | RAG flow design, provider abstraction, tech decisions, system integration |
| `frontend-developer` | UI implementation | Chat UI, upload screens, document management, client-side state |
| `react-native-developer` | Mobile UI implementation | React Native screens, navigation, native modules, platform styling |
| `backend-developer` | API & business logic | FastAPI endpoints, ingestion services, retrieval pipeline, LLM calls |
| `ui-ux-designer` | UX & design system | Chat, upload, citations, empty/error states, accessibility |
| `database-expert` | Schema & queries | PostgreSQL, pgvector schema, indexes, migrations, query optimization |
| `qa-engineer` | Testing | RAG evaluation tests, API tests, Playwright E2E, regression coverage |
| `documentation-writer` | Living docs | User guide updates, README updates, usage docs |
| `cicd-engineer` | CI/CD & GitHub Actions | Pipelines, deployments, branch protection, release automation |
| `docker-expert` | Containerization | Dockerfiles, docker-compose, local service networking |
| `copywriter-seo` | Copy & SEO | Public landing copy, meta tags, keyword strategy, brand voice |

---

## Critical Rules

These apply to all agents at all times. No exceptions without explicit human instruction.

1. **PRD.md requires explicit human approval to modify.** Do not edit it unless the human has clearly instructed you to do so in the current conversation. Read it to understand requirements.
2. **TODO.md is the living backlog.** Agents may add items, mark items complete, and move items to "Completed". Preserve section order and existing item priority - do not reorder items within a section unless explicitly asked to reprioritize.
3. **Grounding is product-critical.** Chat answers must be based on retrieved context, include citations when available, and refuse when context is insufficient.
4. **User data isolation is mandatory.** Every document, chunk, embedding, job, and chat query must be filtered by authenticated user ID.
5. **Provider lock-in is avoided.** Embedding and LLM calls must go through provider interfaces.
6. **Never hardcode secrets, credentials, provider keys, or environment-specific values** in source code.
7. **Update relevant docs** after every significant change before marking a task complete.
8. **Run tests before marking any implementation task complete.**
9. **Consult `docs/technical/DECISIONS.md`** before proposing changes that may conflict with prior architectural decisions.
10. **Commit your own changes; never push.** After completing work, create a local commit if requested. Do not `git push`.

---

## RAG Implementation Rules

- Chunk size target: 500-1000 tokens.
- Chunk overlap target: 100-200 tokens.
- Retrieval default: top 5 chunks, configurable per request or server config.
- Retrieval must filter by `user_id` and optional selected document IDs.
- Store citation metadata with every chunk: source type, title/file name, page number when available, URL when available, and record ID when available.
- The prompt template in `docs/technical/RAG_PROMPTS.md` is canonical.
- If context does not answer the question, the LLM must say: "Toi chua tim thay thong tin nay trong du lieu da duoc cung cap." The UI may translate or accent this message if the project uses Vietnamese copy.
- Log retrieval diagnostics for debugging: query ID, document IDs, chunk IDs, scores, model/provider names, and latency. Do not log secrets.

---

## Slash Commands

Use these commands to trigger common multi-step workflows:

| Command | What it does |
|---------|--------------|
| `/orchestrate <task>` | Full multi-agent task execution - decompose, plan, branch, execute in waves |
| `/review [branch or file]` | Multi-agent code review: architectural drift + test coverage + implementation quality |
| `/release [version]` | Pre-release quality pass - QA, docs, CI/CD check, gated release checklist |
| `/checkpoint [description]` | Verify docs, run lint/tests, commit WIP before pausing |
| `/status` | Render a live project health card |
| `/start` | Run project onboarding from `START_HERE.md` |
| `/sync-template` | Pull latest agent definitions and templates from upstream |

---

## MCP Servers

Project MCP servers are declared in `.mcp.json`.

| Server | Purpose | Agents that use it |
|--------|---------|-------------------|
| `sequential-thinking` | Structured multi-step reasoning scratchpad | `systems-architect`, `project-manager` |
| `context7` | Live, version-accurate library documentation | `frontend-developer`, `react-native-developer`, `backend-developer`, `database-expert`, `docker-expert` |

---

## Project Structure

```text
apps/
  api/                   # Planned FastAPI backend
  web/                   # Planned Next.js frontend
docs/
  technical/
    ARCHITECTURE.md      # System design and RAG flows
    API.md               # API contracts
    DATABASE.md          # Schema and query patterns
    DECISIONS.md         # ADR log
    DESIGN_SYSTEM.md     # UI/UX source of truth
    RAG_PROMPTS.md       # Prompt templates and assembly rules
  user/USER_GUIDE.md
  content/CONTENT_STRATEGY.md
.tasks/                  # Detailed task files
PRD.md                   # Product requirements
TODO.md                  # Prioritized backlog
```

---

## Code Style

Project tooling is not implemented yet. Planned standards:

- **Frontend language**: TypeScript strict mode.
- **Backend language**: Python 3.12+ with type hints.
- **Frontend formatter/linter**: Prettier + ESLint or Biome, final choice TBD.
- **Backend formatter/linter**: ruff + black or ruff format, final choice TBD.
- **Imports**: absolute imports inside application packages once configured.
- **Logging**: use structured project logger, never `console.log` or raw `print` in production code.

---

## Testing Conventions

Planned standards:

- **Backend tests**: pytest for ingestion, retrieval, provider adapters, and API contracts.
- **Frontend tests**: Vitest for components and Playwright for E2E.
- **RAG evaluation**: curated questions with expected supporting chunks and refusal cases.
- **Coverage target**: 80% for new backend service logic and frontend critical flows.

---

## Environment & Commands

Commands will be finalized when app scaffolding is created.

- **Backend dev**: `uvicorn app.main:app --reload --port 8000`
- **Frontend dev**: `npm run dev`
- **Database**: `docker compose up -d postgres`
- **Backend tests**: `pytest`
- **Frontend tests**: `npm test`
- **E2E tests**: `npm run test:e2e`

---

## Key Documentation

@docs/technical/ARCHITECTURE.md
@docs/technical/DESIGN_SYSTEM.md
@docs/technical/DECISIONS.md
@docs/technical/API.md
@docs/technical/DATABASE.md
@docs/technical/RAG_PROMPTS.md
@docs/user/USER_GUIDE.md
