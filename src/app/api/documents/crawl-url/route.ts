// POST /api/documents/crawl-url
// Submit a URL for website ingestion (FR-020, FR-021, FR-022, FR-023)

import { NextRequest, NextResponse } from "next/server";
import type { CrawlUrlRequest, CrawlUrlResponse } from "@/lib/api/types";
import { runWebsiteIngestionWorker } from "@/lib/rag/background-worker";
import { isBlockedPrivateUrl, isValidHttpUrl } from "@/lib/rag/website-ingestion";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "You must be signed in to crawl websites" } },
      { status: 401 },
    );
  }

  let body: CrawlUrlRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Request body must be valid JSON" } },
      { status: 400 },
    );
  }

  const { url, title, crawlDepth = 0 } = body;

  if (!url) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Field 'url' is required", details: [{ field: "url", message: "URL is missing" }] } },
      { status: 400 },
    );
  }

  if (!isValidHttpUrl(url)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "URL must use http or https", details: [{ field: "url", message: `Invalid URL: ${url}` }] } },
      { status: 400 },
    );
  }

  const hostname = new URL(url).hostname;
  if (isBlockedPrivateUrl(url)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "URL points to a private or reserved address", details: [{ field: "url", message: "SSRF protection: private addresses are not allowed" }] } },
      { status: 400 },
    );
  }

  const displayTitle = title ?? hostname;

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      source_type: "website",
      title: displayTitle,
      url,
      status: "processing",
      chunk_count: 0,
      metadata: { crawlDepth },
    })
    .select("id, title, url, status")
    .single();

  if (documentError || !document) {
    return NextResponse.json(
      { error: { code: "DATABASE_ERROR", message: documentError?.message ?? "Failed to create website document" } },
      { status: 500 },
    );
  }

  const { data: job, error: jobError } = await supabase
    .from("ingestion_jobs")
    .insert({
      user_id: user.id,
      document_id: document.id,
      job_type: "website",
      status: "queued",
      stage: "extracting",
      metadata: { url, crawlDepth },
    })
    .select("id, status")
    .single();

  if (jobError || !job) {
    return NextResponse.json(
      { error: { code: "DATABASE_ERROR", message: jobError?.message ?? "Failed to create ingestion job" } },
      { status: 500 },
    );
  }

  const responseBody: CrawlUrlResponse = {
    document: {
      id: document.id,
      sourceType: "website",
      title: document.title,
      url: document.url ?? url,
      status: "processing",
    },
    job: { id: job.id, status: "queued" },
  };

  if (process.env.NODE_ENV !== "production") {
    await runWebsiteIngestionWorker(createAdminClient(), 1, job.id, false);
    const [{ data: updatedJob }, { data: updatedDocument }] = await Promise.all([
      supabase
        .from("ingestion_jobs")
        .select("status")
        .eq("id", job.id)
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("documents")
        .select("status")
        .eq("id", document.id)
        .eq("user_id", user.id)
        .single(),
    ]);

    if (updatedDocument?.status) {
      responseBody.document.status = updatedDocument.status;
    }

    if (updatedJob?.status) {
      responseBody.job.status = updatedJob.status;
    }
  }

  return NextResponse.json(responseBody, { status: 202 });
}
