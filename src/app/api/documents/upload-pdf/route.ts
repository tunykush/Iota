// POST /api/documents/upload-pdf
// Accepts multipart/form-data with a PDF file (FR-010, FR-011, FR-012, FR-013)

import { NextRequest, NextResponse } from "next/server";
import type { UploadPdfResponse } from "@/lib/api/types";
import { ingestDocumentText, markIngestionFailed } from "@/lib/rag/ingestion";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "You must be signed in to upload documents" } },
      { status: 401 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Request must be multipart/form-data" } },
      { status: 400 },
    );
  }

  const file = formData.get("file") as File | null;
  const title = (formData.get("title") as string | null) ?? null;

  if (!file) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Field 'file' is required", details: [{ field: "file", message: "No file provided" }] } },
      { status: 400 },
    );
  }

  // Validate content type
  const allowedTypes = ["application/pdf"];
  if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Only PDF files are accepted", details: [{ field: "file", message: `Received type: ${file.type}` }] } },
      { status: 400 },
    );
  }

  // Validate file size (10 MB limit for mock)
  const MAX_SIZE_BYTES = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "File exceeds 10 MB limit", details: [{ field: "file", message: `Size: ${file.size} bytes` }] } },
      { status: 400 },
    );
  }

  const displayTitle = title ?? file.name;

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      source_type: "pdf",
      title: displayTitle,
      original_filename: file.name,
      status: "processing",
      chunk_count: 0,
      metadata: { size: file.size, type: file.type },
    })
    .select("id, source_type, title, status, created_at")
    .single();

  if (documentError || !document) {
    return NextResponse.json(
      { error: { code: "DATABASE_ERROR", message: documentError?.message ?? "Failed to create document" } },
      { status: 500 },
    );
  }

  const { data: job, error: jobError } = await supabase
    .from("ingestion_jobs")
    .insert({
      user_id: user.id,
      document_id: document.id,
      job_type: "pdf",
      status: "queued",
      stage: "extracting",
      metadata: { filename: file.name, size: file.size },
    })
    .select("id, status")
    .single();

  if (jobError || !job) {
    return NextResponse.json(
      { error: { code: "DATABASE_ERROR", message: jobError?.message ?? "Failed to create ingestion job" } },
      { status: 500 },
    );
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const latinText = new TextDecoder("latin1").decode(bytes);
    const extractedText = latinText
      .replace(/\r/g, "\n")
      .replace(/[^\x09\x0a\x0d\x20-\x7e\u00c0-\u1ef9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    await ingestDocumentText({
      supabase,
      userId: user.id,
      documentId: document.id,
      jobId: job.id,
      sourceType: "pdf",
      text: extractedText,
      metadata: { filename: file.name, size: file.size, extractionMode: "basic-latin1" },
    });
  } catch (error) {
    await markIngestionFailed({
      supabase,
      userId: user.id,
      documentId: document.id,
      jobId: job.id,
      message: error instanceof Error ? error.message : "Failed to ingest PDF",
    });
  }

  const body: UploadPdfResponse = {
    document: {
      id: document.id,
      sourceType: "pdf",
      title: document.title,
      status: document.status,
      createdAt: document.created_at,
    },
    job: { id: job.id, status: "queued" },
  };

  return NextResponse.json(body, { status: 202 });
}
