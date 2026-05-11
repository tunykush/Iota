import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatSource } from "@/lib/api/types";
import { embedTexts } from "@/lib/embeddings";
import { planContextQueries } from "./context-orchestrator";
import { retrieveBookChunks2Phase } from "./book-retrieval-2phase";

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

type MatchChunkRow = Omit<ChunkRow, "documents"> & {
  title: string | null;
  document_source_type: ChatSource["sourceType"] | null;
  document_url: string | null;
  similarity: number | null;
};

type ScoredRetrievedChunk = RetrievedChunk & {
  vectorScore?: number;
  keywordScore?: number;
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

function isSummaryQuery(query: string): boolean {
  return /\b(summarize|summary|overview|brief)\b|tóm\s*tắt|tổng\s*quan/iu.test(query);
}

function toText(row: ChunkRow): string {
  const metadataText = typeof row.metadata?.text === "string" ? row.metadata.text : null;
  const metadataContent = typeof row.metadata?.content === "string" ? row.metadata.content : null;
  return row.text ?? metadataText ?? metadataContent ?? "";
}

function toRetrievedFromMatch(row: MatchChunkRow): ScoredRetrievedChunk {
  const text = toText({ ...row, documents: null }).trim();
  const vectorScore = Number((row.similarity ?? 0).toFixed(3));
  return {
    documentId: row.document_id,
    chunkId: row.id,
    title: row.title ?? "Untitled document",
    sourceType: row.source_type ?? row.document_source_type ?? "pdf",
    pageNumber: row.page_number ?? undefined,
    url: row.url ?? row.document_url ?? undefined,
    score: vectorScore,
    vectorScore,
    snippet: buildSnippet("", text),
    text,
  };
}

async function retrieveVectorChunks(input: {
  supabase: SupabaseClient;
  userId: string;
  query: string;
  topK: number;
  documentIds?: string[];
}): Promise<ScoredRetrievedChunk[]> {
  const { embeddings } = await embedTexts([input.query]);
  const { data, error } = await input.supabase.rpc("match_document_chunks", {
    query_embedding: embeddings[0],
    match_count: input.topK,
    filter_user_id: input.userId,
    filter_document_ids: input.documentIds?.length ? input.documentIds : null,
  });

  if (error) throw new Error(`Vector retrieval failed: ${error.message}`);

  return ((data ?? []) as MatchChunkRow[])
    .map(toRetrievedFromMatch)
    .filter((chunk) => chunk.text.length > 0);
}

async function retrieveKeywordChunks(input: {
  supabase: SupabaseClient;
  userId: string;
  query: string;
  topK: number;
  documentIds?: string[];
}): Promise<ScoredRetrievedChunk[]> {
  const fetchLimit = isSummaryQuery(input.query) ? Math.max(200, input.topK * 30) : 200;
  let query = input.supabase
    .from("document_chunks")
    .select("id, document_id, chunk_index, text, source_type, page_number, url, metadata, documents(title, source_type, url)")
    .eq("user_id", input.userId)
    .order("chunk_index", { ascending: true })
    .limit(fetchLimit);

  if (input.documentIds?.length) {
    query = query.in("document_id", input.documentIds);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to retrieve document chunks: ${error.message}`);
  }

  const chunks = ((data ?? []) as ChunkRow[])
    .map((row, index) => {
      const text = toText(row).trim();
      const document = firstDocument(row);
      const title = document?.title ?? "Untitled document";
      const keywordScore = scoreChunk(input.query, text, title, row.chunk_index ?? index);
      return {
        documentId: row.document_id,
        chunkId: row.id,
        title,
        sourceType: row.source_type ?? document?.source_type ?? "pdf",
        pageNumber: row.page_number ?? undefined,
        url: row.url ?? document?.url ?? undefined,
        score: keywordScore,
        keywordScore,
        snippet: buildSnippet(input.query, text),
        text,
      } satisfies ScoredRetrievedChunk;
    })
    .filter((chunk) => chunk.text.length > 0);

  if (isSummaryQuery(input.query)) {
    return chunks.slice(0, input.topK);
  }

  return chunks.sort((a, b) => b.score - a.score).slice(0, input.topK);
}

function normalizeScore(score: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  return Math.max(0, Math.min(score / maxScore, 1));
}

function mergeHybridChunks(vectorChunks: ScoredRetrievedChunk[], keywordChunks: ScoredRetrievedChunk[], topK: number): RetrievedChunk[] {
  const merged = new Map<string, ScoredRetrievedChunk>();
  const maxVectorScore = Math.max(0, ...vectorChunks.map((chunk) => chunk.vectorScore ?? chunk.score));
  const maxKeywordScore = Math.max(0, ...keywordChunks.map((chunk) => chunk.keywordScore ?? chunk.score));

  for (const chunk of [...vectorChunks, ...keywordChunks]) {
    const existing = merged.get(chunk.chunkId);
    merged.set(chunk.chunkId, {
      ...(existing ?? chunk),
      vectorScore: Math.max(existing?.vectorScore ?? 0, chunk.vectorScore ?? 0),
      keywordScore: Math.max(existing?.keywordScore ?? 0, chunk.keywordScore ?? 0),
      snippet: existing?.snippet && existing.snippet.length > chunk.snippet.length ? existing.snippet : chunk.snippet,
    });
  }

  return Array.from(merged.values())
    .map((chunk) => {
      const vector = normalizeScore(chunk.vectorScore ?? 0, maxVectorScore);
      const keyword = normalizeScore(chunk.keywordScore ?? 0, maxKeywordScore);
      const hybridScore = Number((vector * 0.62 + keyword * 0.38).toFixed(3));
      return { ...chunk, score: hybridScore };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

function mergeBookAndStandardCandidates(
  bookChunks: RetrievedChunk[],
  standardChunks: RetrievedChunk[],
  topK: number,
  summaryQuery: boolean,
): RetrievedChunk[] {
  const seen = new Set<string>();
  const uniqueBook = bookChunks.filter((chunk) => {
    if (seen.has(chunk.chunkId)) return false;
    seen.add(chunk.chunkId);
    return true;
  });

  const uniqueStandard = standardChunks.filter((chunk) => {
    if (seen.has(chunk.chunkId)) return false;
    seen.add(chunk.chunkId);
    return true;
  });

  if (uniqueStandard.length === 0) return uniqueBook.slice(0, topK);
  if (uniqueBook.length === 0) return uniqueStandard.slice(0, topK);

  const standardSlots = summaryQuery
    ? Math.min(uniqueStandard.length, Math.max(1, Math.floor(topK * 0.25)))
    : Math.min(uniqueStandard.length, Math.max(1, Math.floor(topK * 0.35)));
  const bookSlots = Math.max(1, topK - standardSlots);
  const selected = [
    ...uniqueBook.slice(0, bookSlots),
    ...uniqueStandard.slice(0, standardSlots),
  ];
  const selectedIds = new Set(selected.map((chunk) => chunk.chunkId));
  const remainder = [...uniqueBook, ...uniqueStandard]
    .filter((chunk) => !selectedIds.has(chunk.chunkId))
    .sort((a, b) => b.score - a.score);

  return [...selected, ...remainder].slice(0, topK);
}

export type RetrieveRelevantChunksInput = {
  supabase: SupabaseClient;
  userId: string;
  query: string;
  topK?: number;
  documentIds?: string[];
};

export async function retrieveRelevantChunks(input: RetrieveRelevantChunksInput): Promise<RetrievedChunk[]> {
  const summaryQuery = isSummaryQuery(input.query);
  const requestedTopK = input.topK ?? (summaryQuery ? 12 : 5);
  const topK = Math.max(1, Math.min(summaryQuery ? Math.max(requestedTopK, 12) : requestedTopK, summaryQuery ? 20 : 10));
  const retrievalQuery = planContextQueries(input.query).join(" ");
  let chunks: RetrievedChunk[] = [];

  // ── Try 2-phase Book RAG retrieval first ──
  // If the user's documents contain book-structured content, use the specialized
  // 2-phase retrieval (summary → detail) for better results.
  try {
    const bookResult = await retrieveBookChunks2Phase({
      supabase: input.supabase,
      userId: input.userId,
      query: input.query,
      topK,
      documentIds: input.documentIds,
    });

    if (bookResult && bookResult.chunks.length > 0) {
      console.log(`[Book RAG] 2-phase retrieval: ${bookResult.chunks.length} chunks from chapters [${bookResult.phase1Chapters.join(", ")}]${bookResult.entityMatches.length > 0 ? `, entities: [${bookResult.entityMatches.join(", ")}]` : ""}`);

      // If book retrieval found enough results, use them
      // But also run standard retrieval to catch non-book documents
      let standardChunks: RetrievedChunk[] = [];
      try {
        if (summaryQuery) {
          standardChunks = await retrieveKeywordChunks({ ...input, query: retrievalQuery, topK: Math.min(topK, 5) });
        } else {
          const [vectorChunks, keywordChunks] = await Promise.all([
            retrieveVectorChunks({ ...input, query: retrievalQuery, topK: Math.min(topK, 5) }),
            retrieveKeywordChunks({ ...input, query: retrievalQuery, topK: Math.min(topK, 5) }),
          ]);
          standardChunks = mergeHybridChunks(vectorChunks, keywordChunks, Math.min(topK, 5));
        }
      } catch {
        // Standard retrieval failure is OK if book retrieval succeeded
      }

      chunks = mergeBookAndStandardCandidates(bookResult.chunks, standardChunks, topK, summaryQuery);

      if (chunks.length > 0) return chunks;
    }
  } catch (bookError) {
    // Book retrieval failed — fall through to standard retrieval
    console.warn(`[Book RAG] 2-phase retrieval failed (falling back to standard): ${bookError instanceof Error ? bookError.message : "unknown"}`);
  }

  // ── Standard retrieval (unchanged) ──
  if (summaryQuery) {
    chunks = await retrieveKeywordChunks({ ...input, query: retrievalQuery, topK });
  } else try {
    const [vectorChunks, keywordChunks] = await Promise.all([
      retrieveVectorChunks({ ...input, query: retrievalQuery, topK: Math.min(topK * 2, 20) }),
      retrieveKeywordChunks({ ...input, query: retrievalQuery, topK: Math.min(topK * 2, 20) }),
    ]);
    chunks = mergeHybridChunks(vectorChunks, keywordChunks, topK);
  } catch {
    chunks = await retrieveKeywordChunks({ ...input, query: retrievalQuery, topK });
  }

  if (chunks.length === 0) {
    if (input.documentIds?.length) {
      throw new Error("No indexed document chunks found for the selected source. Choose All sources or re-ingest this source before chatting.");
    }
    throw new Error("No indexed document chunks found for this user. Upload and ingest documents before chatting.");
  }

  return chunks;
}
