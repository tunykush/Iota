import type { SupabaseClient } from "@supabase/supabase-js";
import { ingestWebsiteDocument } from "@/lib/rag/website-ingestion";

const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 60_000;

type JobMetadata = {
  url?: string;
  crawlDepth?: number;
  attempts?: number;
  nextRunAt?: string;
};

type WebsiteJobRow = {
  id: string;
  user_id: string;
  document_id: string;
  metadata: JobMetadata | null;
  documents: { url: string | null } | null;
};

function getBackoffMs(attempts: number) {
  return BASE_BACKOFF_MS * Math.max(1, 2 ** Math.max(0, attempts - 1));
}

function isDue(metadata: JobMetadata | null) {
  if (!metadata?.nextRunAt) return true;
  return new Date(metadata.nextRunAt).getTime() <= Date.now();
}

async function requeueFailedJob(supabase: SupabaseClient, job: WebsiteJobRow, error: unknown) {
  const metadata = job.metadata ?? {};
  const attempts = (metadata.attempts ?? 0) + 1;
  const message = error instanceof Error ? error.message : "Background ingestion failed";

  if (attempts >= MAX_ATTEMPTS) {
    return;
  }

  const nextRunAt = new Date(Date.now() + getBackoffMs(attempts)).toISOString();
  await supabase
    .from("ingestion_jobs")
    .update({
      status: "queued",
      stage: "extracting",
      error_message: message,
      completed_at: null,
      metadata: { ...metadata, attempts, nextRunAt, lastError: message },
    })
    .eq("id", job.id)
    .eq("user_id", job.user_id);

  await supabase
    .from("documents")
    .update({ status: "processing", error_message: `Retry scheduled: ${message}` })
    .eq("id", job.document_id)
    .eq("user_id", job.user_id);
}

export async function runWebsiteIngestionWorker(supabase: SupabaseClient, limit = 3, jobId?: string, retryFailures = true) {
  let query = supabase
    .from("ingestion_jobs")
    .select("id, user_id, document_id, metadata, documents(url)")
    .eq("job_type", "website")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (jobId) {
    query = query.eq("id", jobId);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  const jobs = ((data ?? []) as unknown as WebsiteJobRow[]).filter((job) => isDue(job.metadata));
  const results = [];

  for (const job of jobs) {
    const url = job.metadata?.url ?? job.documents?.url;
    if (!url) {
      results.push({ jobId: job.id, status: "skipped", error: "Missing URL" });
      continue;
    }

    try {
      await supabase
        .from("ingestion_jobs")
        .update({ status: "running", stage: "extracting", started_at: new Date().toISOString() })
        .eq("id", job.id)
        .eq("user_id", job.user_id);

      const chunkCount = await ingestWebsiteDocument({
        supabase,
        userId: job.user_id,
        documentId: job.document_id,
        jobId: job.id,
        url,
        crawlDepth: job.metadata?.crawlDepth,
      });
      results.push({ jobId: job.id, status: "succeeded", chunkCount });
    } catch (err) {
      if (retryFailures) {
        await requeueFailedJob(supabase, job, err);
      }
      results.push({ jobId: job.id, status: "failed", error: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return { processed: results.length, results };
}