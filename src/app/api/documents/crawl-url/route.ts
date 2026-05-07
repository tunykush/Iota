// POST /api/documents/crawl-url
// Submit a URL for website ingestion (FR-020, FR-021, FR-022, FR-023)
// Mock: validates URL, creates document + job, simulates crawl processing.

import { NextRequest, NextResponse } from "next/server";
import { mockDocuments, mockJobs, generateId, simulateDelay } from "@/lib/api/mock-db";
import type { CrawlUrlRequest, CrawlUrlResponse } from "@/lib/api/types";

function isValidHttpUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  await simulateDelay(400);

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

  // Block private/internal addresses (basic SSRF protection)
  const hostname = new URL(url).hostname;
  const blockedPatterns = ["localhost", "127.", "0.0.0.0", "169.254.", "10.", "192.168.", "::1"];
  if (blockedPatterns.some((p) => hostname.startsWith(p) || hostname === p.replace(".", ""))) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "URL points to a private or reserved address", details: [{ field: "url", message: "SSRF protection: private addresses are not allowed" }] } },
      { status: 400 },
    );
  }

  const docId = generateId("doc");
  const jobId = generateId("job");
  const now = new Date().toISOString();
  const displayTitle = title ?? hostname;

  mockDocuments.unshift({
    id: docId,
    sourceType: "website",
    title: displayTitle,
    url,
    status: "processing",
    chunkCount: 0,
    createdAt: now,
    updatedAt: now,
  });

  mockJobs.push({
    id: jobId,
    documentId: docId,
    status: "queued",
    stage: "extracting",
    createdAt: now,
  });

  // Simulate async crawl: after 6 s mark as ready
  setTimeout(() => {
    const doc = mockDocuments.find((d) => d.id === docId);
    const job = mockJobs.find((j) => j.id === jobId);
    if (doc) {
      doc.status = "ready";
      doc.chunkCount = Math.floor(Math.random() * 80) + 10;
      doc.updatedAt = new Date().toISOString();
    }
    if (job) {
      job.status = "succeeded";
      job.stage = "storing";
      job.completedAt = new Date().toISOString();
    }
  }, 6000);

  const responseBody: CrawlUrlResponse = {
    document: {
      id: docId,
      sourceType: "website",
      title: displayTitle,
      url,
      status: "processing",
    },
    job: { id: jobId, status: "queued" },
  };

  return NextResponse.json(responseBody, { status: 202 });
}
