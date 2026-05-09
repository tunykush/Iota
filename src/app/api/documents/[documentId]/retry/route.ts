// POST /api/documents/[documentId]/retry — retry failed website ingestion.

import { NextRequest, NextResponse } from "next/server";
import type { CrawlUrlResponse, DocumentSourceType } from "@/lib/api/types";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Params = { params: Promise<{ documentId: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "You must be signed in to retry ingestion" } },
      { status: 401 },
    );
  }

  const { documentId } = await params;
  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id, source_type, title, url, status, metadata")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .single();

  if (documentError || !document) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: `Document '${documentId}' not found` } },
      { status: 404 },
    );
  }

  if (document.source_type !== "website" || !document.url) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Only website documents can be retried" } },
      { status: 400 },
    );
  }

  const crawlDepth = typeof document.metadata?.crawlDepth === "number" ? document.metadata.crawlDepth : 0;
  const { data: job, error: jobError } = await supabase
    .from("ingestion_jobs")
    .insert({
      user_id: user.id,
      document_id: document.id,
      job_type: "website",
      status: "queued",
      stage: "extracting",
      metadata: { url: document.url, crawlDepth, retryOfStatus: document.status },
    })
    .select("id, status")
    .single();

  if (jobError || !job) {
    return NextResponse.json(
      { error: { code: "DATABASE_ERROR", message: jobError?.message ?? "Failed to create retry job" } },
      { status: 500 },
    );
  }

  await supabase
    .from("documents")
    .update({ status: "processing", error_message: null })
    .eq("id", document.id)
    .eq("user_id", user.id);

  const responseBody: CrawlUrlResponse = {
    document: {
      id: document.id,
      sourceType: document.source_type as DocumentSourceType,
      title: document.title,
      url: document.url,
      status: "processing",
    },
    job: { id: job.id, status: "queued" },
  };

  return NextResponse.json(responseBody, { status: 202 });
}