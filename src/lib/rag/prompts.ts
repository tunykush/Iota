import type { LlmMessage } from "@/lib/llm/types";
import type { RetrievedChunk } from "./retrieval";

const SYSTEM_PROMPT = `You are an AI assistant that answers using only the user's private knowledge base.

Mandatory rules:
1. Use only the information in CONTEXT.
2. If CONTEXT does not contain enough information, answer exactly:
   "Toi chua tim thay thong tin nay trong du lieu da duoc cung cap."
3. Do not invent facts, page numbers, URLs, or citations.
4. Answer in Vietnamese by default unless the user requests another language.
5. Prefer a direct answer first, then concise supporting bullets when useful.
6. Cite every factual claim with source markers like [1], [2].
7. Use source titles/URLs to explain where the evidence came from when helpful.
8. If the question is ambiguous, ask a clarifying question.
9. If sources conflict, explain the conflict and cite the differing sources.`;

export function formatContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map(
      (chunk, index) => `[Source ${index + 1}]
relevance_score: ${chunk.score}
source_type: ${chunk.sourceType}
title: ${chunk.title}
page: ${chunk.pageNumber ?? "null"}
url: ${chunk.url ?? "null"}
record: null:null
chunk_id: ${chunk.chunkId}
matched_snippet:
${chunk.snippet}
text:
${chunk.text}`,
    )
    .join("\n\n");
}

export function buildRagMessages(question: string, chunks: RetrievedChunk[]): LlmMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `CONTEXT:\n${formatContext(chunks)}\n\nUSER QUESTION:\n${question}\n\nUse the most relevant sources first. Answer using the CONTEXT above, and include citations inline.`,
    },
  ];
}
