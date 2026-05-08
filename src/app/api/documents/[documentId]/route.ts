// GET    /api/documents/[documentId]  — document detail (FR-014)
// DELETE /api/documents/[documentId]  — delete document + all chunks (FR-041)

import { NextRequest, NextResponse } from "next/server";
import type { DocumentSourceType, DocumentStatus, JobStage, JobStatus } from "@/lib/api/types";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ documentId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
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

  const { documentId } = await params;

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("id, source_type, title, original_filename, url, status, chunk_count, created_at, updated_at")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .single();

  if (docError || !doc) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: `Document '${documentId}' not found` } },
      { status: 404 },
    );
  }

  const { data: job } = await supabase
    .from("ingestion_jobs")
    .select("id, document_id, status, stage, error_message, created_at, completed_at")
    .eq("document_id", documentId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    document: {
      id: doc.id,
      sourceType: doc.source_type as DocumentSourceType,
      title: doc.title,
      originalFilename: doc.original_filename ?? undefined,
      url: doc.url ?? undefined,
      status: doc.status as DocumentStatus,
      chunkCount: doc.chunk_count ?? 0,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
    },
    job: job
      ? {
          id: job.id,
          documentId: job.document_id,
          status: job.status as JobStatus,
          stage: job.stage as JobStage | undefined,
          errorMessage: job.error_message ?? undefined,
          createdAt: job.created_at,
          completedAt: job.completed_at ?? undefined,
        }
      : null,
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "You must be signed in to delete documents" } },
      { status: 401 },
    );
  }

  const { documentId } = await params;

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("id")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .single();

  if (docError || !doc) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: `Document '${documentId}' not found` } },
      { status: 404 },
    );
  }

  const { data: chunks, error: chunksLookupError } = await supabase
    .from("document_chunks")
    .select("id")
    .eq("document_id", documentId)
    .eq("user_id", user.id);

  if (chunksLookupError) {
    return NextResponse.json(
      { error: { code: "DATABASE_ERROR", message: chunksLookupError.message } },
      { status: 500 },
    );
  }

  const chunkIds = (chunks ?? []).map((chunk) => chunk.id);
  if (chunkIds.length > 0) {
    const { error: chunkSourceError } = await supabase
      .from("message_sources")
      .delete()
      .eq("user_id", user.id)
      .in("chunk_id", chunkIds);

    if (chunkSourceError) {
      return NextResponse.json(
        { error: { code: "DATABASE_ERROR", message: chunkSourceError.message } },
        { status: 500 },
      );
    }
  }

  const cleanupSteps = [
    supabase.from("message_sources").delete().eq("document_id", documentId).eq("user_id", user.id),
    supabase.from("document_chunks").delete().eq("document_id", documentId).eq("user_id", user.id),
    supabase.from("ingestion_jobs").delete().eq("document_id", documentId).eq("user_id", user.id),
  ];

  for (const step of cleanupSteps) {
    const { error } = await step;
    if (error) {
      return NextResponse.json(
        { error: { code: "DATABASE_ERROR", message: error.message } },
        { status: 500 },
      );
    }
  }

  const { error: deleteDocumentError } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId)
    .eq("user_id", user.id);

  if (deleteDocumentError) {
    return NextResponse.json(
      { error: { code: "DATABASE_ERROR", message: deleteDocumentError.message } },
      { status: 500 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
