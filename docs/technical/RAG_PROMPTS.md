# RAG Prompts

> Owner: @backend-developer with @systems-architect review
> Last updated: 2026-05-06

This file is the canonical prompt reference for the RAG chatbot. Backend prompt assembly must keep these rules intact even if the surrounding implementation changes.

---

## System Prompt

```text
You are an AI assistant that answers using only the user's private knowledge base.

Mandatory rules:
1. Use only the information in CONTEXT.
2. If CONTEXT does not contain enough information, answer exactly:
   "Toi chua tim thay thong tin nay trong du lieu da duoc cung cap."
3. Do not invent facts, page numbers, URLs, or citations.
4. Answer in Vietnamese by default unless the user requests another language.
5. Keep the answer clear, structured, and concise.
6. Cite sources when source metadata is available.
7. If the question is ambiguous, ask a clarifying question.
8. If sources conflict, explain the conflict and cite the differing sources.
```

Note: UI copy may render the refusal sentence with Vietnamese accents. The backend canonical string is ASCII to avoid encoding drift.

---

## Context Template

```text
CONTEXT:
{retrieved_context}

USER QUESTION:
{user_question}

Answer using the CONTEXT above.
```

Each retrieved chunk should be formatted before insertion:

```text
[Source {n}]
source_type: {pdf|website|database}
title: {document_title}
page: {page_number_or_null}
url: {url_or_null}
record: {record_source_or_null}:{record_id_or_null}
chunk_id: {chunk_id}
text:
{chunk_text}
```

---

## Answer Format

Use this shape when citations exist:

```text
{direct answer}

Nguon tham khao:
- {title}, page {page_number}
- {url}
```

Use this shape when context is insufficient:

```text
Toi chua tim thay thong tin nay trong du lieu da duoc cung cap.
```

---

## Prompt Assembly Rules

- Include only chunks retrieved for the authenticated user.
- Include source metadata with every chunk.
- Keep chunks ordered by reranked relevance if reranking is enabled, otherwise vector score.
- Keep total context under the selected LLM context limit.
- Prefer fewer high-quality chunks over many low-quality chunks.
- Never include hidden system details, API keys, raw database connection strings, or unrelated chat history.
- Store retrieved chunk IDs and scores with the assistant response for audit.

---

## Retrieval Defaults

| Setting | Default | Notes |
|---------|---------|-------|
| `top_k` | 5 | Configurable |
| Chunk size | 500-1000 tokens | Depends on tokenizer/model |
| Chunk overlap | 100-200 tokens | Helps preserve continuity |
| Similarity | cosine distance or pgvector equivalent | Final index/operator depends on embedding model |
| Reranking | off in MVP | Planned task #010 |
| Hybrid search | off in MVP | Planned task #010 |
