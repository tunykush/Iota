// GET  /api/documents  — list user's documents (FR-040, FR-042)
// POST /api/documents/upload-pdf is in ./upload-pdf/route.ts
// POST /api/documents/crawl-url  is in ./crawl-url/route.ts

import { NextRequest, NextResponse } from "next/server";
import type { DocumentListResponse, DocumentSourceType, DocumentStatus } from "@/lib/api/types";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "You must be signed in to view documents" } },
      { status: 401 },
    );
  }

  const { searchParams } = request.nextUrl;
  const sourceType = searchParams.get("sourceType") as DocumentSourceType | null;
  const status = searchParams.get("status") as DocumentStatus | null;

  let query = supabase
    .from("documents")
    .select("id, source_type, title, original_filename, url, status, chunk_count, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (sourceType) {
    query = query.eq("source_type", sourceType);
  }
  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: { code: "DATABASE_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  const documents = (data ?? []).map((doc) => ({
    id: doc.id,
    sourceType: doc.source_type as DocumentSourceType,
    title: doc.title,
    originalFilename: doc.original_filename ?? undefined,
    url: doc.url ?? undefined,
    status: doc.status as DocumentStatus,
    chunkCount: doc.chunk_count ?? 0,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
  }));

  const body: DocumentListResponse = {
    documents,
    total: documents.length,
  };

  return NextResponse.json(body);
}
