import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatSource } from "@/lib/api/types";

export type RetrievedChunk = ChatSource & {
  text: string;
};

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
  "what",
  "how",
  "are",
  "you",
  "toi",
  "tôi",
  "la",
  "là",
  "gi",
  "gì",
  "cho",
  "cua",
  "của",
  "ve",
  "về",
  "nay",
  "này",
  "trong",
]);

type ChunkRow = {
  id: string;
  document_id: string;
  chunk_index: number | null;
  text: string | null;
  source_type: ChatSource["sourceType"] | null;
  page_number: number | null;
  url: string | null;
  metadata: Record<string, unknown> | null;
  documents:
    | {
    title: string | null;
    source_type: ChatSource["sourceType"] | null;
    url: string | null;
  }
    | {
        title: string | null;
        source_type: ChatSource["sourceType"] | null;
        url: string | null;
      }[]
    | null;
};

type ChunkDocument = {
  title: string | null;
  source_type: ChatSource["sourceType"] | null;
  url: string | null;
};

function firstDocument(row: ChunkRow): ChunkDocument | null {
  return Array.isArray(row.documents) ? (row.documents[0] ?? null) : row.documents;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\u00c0-\u1ef9_-]/gi, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function scoreChunk(query: string, chunkText: string, title: string, index: number): number {
  const queryTokens = Array.from(new Set(tokenize(query)));
  if (queryTokens.length === 0) return 0;

  const titleTokens = new Set(tokenize(title));
  const bodyTokens = tokenize(chunkText);
  const bodyTokenSet = new Set(bodyTokens);
  const normalizedBody = ` ${bodyTokens.join(" ")} `;
  const normalizedQuery = queryTokens.join(" ");

  let score = 0;
  let matched = 0;

  for (const token of queryTokens) {
    if (titleTokens.has(token)) score += 1.4;
    if (bodyTokenSet.has(token)) {
      score += 1;
      matched += 1;
    }
  }

  if (normalizedQuery.length > 4 && normalizedBody.includes(` ${normalizedQuery} `)) {
    score += 2.5;
  }

  const coverage = matched / queryTokens.length;
  const density = matched / Math.max(30, bodyTokens.length);
  const positionBoost = Math.max(0, 0.2 - index * 0.01);

  return Number((score * 0.65 + coverage * 3 + density * 12 + positionBoost).toFixed(3));
}

function buildSnippet(query: string, text: string): string {
  const tokens = tokenize(query);
  const lowerText = text.toLowerCase();
  const hitIndex = tokens
    .map((token) => lowerText.indexOf(token.toLowerCase()))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];

  if (hitIndex === undefined) return text.slice(0, 280);

  const start = Math.max(0, hitIndex - 120);
  const end = Math.min(text.length, hitIndex + 220);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

function toText(row: ChunkRow): string {
  const metadataText = typeof row.metadata?.text === "string" ? row.metadata.text : null;
  const metadataContent = typeof row.metadata?.content === "string" ? row.metadata.content : null;
  return row.text ?? metadataText ?? metadataContent ?? "";
}

export async function retrieveRelevantChunks(input: {
  supabase: SupabaseClient;
  userId: string;
  query: string;
  topK?: number;
  documentIds?: string[];
}): Promise<RetrievedChunk[]> {
  const topK = Math.max(1, Math.min(input.topK ?? 5, 10));
  let query = input.supabase
    .from("document_chunks")
    .select("id, document_id, chunk_index, text, source_type, page_number, url, metadata, documents(title, source_type, url)")
    .eq("user_id", input.userId)
    .limit(200);

  if (input.documentIds?.length) {
    query = query.in("document_id", input.documentIds);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to retrieve document chunks: ${error.message}`);
  }

  const rows = (data ?? []) as ChunkRow[];
  const chunks = rows
    .map((row, index) => {
      const text = toText(row).trim();
      const document = firstDocument(row);
      const title = document?.title ?? "Untitled document";
      return {
        documentId: row.document_id,
        chunkId: row.id,
        title,
        sourceType: row.source_type ?? document?.source_type ?? "pdf",
        pageNumber: row.page_number ?? undefined,
        url: row.url ?? document?.url ?? undefined,
        score: scoreChunk(input.query, text, title, row.chunk_index ?? index),
        snippet: buildSnippet(input.query, text),
        text,
      } satisfies RetrievedChunk;
    })
    .filter((chunk) => chunk.text.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  if (chunks.length === 0) {
    throw new Error("No indexed document chunks found for this user. Upload and ingest documents before chatting.");
  }

  return chunks;
}
