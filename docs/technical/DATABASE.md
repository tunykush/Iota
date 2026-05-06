<!--
DOCUMENT METADATA
Owner: @database-expert
Update trigger: Any schema change, migration, index addition, or significant query pattern decision
Update scope: Full document
Read by: @backend-developer, @systems-architect
-->

# Database Reference

> **Engine**: PostgreSQL 16 target
> **Vector extension**: pgvector
> **ORM / Query layer**: SQLAlchemy + Alembic planned
> **Connection**: Via `DATABASE_URL`
> **Last updated**: 2026-05-06

---

## Schema Overview

```text
users
  |--< sessions
  |--< documents
  |      |--< chunks
  |      |--< ingestion_jobs
  |
  |--< conversations
         |--< chat_messages
                |--< chat_message_sources >-- chunks
```

**Key relationships**:

- `users` own every private resource.
- `documents` represent PDFs, website pages, or structured database sources.
- `chunks` store text, citation metadata, and vector embeddings.
- `ingestion_jobs` track async or background processing state.
- `conversations` and `chat_messages` store chat history.
- `chat_message_sources` records which chunks supported an answer.

---

## Extensions

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

---

## Tables

### users

**Purpose**: Stores all user accounts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| email | text | NOT NULL, UNIQUE | Login identifier |
| password_hash | text | NULL | Required for password auth; nullable if managed auth is used |
| name | text | NOT NULL | Display name |
| role | text | NOT NULL, DEFAULT 'user' | `user` or `admin` |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Created time |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | Updated time |

**Indexes**:

- `idx_users_email` on `(email)`

### sessions

**Purpose**: Active auth sessions if the project chooses token/session auth.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Session/token ID |
| user_id | uuid | FK -> users.id ON DELETE CASCADE | Owner |
| expires_at | timestamptz | NOT NULL | Expiry |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Created time |
| user_agent | text | NULL | Browser/client |
| ip_address | inet | NULL | Client IP |

### documents

**Purpose**: Source-level metadata for PDFs, websites, and structured database records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| user_id | uuid | FK -> users.id ON DELETE CASCADE | Owner |
| source_type | text | NOT NULL | `pdf`, `website`, or `database` |
| title | text | NOT NULL | Display title |
| original_filename | text | NULL | PDF filename |
| url | text | NULL | Website URL |
| external_source_id | text | NULL | Database source identifier |
| status | text | NOT NULL, DEFAULT 'processing' | `processing`, `ready`, `failed` |
| content_hash | text | NULL | Duplicate detection |
| metadata | jsonb | NOT NULL, DEFAULT '{}' | Source-specific metadata |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Created time |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | Updated time |

**Indexes**:

- `idx_documents_user_id` on `(user_id)`
- `idx_documents_user_source_type` on `(user_id, source_type)`
- `idx_documents_user_status` on `(user_id, status)`

### chunks

**Purpose**: Searchable text chunks and embeddings.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| document_id | uuid | FK -> documents.id ON DELETE CASCADE | Source document |
| user_id | uuid | FK -> users.id ON DELETE CASCADE | Denormalized owner for filtering |
| chunk_index | integer | NOT NULL | Order within document |
| text | text | NOT NULL | Chunk text |
| token_count | integer | NULL | Approximate token count |
| embedding | vector(1536) | NOT NULL for OpenAI default | Chunk embedding |
| source_type | text | NOT NULL | Copied from document |
| page_number | integer | NULL | PDF page citation |
| url | text | NULL | Website citation |
| record_source | text | NULL | DB table/source name |
| record_id | text | NULL | DB record ID |
| metadata | jsonb | NOT NULL, DEFAULT '{}' | Extra citation and extraction metadata |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Created time |

**Indexes**:

- `idx_chunks_user_document` on `(user_id, document_id)`
- `idx_chunks_document_index` on `(document_id, chunk_index)`
- `idx_chunks_embedding_hnsw` HNSW or IVFFlat vector index, exact type decided during migration work

**Notes**:

- `vector(1536)` assumes OpenAI `text-embedding-3-small`. If a different model is chosen, the migration must use that model's dimension.
- Denormalized `user_id` is intentional so retrieval can filter by user without joining first.

### ingestion_jobs

**Purpose**: Track background ingestion status.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| user_id | uuid | FK -> users.id ON DELETE CASCADE | Owner |
| document_id | uuid | FK -> documents.id ON DELETE CASCADE | Document being ingested |
| job_type | text | NOT NULL | `pdf`, `website`, or `database` |
| status | text | NOT NULL | `queued`, `running`, `succeeded`, `failed` |
| stage | text | NULL | `extracting`, `chunking`, `embedding`, `storing` |
| error_message | text | NULL | Safe error for UI |
| metadata | jsonb | NOT NULL, DEFAULT '{}' | Runtime details |
| started_at | timestamptz | NULL | Start time |
| completed_at | timestamptz | NULL | Completion time |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Created time |

### conversations

**Purpose**: Chat sessions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| user_id | uuid | FK -> users.id ON DELETE CASCADE | Owner |
| title | text | NULL | Optional generated title |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Created time |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | Updated time |

### chat_messages

**Purpose**: User and assistant messages.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| conversation_id | uuid | FK -> conversations.id ON DELETE CASCADE | Conversation |
| user_id | uuid | FK -> users.id ON DELETE CASCADE | Owner |
| role | text | NOT NULL | `user`, `assistant`, or `system` |
| content | text | NOT NULL | Message body |
| model | text | NULL | LLM model used for assistant message |
| metadata | jsonb | NOT NULL, DEFAULT '{}' | Retrieval diagnostics and options |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Created time |

### chat_message_sources

**Purpose**: Link assistant answers to supporting chunks.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| message_id | uuid | FK -> chat_messages.id ON DELETE CASCADE | Assistant message |
| chunk_id | uuid | FK -> chunks.id ON DELETE CASCADE | Supporting chunk |
| score | double precision | NULL | Retrieval or rerank score |
| snippet | text | NULL | Short excerpt shown in UI |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Created time |

---

## Query Patterns

### Vector search with user isolation

```sql
SELECT id, document_id, text, page_number, url, metadata,
       embedding <=> :query_embedding AS distance
FROM chunks
WHERE user_id = :user_id
  AND (:document_ids IS NULL OR document_id = ANY(:document_ids))
ORDER BY embedding <=> :query_embedding
LIMIT :top_k;
```

### Delete document and all chunks

```sql
DELETE FROM documents
WHERE id = :document_id
  AND user_id = :user_id;
```

Chunks, jobs, and source links cascade through foreign keys.

### List documents

```sql
SELECT d.id, d.source_type, d.title, d.status, d.created_at, COUNT(c.id) AS chunk_count
FROM documents d
LEFT JOIN chunks c ON c.document_id = d.id
WHERE d.user_id = :user_id
GROUP BY d.id
ORDER BY d.created_at DESC;
```

---

## Migration Plan

| Migration File | Date | Description | Reversible | Deployment Risk |
|----------------|------|-------------|------------|-----------------|
| `001_enable_extensions.sql` | 2026-05-06 | Enable pgvector and pgcrypto | Yes | Low |
| `002_create_auth_tables.sql` | 2026-05-06 | Create users and sessions | Yes | Low |
| `003_create_rag_documents.sql` | 2026-05-06 | Create documents, chunks, ingestion jobs | Yes | Medium |
| `004_create_chat_tables.sql` | 2026-05-06 | Create conversations, messages, source links | Yes | Low |

---

## Known Issues & Tech Debt

| Issue | Impact | Plan |
|-------|--------|------|
| Embedding dimension fixed in migration | Model changes may require schema migration | Finalize embedding model before production |
| No organization/team model in v1 | Users cannot share knowledge bases | Consider orgs in v2 |
| OCR not included | Scanned PDFs may ingest little text | Add OCR pipeline if required |
