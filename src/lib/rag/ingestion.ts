import type { SupabaseClient } from "@supabase/supabase-js";
import type { DocumentSourceType } from "@/lib/api/types";

const MAX_CHARS_PER_CHUNK = 1600;
const CHUNK_OVERLAP_CHARS = 180;

type IngestDocumentInput = {
  supabase: SupabaseClient;
  userId: string;
  documentId: string;
  jobId: string;
  sourceType: DocumentSourceType;
  text: string;
  url?: string;
  metadata?: Record<string, unknown>;
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

export function chunkText(text: string): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < cleaned.length) {
    const hardEnd = Math.min(start + MAX_CHARS_PER_CHUNK, cleaned.length);
    const sentenceEnd = cleaned.lastIndexOf(". ", hardEnd);
    const end = sentenceEnd > start + MAX_CHARS_PER_CHUNK * 0.6 ? sentenceEnd + 1 : hardEnd;
    const chunk = cleaned.slice(start, end).trim();

    if (chunk) chunks.push(chunk);
    if (end >= cleaned.length) break;
    start = Math.max(0, end - CHUNK_OVERLAP_CHARS);
  }

  return chunks;
}

export async function ingestDocumentText(input: IngestDocumentInput): Promise<number> {
  const chunks = chunkText(input.text);

  await input.supabase
    .from("ingestion_jobs")
    .update({ status: "running", stage: "chunking", started_at: new Date().toISOString() })
    .eq("id", input.jobId)
    .eq("user_id", input.userId);

  if (chunks.length === 0) {
    throw new Error("No extractable text found for this document.");
  }

  const rows = chunks.map((text, index) => ({
    user_id: input.userId,
    document_id: input.documentId,
    chunk_index: index,
    text,
    token_count: Math.ceil(text.length / 4),
    source_type: input.sourceType,
    url: input.url,
    metadata: input.metadata ?? {},
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

export async function markIngestionFailed(input: {
  supabase: SupabaseClient;
  userId: string;
  documentId: string;
  jobId: string;
  message: string;
}) {
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