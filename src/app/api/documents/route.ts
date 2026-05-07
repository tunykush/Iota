// GET  /api/documents  — list user's documents (FR-040, FR-042)
// POST /api/documents/upload-pdf is in ./upload-pdf/route.ts
// POST /api/documents/crawl-url  is in ./crawl-url/route.ts

import { NextRequest, NextResponse } from "next/server";
import { mockDocuments, simulateDelay } from "@/lib/api/mock-db";
import type { DocumentListResponse, DocumentSourceType, DocumentStatus } from "@/lib/api/types";

export async function GET(request: NextRequest) {
  await simulateDelay(300);

  const { searchParams } = request.nextUrl;
  const sourceType = searchParams.get("sourceType") as DocumentSourceType | null;
  const status = searchParams.get("status") as DocumentStatus | null;

  let docs = [...mockDocuments];

  if (sourceType) {
    docs = docs.filter((d) => d.sourceType === sourceType);
  }
  if (status) {
    docs = docs.filter((d) => d.status === status);
  }

  // Sort newest first
  docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const body: DocumentListResponse = {
    documents: docs,
    total: docs.length,
  };

  return NextResponse.json(body);
}
