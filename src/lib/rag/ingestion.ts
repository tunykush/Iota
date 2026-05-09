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

export function getEmptyTextIngestionMessage(sourceType: DocumentSourceType): string {
  if (sourceType === "website") {
    return "No extractable text found for this web page. The URL may be missing, blocked, rendered mostly with JavaScript, or contain non-text content.";
  }

  return "No extractable text found for this document. Scanned/image-only PDFs are not supported yet because OCR is not enabled.";
}

function hashContent(value: string): string {
  return createHash("sha256").update(value).digest("hex");
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
    chunks: chunkText(input.text).map((text) => ({ text })),
  });
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