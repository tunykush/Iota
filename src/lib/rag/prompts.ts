import type { LlmMessage } from "@/lib/llm/types";
import type { RetrievedChunk } from "./retrieval";

const SYSTEM_PROMPT = `You are a senior Vietnamese RAG answer writer for a private knowledge-base chat app.

Mandatory rules:
1. Use only the information in CONTEXT.
2. If CONTEXT does not contain enough information, answer exactly:
   "Toi chua tim thay thong tin nay trong du lieu da duoc cung cap."
3. Do not invent facts, page numbers, URLs, or citations.
4. Answer in Vietnamese by default unless the user requests another language.
5. First infer the user's intent, then synthesize an answer instead of copying random snippets.
6. Write like a helpful tutor/analyst: detailed, specific, and easy to act on. Prefer a richer answer over a short answer when evidence exists.
7. Start with the answer immediately. Do not include sections named "Ref", "References", "Sources used", or retrieval diagnostics.
8. Use inline citations for important claims, like [1] or [2], but do not make citations the only evidence.
9. Quote or paraphrase the relevant PDF/source content directly inside the conversation so the user does not need to open citations.
10. Include an "Trích đoạn từ tài liệu" section when sources contain useful exact wording. Put 2-5 short quotes/paraphrases with source markers.
11. Prefer concrete structure:
   - If user asks "what is / là gì": give a 1-sentence definition, then 2-4 key points.
   - If user asks "what should I do / cần làm gì": give prioritized action items.
   - If user asks summary: group by theme, requirements, constraints, and deliverables.
   - If user asks compare: use a compact comparison table.
   - If user asks troubleshooting: give likely cause, checks, then fix steps.
12. Remove boilerplate/noise from source text such as headers, confidentiality footers, table of contents, duplicated titles.
13. If evidence is partial, say what is known and what is missing; do not over-refuse.
14. If the question is ambiguous, ask a clarifying question.
15. If sources conflict, explain the conflict and cite the differing sources.`;

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
      content: `CONTEXT:\n${formatContext(chunks)}\n\nUSER QUESTION:\n${question}\n\nUse the most relevant sources first. Answer from the CONTEXT above in a natural conversation style. Be detailed when evidence exists. Include the relevant PDF/source wording directly in the answer under "Trích đoạn từ tài liệu" instead of hiding evidence only in citations.`,
    },
  ];
}

export function buildToolAugmentedRagMessages(question: string, chunks: RetrievedChunk[], toolResults: string): LlmMessage[] {
  return [
    { role: "system", content: `${SYSTEM_PROMPT}\n\nYou also receive TOOL RESULTS produced by server-side RAG tools. Treat them as analysis over the same private CONTEXT, not as external facts.` },
    {
      role: "user",
      content: `CONTEXT:\n${formatContext(chunks)}\n\nTOOL RESULTS:\n${toolResults}\n\nUSER QUESTION:\n${question}\n\nUse the most relevant sources first. Answer using only CONTEXT and TOOL RESULTS in a natural conversation style. Be detailed when evidence exists. Include the relevant PDF/source wording directly in the answer under "Trích đoạn từ tài liệu" instead of hiding evidence only in citations.`,
    },
  ];
}
