<!--
DOCUMENT METADATA
Owner: @backend-developer
Update trigger: Any API endpoint is added, modified, or removed
Update scope: Full document
Read by: @frontend-developer, @qa-engineer
-->

# API Reference

> **Base URL**: `http://localhost:8000/api` (local)
> **Authentication**: Bearer token or session cookie, final auth model TBD
> **Content-Type**: `application/json` for JSON endpoints; `multipart/form-data` for PDF upload
> **Last updated**: 2026-05-06

---

## Standard Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": [
      { "field": "url", "message": "URL must use http or https" }
    ]
  }
}
```

| HTTP Status | Code | Meaning |
|-------------|------|---------|
| 400 | `VALIDATION_ERROR` | Request body or params failed validation |
| 401 | `UNAUTHENTICATED` | No valid auth token provided |
| 403 | `UNAUTHORIZED` | Authenticated but insufficient permissions |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Duplicate resource or state conflict |
| 422 | `UNPROCESSABLE` | Request understood but cannot be processed |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server-side error |

---

## Authentication

Auth is required for every endpoint below except health checks and future auth endpoints.

```text
Authorization: Bearer <token>
```

Auth endpoint details are TBD in task #008.

---

## Health

### GET /health

**Auth required**: No
**Description**: Return service status.

**Response 200**:

```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

---

## Documents

### POST /documents/upload-pdf

**Auth required**: Yes
**Content-Type**: `multipart/form-data`
**Description**: Upload a PDF and start ingestion.

**Request fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file | Yes | PDF file |
| `title` | string | No | User-provided display title |

**Response 202**:

```json
{
  "document": {
    "id": "uuid",
    "sourceType": "pdf",
    "title": "Assignment brief.pdf",
    "status": "processing",
    "createdAt": "2026-05-06T00:00:00Z"
  },
  "job": {
    "id": "uuid",
    "status": "queued"
  }
}
```

### POST /documents/crawl-url

**Auth required**: Yes
**Description**: Submit a URL for website ingestion.

**Request body**:

```json
{
  "url": "https://example.com/page",
  "title": "Optional title",
  "crawlDepth": 0
}
```

**Response 202**:

```json
{
  "document": {
    "id": "uuid",
    "sourceType": "website",
    "title": "Example Page",
    "url": "https://example.com/page",
    "status": "processing"
  },
  "job": {
    "id": "uuid",
    "status": "queued"
  }
}
```

### GET /documents

**Auth required**: Yes
**Description**: List the current user's ingested sources.

**Query params**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `sourceType` | string | No | `pdf`, `website`, or `database` |
| `status` | string | No | `processing`, `ready`, `failed` |

**Response 200**:

```json
{
  "documents": [
    {
      "id": "uuid",
      "sourceType": "pdf",
      "title": "Assignment brief.pdf",
      "status": "ready",
      "chunkCount": 42,
      "createdAt": "2026-05-06T00:00:00Z"
    }
  ]
}
```

### GET /documents/{documentId}

**Auth required**: Yes
**Description**: Return document metadata and latest ingestion status.

### DELETE /documents/{documentId}

**Auth required**: Yes
**Description**: Delete a document and all associated chunks, embeddings, jobs, and source references.

**Response 204**: No content.

---

## Ingestion Jobs

### GET /ingestion-jobs/{jobId}

**Auth required**: Yes
**Description**: Return ingestion job status.

**Response 200**:

```json
{
  "id": "uuid",
  "documentId": "uuid",
  "status": "succeeded",
  "stage": "embedding",
  "errorMessage": null,
  "createdAt": "2026-05-06T00:00:00Z",
  "completedAt": "2026-05-06T00:01:00Z"
}
```

---

## Chat

### POST /chat

**Auth required**: Yes
**Description**: Ask a question against the user's knowledge base.

**Request body**:

```json
{
  "message": "Hay tom tat noi dung chinh cua tai lieu nay",
  "conversationId": "uuid or null",
  "documentIds": ["uuid"],
  "topK": 5,
  "language": "vi"
}
```

**Response 200**:

```json
{
  "conversationId": "uuid",
  "message": {
    "id": "uuid",
    "role": "assistant",
    "content": "Cau tra loi dua tren tai lieu...",
    "createdAt": "2026-05-06T00:00:00Z"
  },
  "sources": [
    {
      "documentId": "uuid",
      "chunkId": "uuid",
      "title": "Assignment brief.pdf",
      "sourceType": "pdf",
      "pageNumber": 3,
      "url": null,
      "score": 0.82,
      "snippet": "Short supporting excerpt"
    }
  ]
}
```

### GET /chat/history

**Auth required**: Yes
**Description**: List chat conversations for the current user.

### GET /chat/history/{conversationId}

**Auth required**: Yes
**Description**: Return messages and citations for one conversation.

---

## Admin / Structured Sources

Structured database source endpoints are planned but not part of the first PDF MVP.

### POST /admin/database-sources

**Auth required**: Yes, admin only
**Description**: Register a structured database source mapping.

### POST /admin/database-sources/{sourceId}/ingest

**Auth required**: Yes, admin only
**Description**: Start ingestion for a structured source.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-06 | Initial RAG chatbot API contract |
