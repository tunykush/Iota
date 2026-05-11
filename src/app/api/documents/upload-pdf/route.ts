// POST /api/documents/upload-pdf
// Accepts multipart/form-data with a PDF file (FR-010, FR-011, FR-012, FR-013)

import { NextRequest, NextResponse } from "next/server";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { PDFParse } from "pdf-parse";
import type { UploadPdfResponse } from "@/lib/api/types";
// chunkTextWithPageNumber no longer needed — ingestDocumentSmart handles chunking internally
import { ragServices } from "@/lib/rag/services";
import { createClient } from "@/lib/supabase/server";

type PdfPage = {
  num: number;
  text: string;
};

const SCANNED_PDF_MESSAGE = "No extractable text found in this PDF. It may be scanned/image-only; OCR is not supported yet.";
const require = createRequire(import.meta.url);

function configurePdfWorker() {
  const workerPath = join(dirname(require.resolve("pdf-parse")), "pdf.worker.mjs");
  PDFParse.setWorker(pathToFileURL(workerPath).href);
}

function cleanPdfText(text: string): string {
  return text.replace(/\r/g, "\n").replace(/[\t ]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function extractPdfPages(bytes: Uint8Array): Promise<PdfPage[]> {
  configurePdfWorker();
  const parser = new PDFParse({ data: bytes });
  try {
    const result = await parser.getText({ lineEnforce: true });
    const pages = (result.pages ?? []) as PdfPage[];
    const cleanedPages = pages
      .map((page) => ({ num: page.num, text: cleanPdfText(page.text ?? "") }))
      .filter((page) => page.text.length > 0);

    if (cleanedPages.length === 0) {
      throw new Error(SCANNED_PDF_MESSAGE);
    }

    return cleanedPages;
  } finally {
    await parser.destroy();
  }
}

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

  let chunkCount = 0;
  let ingestionMode: "book" | "standard" = "standard";
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pages = await extractPdfPages(bytes);
    const fullText = pages.map((p) => p.text).join("\n\n");
    const baseMeta = { filename: file.name, size: file.size, extractionMode: "pdf-parse", pageCount: pages.length };
    const pageChunks = pages.map((page) => ({ text: page.text, pageNumber: page.num }));

    // Use smart ingestion: auto-detects books vs standard documents
    const smartResult = await ragServices.ingestion.ingestDocumentSmart({
      supabase,
      userId: user.id,
      documentId: document.id,
      jobId: job.id,
      sourceType: "pdf",
      text: fullText,
      pageChunks,
      metadata: baseMeta,
    });
    chunkCount = smartResult.count;
    ingestionMode = smartResult.mode;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to ingest PDF";
    await ragServices.ingestion.markFailed({
      supabase,
      userId: user.id,
      documentId: document.id,
      jobId: job.id,
      message,
    });

    return NextResponse.json(
      { error: { code: "INGESTION_ERROR", message } },
      { status: 422 },
    );
  }

  const body: UploadPdfResponse = {
    document: {
      id: document.id,
      sourceType: "pdf",
      title: document.title,
      status: "ready",
      createdAt: document.created_at,
    },
    job: { id: job.id, status: "succeeded" },
  };

  return NextResponse.json({ ...body, chunkCount, ingestionMode }, { status: 201 });
}
