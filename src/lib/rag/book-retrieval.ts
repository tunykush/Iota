/**
 * Book-Aware Retrieval — Enhances standard retrieval with book structure awareness.
 *
 * Key differences from standard RAG retrieval:
 * 1. **Two-phase retrieval**: First find relevant chapters via summary chunks,
 *    then drill into detail chunks within those chapters
 * 2. **Chapter context injection**: Detail chunks are enriched with their chapter context
 * 3. **Position-aware scoring**: Chunks near each other in the book get proximity boosts
 * 4. **Hierarchical deduplication**: Avoids returning both a summary and its detail chunks
 */

import type { RetrievedChunk } from "./retrieval";
import type { BookChunkType } from "./book-chunker";

// ── Types ──────────────────────────────────────────────────────────────────

type BookChunkMetadata = {
  bookRag: true;
  chunkType: BookChunkType;
  chapterNumber: number | null;
  chapterTitle: string | null;
  sectionId: string | null;
  sectionTitle: string | null;
  depth: number;
  positionInBook: number;
  parentContext: string | null;
  prevChunkHint: string | null;
  nextChunkHint: string | null;
};

export type BookEnrichedChunk = RetrievedChunk & {
  bookMetadata?: BookChunkMetadata;
  chapterContext?: string;
  hierarchyPath?: string;
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function getBookMeta(chunk: RetrievedChunk): BookChunkMetadata | null {
  // Book metadata is stored in the chunk's metadata field in the DB
  // It gets passed through as part of the chunk text's metadata
  const raw = chunk as unknown as { metadata?: Record<string, unknown> };
  if (raw.metadata?.bookRag === true) return raw.metadata as unknown as BookChunkMetadata;
  // Also check if it's embedded in the text pattern
  if (chunk.text.startsWith("[Book:") || chunk.text.startsWith("[Chapter")) {
    return inferBookMetaFromText(chunk);
  }
  return null;
}

function inferBookMetaFromText(chunk: RetrievedChunk): BookChunkMetadata | null {
  const text = chunk.text;
  if (text.startsWith("[Book:")) {
    return {
      bookRag: true,
      chunkType: "book_summary",
      chapterNumber: null,
      chapterTitle: null,
      sectionId: null,
      sectionTitle: null,
      depth: 0,
      positionInBook: 0,
      parentContext: null,
      prevChunkHint: null,
      nextChunkHint: null,
    };
  }
  const chapterMatch = text.match(/^\[Chapter\s*(\d+)?:\s*(.+?)\]/);
  if (chapterMatch) {
    return {
      bookRag: true,
      chunkType: "chapter_summary",
      chapterNumber: chapterMatch[1] ? Number.parseInt(chapterMatch[1], 10) : null,
      chapterTitle: chapterMatch[2] ?? null,
      sectionId: null,
      sectionTitle: null,
      depth: 1,
      positionInBook: 0,
      parentContext: null,
      prevChunkHint: null,
      nextChunkHint: null,
    };
  }
  const sectionMatch = text.match(/^\[Section:\s*(.+?)\]/);
  if (sectionMatch) {
    return {
      bookRag: true,
      chunkType: "section_summary",
      chapterNumber: null,
      chapterTitle: null,
      sectionId: null,
      sectionTitle: sectionMatch[1] ?? null,
      depth: 2,
      positionInBook: 0,
      parentContext: null,
      prevChunkHint: null,
      nextChunkHint: null,
    };
  }
  return null;
}

// ── Core: Enrich chunks with book context ──────────────────────────────────

/**
 * Enrich retrieved chunks with book structure context.
 * This is the main entry point for book-aware retrieval post-processing.
 */
export function enrichChunksWithBookContext(chunks: RetrievedChunk[]): BookEnrichedChunk[] {
  // Separate book chunks from regular chunks
  const bookChunks: BookEnrichedChunk[] = [];
  const regularChunks: BookEnrichedChunk[] = [];

  for (const chunk of chunks) {
    const meta = getBookMeta(chunk);
    if (meta) {
      const hierarchyPath = buildHierarchyPath(meta);
      bookChunks.push({
        ...chunk,
        bookMetadata: meta,
        chapterContext: meta.parentContext ?? undefined,
        hierarchyPath,
      });
    } else {
      regularChunks.push(chunk);
    }
  }

  if (bookChunks.length === 0) return chunks;

  // Apply book-specific scoring adjustments
  const enriched = applyBookScoring(bookChunks);

  // Deduplicate: if we have both a chapter summary and detail chunks from same chapter,
  // prefer detail chunks but keep the summary if it's the only representative
  const deduped = deduplicateBookChunks(enriched);

  // Merge back with regular chunks
  return [...deduped, ...regularChunks].sort((a, b) => b.score - a.score);
}

function buildHierarchyPath(meta: BookChunkMetadata): string {
  const parts: string[] = [];
  if (meta.chapterTitle) {
    parts.push(meta.chapterNumber ? `Ch.${meta.chapterNumber}: ${meta.chapterTitle}` : meta.chapterTitle);
  }
  if (meta.sectionTitle) parts.push(meta.sectionTitle);
  if (meta.chunkType === "detail") parts.push("(detail)");
  return parts.join(" → ") || "Unknown";
}

// ── Scoring adjustments ────────────────────────────────────────────────────

function applyBookScoring(chunks: BookEnrichedChunk[]): BookEnrichedChunk[] {
  // Group by chapter
  const chapterGroups = new Map<number | string, BookEnrichedChunk[]>();
  for (const chunk of chunks) {
    const key = chunk.bookMetadata?.chapterNumber ?? chunk.bookMetadata?.chapterTitle ?? "unknown";
    const group = chapterGroups.get(key) ?? [];
    group.push(chunk);
    chapterGroups.set(key, group);
  }

  // Apply proximity boost: chunks from the same chapter as high-scoring chunks get a boost
  const topChapterKeys = new Set<number | string>();
  for (const chunk of chunks.slice(0, 3)) {
    const key = chunk.bookMetadata?.chapterNumber ?? chunk.bookMetadata?.chapterTitle ?? "unknown";
    topChapterKeys.add(key);
  }

  return chunks.map((chunk) => {
    const meta = chunk.bookMetadata;
    if (!meta) return chunk;

    let scoreAdjust = 0;
    const key = meta.chapterNumber ?? meta.chapterTitle ?? "unknown";

    // Proximity boost: same chapter as top results
    if (topChapterKeys.has(key)) scoreAdjust += 0.05;

    // Summary chunks get a slight penalty for specific queries (detail is better)
    if (meta.chunkType === "chapter_summary" || meta.chunkType === "section_summary") {
      scoreAdjust -= 0.02;
    }

    // Book summary gets a bigger penalty (only useful for "what is this book about" queries)
    if (meta.chunkType === "book_summary") {
      scoreAdjust -= 0.08;
    }

    return {
      ...chunk,
      score: Math.max(0, Number((chunk.score + scoreAdjust).toFixed(3))),
    };
  });
}

// ── Deduplication ──────────────────────────────────────────────────────────

function deduplicateBookChunks(chunks: BookEnrichedChunk[]): BookEnrichedChunk[] {
  // If we have detail chunks from a chapter, remove the chapter summary
  // (unless the summary is the only chunk from that chapter)
  const chapterDetailCounts = new Map<string, number>();
  for (const chunk of chunks) {
    if (chunk.bookMetadata?.chunkType === "detail" && chunk.bookMetadata.chapterTitle) {
      const key = chunk.bookMetadata.chapterTitle;
      chapterDetailCounts.set(key, (chapterDetailCounts.get(key) ?? 0) + 1);
    }
  }

  return chunks.filter((chunk) => {
    if (chunk.bookMetadata?.chunkType === "chapter_summary" && chunk.bookMetadata.chapterTitle) {
      const detailCount = chapterDetailCounts.get(chunk.bookMetadata.chapterTitle) ?? 0;
      // Remove summary if we already have 2+ detail chunks from this chapter
      if (detailCount >= 2) return false;
    }
    return true;
  });
}

// ── Context assembly for book chunks ───────────────────────────────────────

/**
 * Build enriched context text for a book chunk.
 * Prepends chapter/section context so the LLM understands where this chunk fits.
 */
export function buildBookChunkContextText(chunk: BookEnrichedChunk): string {
  const parts: string[] = [];

  // Add hierarchy breadcrumb
  if (chunk.hierarchyPath) {
    parts.push(`[📖 ${chunk.hierarchyPath}]`);
  }

  // Add parent context for detail chunks
  if (chunk.bookMetadata?.chunkType === "detail" && chunk.chapterContext) {
    parts.push(`Context: ${chunk.chapterContext}`);
  }

  // Add the actual chunk text
  parts.push(chunk.text);

  return parts.join("\n");
}

/**
 * Check if a set of chunks contains book-structured content.
 */
export function hasBookContent(chunks: RetrievedChunk[]): boolean {
  return chunks.some((chunk) => getBookMeta(chunk) !== null);
}

/**
 * Get a summary of the book structure from the retrieved chunks.
 * Useful for the LLM to understand the document structure.
 */
export function getBookStructureSummary(chunks: BookEnrichedChunk[]): string | null {
  const bookSummary = chunks.find((c) => c.bookMetadata?.chunkType === "book_summary");
  if (bookSummary) return bookSummary.text;

  // Build a mini-summary from chapter summaries
  const chapterSummaries = chunks
    .filter((c) => c.bookMetadata?.chunkType === "chapter_summary")
    .map((c) => c.bookMetadata?.chapterTitle)
    .filter(Boolean);

  if (chapterSummaries.length > 0) {
    return `Book chapters found: ${chapterSummaries.join(", ")}`;
  }

  return null;
}
