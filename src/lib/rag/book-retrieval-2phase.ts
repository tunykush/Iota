/**
 * 2-Phase Book Retrieval — Uses DB-level RPCs for efficient book-aware search.
 *
 * Phase 1: Search summary chunks (book_summary, chapter_summary, section_summary)
 *          to identify which chapters are relevant to the query.
 * Phase 2: Search detail chunks WITHIN those chapters for precise answers.
 *
 * Also supports:
 * - Entity-aware retrieval: detect entity names in query → fetch entity chunks
 * - Adjacent chunk stitching: fetch neighboring chunks for narrative continuity
 * - Book-order sorting: return chunks in book order for narrative queries
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { embedTexts } from "@/lib/embeddings";
import type { BookEnrichedChunk } from "./book-retrieval";

// ── Types ──────────────────────────────────────────────────────────────────

export type BookRetrievalInput = {
  supabase: SupabaseClient;
  userId: string;
  query: string;
  topK?: number;
  documentIds?: string[];
};

export type BookRetrievalResult = {
  chunks: BookEnrichedChunk[];
  phase1Chapters: number[];
  isBookQuery: boolean;
  entityMatches: string[];
};

type SummaryChunkRow = {
  id: string;
  document_id: string;
  chunk_index: number;
  text: string;
  source_type: string;
  page_number: number | null;
  url: string | null;
  metadata: Record<string, unknown> | null;
  title: string;
  document_source_type: string;
  document_url: string | null;
  similarity: number;
  chunk_type: string;
  chapter_number: number | null;
};

type DetailChunkRow = SummaryChunkRow & {
  position_in_book: number | null;
};

type EntityChunkRow = {
  chunk_id: string;
  document_id: string;
  text: string;
  chapter_number: number | null;
  position_in_book: number | null;
  entity_name: string;
  entity_type: string;
};

type AdjacentChunkRow = {
  id: string;
  document_id: string;
  chunk_index: number;
  text: string;
  chunk_type: string | null;
  chapter_number: number | null;
  position_in_book: number | null;
  relative_position: number;
};

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Detect if a query is about the book's structure/overview (broad) vs specific content */
function isBroadBookQuery(query: string): boolean {
  return /\b(summary|summarize|overview|tóm\s*tắt|tổng\s*quan|nội\s*dung\s*chính|about\s+this\s+book|sách\s+này\s+nói\s+về|mục\s*lục|table\s+of\s+contents)\b/iu.test(query);
}

/** Detect if a query asks about narrative flow / sequence */
function isNarrativeQuery(query: string): boolean {
  return /\b(what\s+happens?\s+next|tiếp\s+theo|sau\s+đó|trước\s+đó|before\s+that|after\s+that|sequence|diễn\s*biến|timeline)\b/iu.test(query);
}

/** Extract potential entity names from a query (simple heuristic) */
function extractPotentialEntities(query: string): string[] {
  const entities: string[] = [];
  // Capitalized words that aren't at sentence start (likely proper nouns)
  const words = query.split(/\s+/);
  for (let i = 1; i < words.length; i++) {
    const word = words[i].replace(/[.,!?;:'"()]/g, "");
    if (word.length > 1 && /^[A-ZĐÀ-Ỹ]/.test(word) && !/^(The|And|But|For|With|This|That|What|How|Are|You|From|Into|About|Trong|Của|Và|Hoặc|Những|Các|Một)$/.test(word)) {
      entities.push(word);
    }
  }
  // Also check for quoted strings
  const quoted = query.match(/"([^"]+)"|'([^']+)'/g);
  if (quoted) {
    for (const q of quoted) {
      entities.push(q.replace(/['"]/g, ""));
    }
  }
  return entities;
}

function summaryRowToChunk(row: SummaryChunkRow): BookEnrichedChunk {
  return {
    documentId: row.document_id,
    chunkId: row.id,
    title: row.title ?? "Untitled",
    sourceType: (row.source_type ?? row.document_source_type ?? "pdf") as "pdf" | "website" | "database",
    pageNumber: row.page_number ?? undefined,
    url: row.url ?? row.document_url ?? undefined,
    score: Number((row.similarity ?? 0).toFixed(3)),
    snippet: row.text.slice(0, 360),
    text: row.text,
    bookMetadata: {
      bookRag: true,
      chunkType: row.chunk_type as "book_summary" | "chapter_summary" | "section_summary",
      chapterNumber: row.chapter_number ?? null,
      chapterTitle: null,
      sectionId: null,
      sectionTitle: null,
      depth: row.chunk_type === "book_summary" ? 0 : row.chunk_type === "chapter_summary" ? 1 : 2,
      positionInBook: 0,
      parentContext: null,
      prevChunkHint: null,
      nextChunkHint: null,
    },
    hierarchyPath: row.chapter_number ? `Ch.${row.chapter_number}` : "Book",
  };
}

function detailRowToChunk(row: DetailChunkRow): BookEnrichedChunk {
  return {
    documentId: row.document_id,
    chunkId: row.id,
    title: row.title ?? "Untitled",
    sourceType: (row.source_type ?? row.document_source_type ?? "pdf") as "pdf" | "website" | "database",
    pageNumber: row.page_number ?? undefined,
    url: row.url ?? row.document_url ?? undefined,
    score: Number((row.similarity ?? 0).toFixed(3)),
    snippet: row.text.slice(0, 360),
    text: row.text,
    bookMetadata: {
      bookRag: true,
      chunkType: "detail",
      chapterNumber: row.chapter_number ?? null,
      chapterTitle: null,
      sectionId: null,
      sectionTitle: null,
      depth: 3,
      positionInBook: row.position_in_book ?? 0,
      parentContext: null,
      prevChunkHint: null,
      nextChunkHint: null,
    },
    hierarchyPath: row.chapter_number ? `Ch.${row.chapter_number} → (detail)` : "(detail)",
  };
}

// ── Core: 2-Phase Retrieval ────────────────────────────────────────────────

/**
 * Check if a document has book-structured chunks in the DB.
 * Uses a quick count query on chunk_type column.
 */
export async function hasBookChunksInDb(input: {
  supabase: SupabaseClient;
  userId: string;
  documentIds?: string[];
}): Promise<boolean> {
  let query = input.supabase
    .from("document_chunks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", input.userId)
    .not("chunk_type", "is", null);

  if (input.documentIds?.length) {
    query = query.in("document_id", input.documentIds);
  }

  const { count } = await query;
  return (count ?? 0) > 0;
}

/**
 * Main 2-phase book retrieval.
 * Returns null if no book content found (caller should fall back to standard retrieval).
 */
export async function retrieveBookChunks2Phase(input: BookRetrievalInput): Promise<BookRetrievalResult | null> {
  const { supabase, userId, query, documentIds } = input;
  const topK = input.topK ?? 8;

  // Quick check: does this user have any book-structured chunks?
  const hasBook = await hasBookChunksInDb({ supabase, userId, documentIds });
  if (!hasBook) return null;

  // Generate embedding for the query
  const { embeddings } = await embedTexts([query]);
  const queryEmbedding = embeddings[0];

  const isBroad = isBroadBookQuery(query);
  const isNarrative = isNarrativeQuery(query);
  const potentialEntities = extractPotentialEntities(query);

  // ── Phase 1: Search summary chunks to find relevant chapters ──
  const { data: summaryData, error: summaryError } = await supabase.rpc("match_book_summary_chunks", {
    query_embedding: queryEmbedding,
    match_count: isBroad ? 10 : 5,
    filter_user_id: userId,
    filter_document_ids: documentIds?.length ? documentIds : null,
  });

  if (summaryError) {
    console.warn(`[Book RAG 2-Phase] Summary search failed: ${summaryError.message}`);
    return null;
  }

  const summaryChunks = ((summaryData ?? []) as SummaryChunkRow[]).map(summaryRowToChunk);

  // Extract chapter numbers from top summary results
  const relevantChapters = Array.from(new Set(
    summaryChunks
      .filter((c) => c.bookMetadata?.chapterNumber != null)
      .map((c) => c.bookMetadata!.chapterNumber!)
  ));

  // For broad queries, return summary chunks directly
  if (isBroad && summaryChunks.length > 0) {
    return {
      chunks: summaryChunks.slice(0, topK),
      phase1Chapters: relevantChapters,
      isBookQuery: true,
      entityMatches: [],
    };
  }

  // ── Phase 2: Search detail chunks within relevant chapters ──
  const { data: detailData, error: detailError } = await supabase.rpc("match_book_detail_chunks", {
    query_embedding: queryEmbedding,
    match_count: topK * 2,
    filter_user_id: userId,
    filter_document_ids: documentIds?.length ? documentIds : null,
    filter_chapter_numbers: relevantChapters.length > 0 ? relevantChapters : null,
  });

  if (detailError) {
    console.warn(`[Book RAG 2-Phase] Detail search failed: ${detailError.message}`);
    // Fall back to summary chunks only
    return {
      chunks: summaryChunks.slice(0, topK),
      phase1Chapters: relevantChapters,
      isBookQuery: true,
      entityMatches: [],
    };
  }

  let detailChunks = ((detailData ?? []) as DetailChunkRow[]).map(detailRowToChunk);

  // ── Entity-aware retrieval ──
  const entityMatches: string[] = [];
  if (potentialEntities.length > 0) {
    for (const entityName of potentialEntities.slice(0, 3)) {
      try {
        const { data: entityData } = await supabase.rpc("match_entity_chunks", {
          query_entity_name: entityName,
          filter_user_id: userId,
          filter_document_ids: documentIds?.length ? documentIds : null,
          match_count: 5,
        });

        if (entityData && (entityData as EntityChunkRow[]).length > 0) {
          entityMatches.push(entityName);
          // Add entity chunks that aren't already in results
          const existingIds = new Set(detailChunks.map((c) => c.chunkId));
          for (const row of entityData as EntityChunkRow[]) {
            if (!existingIds.has(row.chunk_id)) {
              detailChunks.push({
                documentId: row.document_id,
                chunkId: row.chunk_id,
                title: `Entity: ${row.entity_name}`,
                sourceType: "pdf",
                score: 0.7, // entity match gets a decent base score
                snippet: row.text.slice(0, 360),
                text: row.text,
                bookMetadata: {
                  bookRag: true,
                  chunkType: "detail",
                  chapterNumber: row.chapter_number,
                  chapterTitle: null,
                  sectionId: null,
                  sectionTitle: null,
                  depth: 3,
                  positionInBook: row.position_in_book ?? 0,
                  parentContext: null,
                  prevChunkHint: null,
                  nextChunkHint: null,
                },
                hierarchyPath: `Entity: ${row.entity_name} (${row.entity_type})`,
              });
            }
          }
        }
      } catch {
        // Entity search is best-effort
      }
    }
  }

  // ── Adjacent chunk stitching for narrative queries ──
  if (isNarrative && detailChunks.length > 0) {
    const topChunk = detailChunks[0];
    try {
      const { data: adjacentData } = await supabase.rpc("get_adjacent_chunks", {
        target_chunk_id: topChunk.chunkId,
        window_size: 2,
      });

      if (adjacentData) {
        const existingIds = new Set(detailChunks.map((c) => c.chunkId));
        for (const row of adjacentData as AdjacentChunkRow[]) {
          if (!existingIds.has(row.id) && row.relative_position !== 0) {
            detailChunks.push({
              documentId: row.document_id,
              chunkId: row.id,
              title: "Adjacent context",
              sourceType: "pdf",
              score: Math.max(0, topChunk.score - 0.1 * Math.abs(row.relative_position)),
              snippet: row.text.slice(0, 360),
              text: row.text,
              bookMetadata: {
                bookRag: true,
                chunkType: (row.chunk_type as "detail") ?? "detail",
                chapterNumber: row.chapter_number,
                chapterTitle: null,
                sectionId: null,
                sectionTitle: null,
                depth: 3,
                positionInBook: row.position_in_book ?? 0,
                parentContext: null,
                prevChunkHint: null,
                nextChunkHint: null,
              },
              hierarchyPath: `Adjacent (${row.relative_position > 0 ? "after" : "before"})`,
            });
          }
        }
      }
    } catch {
      // Adjacent stitching is best-effort
    }
  }

  // ── Sort and merge ──
  // For narrative queries: sort by position_in_book (book order)
  // For other queries: sort by score (relevance order)
  if (isNarrative) {
    detailChunks.sort((a, b) => (a.bookMetadata?.positionInBook ?? 0) - (b.bookMetadata?.positionInBook ?? 0));
  } else {
    detailChunks.sort((a, b) => b.score - a.score);
  }

  // Include 1-2 summary chunks at the top for context, then detail chunks
  const topSummaries = summaryChunks
    .filter((c) => c.bookMetadata?.chunkType === "chapter_summary")
    .slice(0, 2);

  const finalChunks: BookEnrichedChunk[] = [
    ...topSummaries,
    ...detailChunks,
  ].slice(0, topK);

  return {
    chunks: finalChunks,
    phase1Chapters: relevantChapters,
    isBookQuery: true,
    entityMatches,
  };
}
