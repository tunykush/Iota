import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import type { DocumentSourceType } from "@/lib/api/types";
import { embedTexts } from "@/lib/embeddings";

const MAX_CHARS_PER_CHUNK = 1400;
const MIN_CHARS_PER_CHUNK = 400;
const CHUNK_OVERLAP_CHARS = 180;
const MAX_EMBEDDING_BATCH_TOKENS = 6000;
const MAX_EMBEDDING_BATCH_ITEMS = 48;

export type IngestDocumentInput = {
  supabase: SupabaseClient;
  userId: string;
  documentId: string;
  jobId: string;
  sourceType: DocumentSourceType;
  text: string;
  /** Optional source text split by PDF page so chunk citations can preserve page_number. */
  pageChunks?: IngestibleChunk[];
  url?: string;
  metadata?: Record<string, unknown>;
};

export type IngestibleChunk = {
  text: string;
  pageNumber?: number;
  metadata?: Record<string, unknown>;
};

type PreparedChunk = IngestibleChunk & {
  text: string;
  contentHash: string;
  tokenCount: number;
  originalIndex: number;
};

export type IngestDocumentChunksInput = Omit<IngestDocumentInput, "text"> & {
  chunks: IngestibleChunk[];
};

export function stripHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Detect if a line is a heading (Markdown-style or numbered section) */
function isHeadingLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  // Markdown headings: # Heading, ## Heading, ### Heading
  if (/^#{1,4}\s+\S/.test(trimmed)) return true;
  // Numbered sections: 1. Title, 1.2 Title, 1.2.3 Title
  if (/^\d+(\.\d+)*\.?\s+[A-ZĐ\u00C0-\u1EF9]/.test(trimmed) && trimmed.length < 120) return true;
  // ALL CAPS headings (at least 3 words, under 100 chars)
  if (/^[A-ZĐ\u00C0-\u1EF9\s]{8,100}$/.test(trimmed) && trimmed.split(/\s+/).length >= 2) return true;
  return false;
}

export function chunkText(text: string): string[] {
  const cleaned = text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!cleaned) return [];

  const chunks: string[] = [];

  // ── Phase 1: Split by headings first for semantic boundaries ──
  const lines = cleaned.split("\n");
  const sections: string[] = [];
  let currentSection = "";

  for (const line of lines) {
    if (isHeadingLine(line) && currentSection.trim().length > MIN_CHARS_PER_CHUNK) {
      sections.push(currentSection.trim());
      currentSection = line;
    } else {
      currentSection += (currentSection ? "\n" : "") + line;
    }
  }
  if (currentSection.trim()) sections.push(currentSection.trim());

  // ── Phase 2: Split each section into paragraph-based chunks ──
  const pushCurrent = (current: string) => {
    const normalized = current.trim();
    if (normalized) chunks.push(normalized);
  };

  const splitLongText = (value: string) => {
    let start = 0;
    while (start < value.length) {
      const hardEnd = Math.min(start + MAX_CHARS_PER_CHUNK, value.length);
      const window = value.slice(start, hardEnd);
      const sentenceEnd = Math.max(window.lastIndexOf(". "), window.lastIndexOf("? "), window.lastIndexOf("! "));
      const softEnd = sentenceEnd > MAX_CHARS_PER_CHUNK * 0.55 ? start + sentenceEnd + 1 : hardEnd;
      const chunk = value.slice(start, softEnd).trim();
      if (chunk) chunks.push(chunk);
      if (softEnd >= value.length) break;
      start = Math.max(0, softEnd - CHUNK_OVERLAP_CHARS);
    }
  };

  for (const section of sections) {
    const paragraphs = section.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
    let current = "";

    for (const paragraph of paragraphs) {
      if (paragraph.length > MAX_CHARS_PER_CHUNK) {
        pushCurrent(current);
        current = "";
        splitLongText(paragraph);
        continue;
      }

      const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
      if (candidate.length <= MAX_CHARS_PER_CHUNK || current.length < MIN_CHARS_PER_CHUNK) {
        current = candidate;
      } else {
        pushCurrent(current);
        current = paragraph;
      }
    }

    pushCurrent(current);
  }

  // ── Phase 3: Merge tiny trailing chunks with the previous chunk ──
  const MIN_TRAILING_CHUNK = 100;
  const merged: string[] = [];
  for (const chunk of chunks) {
    if (merged.length > 0 && chunk.length < MIN_TRAILING_CHUNK) {
      merged[merged.length - 1] += `\n\n${chunk}`;
    } else {
      merged.push(chunk);
    }
  }

  return merged;
}

export function chunkTextWithPageNumber(text: string, pageNumber?: number): IngestibleChunk[] {
  return chunkText(text).map((chunk) => ({ text: chunk, pageNumber }));
}

function chunkInputText(input: IngestDocumentInput): IngestibleChunk[] {
  if (input.pageChunks?.length) {
    return input.pageChunks.flatMap((page) =>
      chunkText(page.text).map((text) => ({
        text,
        pageNumber: page.pageNumber,
        metadata: page.metadata,
      })),
    );
  }

  return chunkText(input.text).map((text) => ({ text }));
}

// Re-export semantic chunker for use in ingestion pipelines
export { semanticChunkText, semanticChunkTextWithPageNumber } from "./semantic-chunker";

// Book RAG: import for local use + re-export for external consumers
import { chunkBookText as _chunkBookText, bookChunksToIngestible as _bookChunksToIngestible, type BookChunk } from "./book-chunker";
import { extractBookEntities, persistBookEntities } from "./book-entity-extractor";
export { chunkBookText, bookChunksToIngestible } from "./book-chunker";
export { isBookLikeDocument } from "./book-structure";

export function getEmptyTextIngestionMessage(sourceType: DocumentSourceType): string {
  if (sourceType === "website") {
    return "No extractable text found for this web page. The URL may be missing, blocked, rendered mostly with JavaScript, or contain non-text content.";
  }

  return "No extractable text found for this document. Scanned/image-only PDFs are not supported yet because OCR is not enabled.";
}

function hashContent(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return String(error);
}

function isBookSchemaUnavailable(error: unknown): boolean {
  const message = getErrorMessage(error);
  const mentionsBookSchema = /book_structures|book_chapters|book_entities|chunk_type|chapter_number|section_depth|position_in_book|chapter_id/i.test(message);
  const isSchemaError = /schema cache|relation .* does not exist|column .* does not exist|could not find|unknown column/i.test(message);
  return mentionsBookSchema && isSchemaError;
}

async function cleanupBookMetadataRows(input: Pick<IngestDocumentInput, "supabase" | "userId" | "documentId">) {
  await Promise.allSettled([
    input.supabase.from("book_entities").delete().eq("document_id", input.documentId).eq("user_id", input.userId),
    input.supabase.from("book_chapters").delete().eq("document_id", input.documentId).eq("user_id", input.userId),
    input.supabase.from("book_structures").delete().eq("document_id", input.documentId).eq("user_id", input.userId),
  ]);
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function prepareChunks(chunks: IngestibleChunk[]): PreparedChunk[] {
  const seen = new Set<string>();
  return chunks
    .map((chunk, originalIndex) => {
      const text = chunk.text.replace(/\s+/g, " ").trim();
      return { ...chunk, text, contentHash: hashContent(text), tokenCount: estimateTokens(text), originalIndex };
    })
    .filter((chunk) => {
      if (!chunk.text || seen.has(chunk.contentHash)) return false;
      seen.add(chunk.contentHash);
      return true;
    });
}

function createEmbeddingBatches(chunks: PreparedChunk[]): PreparedChunk[][] {
  const batches: PreparedChunk[][] = [];
  let current: PreparedChunk[] = [];
  let currentTokens = 0;

  for (const chunk of chunks) {
    const wouldOverflow = current.length >= MAX_EMBEDDING_BATCH_ITEMS || currentTokens + chunk.tokenCount > MAX_EMBEDDING_BATCH_TOKENS;
    if (current.length > 0 && wouldOverflow) {
      batches.push(current);
      current = [];
      currentTokens = 0;
    }
    current.push(chunk);
    currentTokens += chunk.tokenCount;
  }

  if (current.length > 0) batches.push(current);
  return batches;
}

async function updateTask(input: IngestDocumentChunksInput, patch: Record<string, unknown>) {
  await input.supabase.from("ingestion_jobs").update(patch).eq("id", input.jobId).eq("user_id", input.userId);
}

export async function ingestDocumentChunks(input: IngestDocumentChunksInput): Promise<number> {
  await updateTask(input, { status: "running", stage: "extracting", started_at: new Date().toISOString(), error_message: null });

  const chunks = prepareChunks(input.chunks);

  await updateTask(input, { status: "running", stage: "chunking", metadata: { ...(input.metadata ?? {}), totalChunks: chunks.length } });

  if (chunks.length === 0) {
    throw new Error(getEmptyTextIngestionMessage(input.sourceType));
  }

  await updateTask(input, { status: "running", stage: "embedding", metadata: { ...(input.metadata ?? {}), totalChunks: chunks.length, embeddedChunks: 0 } });

  const embeddings: number[][] = [];
  let embeddingProvider = "unknown";
  let embeddingModel = "unknown";
  let embeddingDimensions = 0;
  let embeddingVersion = "unknown";
  let embeddedChunks = 0;

  for (const batch of createEmbeddingBatches(chunks)) {
    let embeddingResult;
    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        embeddingResult = await embedTexts(batch.map((chunk) => chunk.text));
        break;
      } catch (error) {
        lastError = error;
        await updateTask(input, {
          status: "running",
          stage: "embedding",
          error_message: `Embedding batch retry ${attempt}/3 failed: ${error instanceof Error ? error.message : "unknown error"}`,
        });
      }
    }
    if (!embeddingResult) throw lastError instanceof Error ? lastError : new Error("Embedding batch failed");
    embeddingProvider = embeddingResult.provider;
    embeddingModel = embeddingResult.model;
    embeddingDimensions = embeddingResult.dimensions;
    embeddingVersion = embeddingResult.version;
    embeddings.push(...embeddingResult.embeddings);
    embeddedChunks += batch.length;
    await updateTask(input, { status: "running", stage: "embedding", metadata: { ...(input.metadata ?? {}), totalChunks: chunks.length, embeddedChunks } });
  }

  await updateTask(input, { status: "running", stage: "storing" });

  const rows = chunks.map((chunk, index) => ({
    user_id: input.userId,
    document_id: input.documentId,
    chunk_index: index,
    text: chunk.text,
    embedding: embeddings[index],
    token_count: chunk.tokenCount,
    source_type: input.sourceType,
    page_number: chunk.pageNumber,
    url: input.url,
    metadata: {
      ...(input.metadata ?? {}),
      ...(chunk.metadata ?? {}),
      contentHash: chunk.contentHash,
      originalChunkIndex: chunk.originalIndex,
      embeddingProvider,
      embeddingModel,
      embeddingDimensions,
      embeddingVersion,
      ingestionJobId: input.jobId,
    },
  }));

  const { error: chunksError } = await input.supabase.from("document_chunks").insert(rows);
  if (chunksError) throw new Error(chunksError.message);

  const completedAt = new Date().toISOString();
  await Promise.all([
    input.supabase
      .from("documents")
      .update({ status: "ready", chunk_count: chunks.length })
      .eq("id", input.documentId)
      .eq("user_id", input.userId),
    input.supabase
      .from("ingestion_jobs")
      .update({ status: "succeeded", stage: "storing", completed_at: completedAt })
      .eq("id", input.jobId)
      .eq("user_id", input.userId),
  ]);

  return chunks.length;
}

export async function ingestDocumentText(input: IngestDocumentInput): Promise<number> {
  return ingestDocumentChunks({
    ...input,
    chunks: chunkInputText(input),
  });
}

function inferPageNumberFromPosition(
  positionInBook: number,
  pageChunks: IngestibleChunk[] | undefined,
  totalCharacters: number,
): number | undefined {
  const pages = pageChunks?.filter((page) => page.text.trim().length > 0);
  if (!pages?.length) return undefined;

  const estimatedTotal = pages.reduce((sum, page, index) => sum + page.text.length + (index > 0 ? 2 : 0), 0);
  const total = Math.max(estimatedTotal, totalCharacters, 1);
  const targetOffset = Math.max(0, Math.min(1, positionInBook)) * total;

  let offset = 0;
  for (const page of pages) {
    const end = offset + page.text.length;
    if (targetOffset <= end) return page.pageNumber;
    offset = end + 2;
  }

  return pages.at(-1)?.pageNumber;
}

function addPageNumbersToBookChunks(
  chunks: BookChunk[],
  pageChunks: IngestibleChunk[] | undefined,
  totalCharacters: number,
): BookChunk[] {
  if (!pageChunks?.length) return chunks;

  return chunks.map((chunk) => ({
    ...chunk,
    pageNumber: chunk.pageNumber ?? inferPageNumberFromPosition(chunk.metadata.positionInBook, pageChunks, totalCharacters),
  }));
}

/**
 * Smart ingestion: auto-detects if the document is a book and uses the appropriate chunker.
 * - Book-like documents → Book RAG (multi-granularity chunks with chapter metadata)
 *   + Persists book_structures, book_chapters to DB
 *   + Populates chunk_type, chapter_number, section_depth, position_in_book columns
 * - Everything else → Standard RAG (flat chunks)
 *
 * Standard RAG is NEVER removed — this is an additive enhancement.
 */
export async function ingestDocumentSmart(input: IngestDocumentInput): Promise<{ count: number; mode: "book" | "standard" }> {
  // Try Book RAG first
  const bookResult = _chunkBookText(input.text);
  if (!bookResult || !bookResult.stats.isBook) {
    // Fallback: Standard RAG (unchanged behavior)
    const count = await ingestDocumentText(input);
    return { count, mode: "standard" };
  }

  console.log(`[Book RAG] Detected book: ${bookResult.stats.totalChunks} chunks (${bookResult.stats.summaryChunks} summary + ${bookResult.stats.detailChunks} detail)`);

  const { supabase, userId, documentId, jobId } = input;
  const structure = bookResult.structure;

  // ── Step 1: Persist book_structures ──
  const { data: bookStructureRow, error: bsError } = await supabase
    .from("book_structures")
    .insert({
      user_id: userId,
      document_id: documentId,
      title: structure.root.title,
      total_chapters: structure.totalChapters,
      total_sections: structure.totalSections,
      total_characters: structure.totalCharacters,
      toc: structure.toc,
      metadata: { isBook: true },
    })
    .select("id")
    .single();

  if (bsError) {
    if (isBookSchemaUnavailable(bsError)) {
      console.warn("[Book RAG] Book schema unavailable; falling back to standard ingestion.");
      const count = await ingestDocumentText(input);
      return { count, mode: "standard" };
    }
    console.warn(`[Book RAG] Failed to persist book_structures (non-fatal): ${bsError.message}`);
  }
  const bookStructureId = bookStructureRow?.id ?? null;

  // ── Step 2: Persist book_chapters + build chapter_id map ──
  const chapterIdMap = new Map<number | null, string>(); // chapterNumber → chapter row id

  if (bookStructureId) {
    const chapterRows = structure.chapters.map((ch) => ({
      user_id: userId,
      document_id: documentId,
      book_structure_id: bookStructureId,
      chapter_number: ch.chapterNumber,
      chapter_title: ch.title,
      summary: ch.text.slice(0, 800), // extractive summary for now; LLM summary in GAP 4
      position_in_book: ch.positionInBook,
      section_count: ch.children.length,
      char_count: ch.fullText.length,
    }));

    const { data: chapterData, error: chError } = await supabase
      .from("book_chapters")
      .insert(chapterRows)
      .select("id, chapter_number");

    if (chError) {
      if (isBookSchemaUnavailable(chError)) {
        console.warn("[Book RAG] Book schema unavailable; falling back to standard ingestion.");
        await cleanupBookMetadataRows(input);
        const count = await ingestDocumentText(input);
        return { count, mode: "standard" };
      }
      console.warn(`[Book RAG] Failed to persist book_chapters (non-fatal): ${chError.message}`);
    } else if (chapterData) {
      for (const row of chapterData) {
        chapterIdMap.set(row.chapter_number, row.id);
      }
    }
  }

  // ── Step 3: Build IngestibleChunks with book-specific columns ──
  const bookChunksWithPages = addPageNumbersToBookChunks(
    bookResult.chunks,
    input.pageChunks,
    structure.totalCharacters,
  );

  const bookChunks: IngestibleChunk[] = bookChunksWithPages.map((bc: BookChunk) => ({
    text: bc.text,
    pageNumber: bc.pageNumber,
    metadata: {
      ...(bc.metadata as unknown as Record<string, unknown>),
      // These will be extracted into dedicated columns in the row builder below
      _bookColumns: {
        chunk_type: bc.metadata.chunkType,
        chapter_number: bc.metadata.chapterNumber,
        section_depth: bc.metadata.depth,
        position_in_book: bc.metadata.positionInBook,
        chapter_id: chapterIdMap.get(bc.metadata.chapterNumber) ?? null,
      },
    },
  }));

  // ── Step 4: Ingest chunks with book-specific columns ──
  let count: number;
  try {
    count = await ingestBookChunks({
      ...input,
      chunks: bookChunks,
      metadata: {
        ...(input.metadata ?? {}),
        bookRag: true,
        bookStructureId,
        bookStats: bookResult.stats,
      },
    });
  } catch (error) {
    if (isBookSchemaUnavailable(error)) {
      console.warn("[Book RAG] Book chunk columns unavailable; falling back to standard ingestion.");
      await cleanupBookMetadataRows(input);
      const fallbackCount = await ingestDocumentText(input);
      return { count: fallbackCount, mode: "standard" };
    }
    throw error;
  }

  // ── Step 5: Extract and persist entities (best-effort, non-blocking) ──
  try {
    const entities = extractBookEntities(bookResult.chunks);
    if (entities.length > 0) {
      // Build a chunkIndex → chunk UUID map by querying the just-inserted chunks
      const { data: insertedChunks } = await supabase
        .from("document_chunks")
        .select("id, chunk_index")
        .eq("document_id", documentId)
        .eq("user_id", userId)
        .order("chunk_index", { ascending: true });

      const chunkIdMap = new Map<number, string>();
      if (insertedChunks) {
        for (const row of insertedChunks) {
          chunkIdMap.set(row.chunk_index, row.id);
        }
      }

      const entityCount = await persistBookEntities({
        supabase,
        userId,
        documentId,
        entities,
        chunkIdMap,
      });
      console.log(`[Book RAG] Extracted ${entityCount} entities from ${bookResult.chunks.length} chunks`);
    }
  } catch (entityError) {
    console.warn(`[Book RAG] Entity extraction failed (non-fatal): ${entityError instanceof Error ? entityError.message : "unknown"}`);
  }

  return { count, mode: "book" };
}

/**
 * Extended ingestion that writes book-specific columns (chunk_type, chapter_number, etc.)
 * alongside the standard document_chunks columns.
 */
async function ingestBookChunks(input: IngestDocumentChunksInput): Promise<number> {
  await updateTask(input, { status: "running", stage: "extracting", started_at: new Date().toISOString(), error_message: null });

  const chunks = prepareChunks(input.chunks);

  await updateTask(input, { status: "running", stage: "chunking", metadata: { ...(input.metadata ?? {}), totalChunks: chunks.length } });

  if (chunks.length === 0) {
    throw new Error(getEmptyTextIngestionMessage(input.sourceType));
  }

  await updateTask(input, { status: "running", stage: "embedding", metadata: { ...(input.metadata ?? {}), totalChunks: chunks.length, embeddedChunks: 0 } });

  const embeddings: number[][] = [];
  let embeddingProvider = "unknown";
  let embeddingModel = "unknown";
  let embeddingDimensions = 0;
  let embeddingVersion = "unknown";
  let embeddedChunks = 0;

  for (const batch of createEmbeddingBatches(chunks)) {
    let embeddingResult;
    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        embeddingResult = await embedTexts(batch.map((chunk) => chunk.text));
        break;
      } catch (error) {
        lastError = error;
        await updateTask(input, {
          status: "running",
          stage: "embedding",
          error_message: `Embedding batch retry ${attempt}/3 failed: ${error instanceof Error ? error.message : "unknown error"}`,
        });
      }
    }
    if (!embeddingResult) throw lastError instanceof Error ? lastError : new Error("Embedding batch failed");
    embeddingProvider = embeddingResult.provider;
    embeddingModel = embeddingResult.model;
    embeddingDimensions = embeddingResult.dimensions;
    embeddingVersion = embeddingResult.version;
    embeddings.push(...embeddingResult.embeddings);
    embeddedChunks += batch.length;
    await updateTask(input, { status: "running", stage: "embedding", metadata: { ...(input.metadata ?? {}), totalChunks: chunks.length, embeddedChunks } });
  }

  await updateTask(input, { status: "running", stage: "storing" });

  // Extract book-specific columns from metadata._bookColumns
  const rows = chunks.map((chunk, index) => {
    const bookCols = (chunk.metadata as Record<string, unknown>)?._bookColumns as {
      chunk_type?: string;
      chapter_number?: number | null;
      section_depth?: number;
      position_in_book?: number;
      chapter_id?: string | null;
    } | undefined;

    // Remove _bookColumns from metadata to keep it clean
    const cleanMeta = { ...(input.metadata ?? {}), ...(chunk.metadata ?? {}) };
    if (cleanMeta._bookColumns) delete cleanMeta._bookColumns;

    return {
      user_id: input.userId,
      document_id: input.documentId,
      chunk_index: index,
      text: chunk.text,
      embedding: embeddings[index],
      token_count: chunk.tokenCount,
      source_type: input.sourceType,
      page_number: chunk.pageNumber,
      url: input.url,
      // Book-specific columns (new)
      chunk_type: bookCols?.chunk_type ?? null,
      chapter_number: bookCols?.chapter_number ?? null,
      section_depth: bookCols?.section_depth ?? null,
      position_in_book: bookCols?.position_in_book ?? null,
      chapter_id: bookCols?.chapter_id ?? null,
      metadata: {
        ...cleanMeta,
        contentHash: chunk.contentHash,
        originalChunkIndex: chunk.originalIndex,
        embeddingProvider,
        embeddingModel,
        embeddingDimensions,
        embeddingVersion,
        ingestionJobId: input.jobId,
      },
    };
  });

  const { error: chunksError } = await input.supabase.from("document_chunks").insert(rows);
  if (chunksError) throw new Error(chunksError.message);

  const completedAt = new Date().toISOString();
  await Promise.all([
    input.supabase
      .from("documents")
      .update({ status: "ready", chunk_count: chunks.length })
      .eq("id", input.documentId)
      .eq("user_id", input.userId),
    input.supabase
      .from("ingestion_jobs")
      .update({ status: "succeeded", stage: "storing", completed_at: completedAt })
      .eq("id", input.jobId)
      .eq("user_id", input.userId),
  ]);

  return chunks.length;
}

export type MarkIngestionFailedInput = {
  supabase: SupabaseClient;
  userId: string;
  documentId: string;
  jobId: string;
  message: string;
};

export async function markIngestionFailed(input: MarkIngestionFailedInput) {
  await Promise.all([
    input.supabase
      .from("documents")
      .update({ status: "failed", error_message: input.message })
      .eq("id", input.documentId)
      .eq("user_id", input.userId),
    input.supabase
      .from("ingestion_jobs")
      .update({ status: "failed", error_message: input.message, completed_at: new Date().toISOString() })
      .eq("id", input.jobId)
      .eq("user_id", input.userId),
  ]);
}
