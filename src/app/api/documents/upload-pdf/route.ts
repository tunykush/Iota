// POST /api/documents/upload-pdf
// Accepts multipart/form-data with a PDF file (FR-010, FR-011, FR-012, FR-013)
// Mock: validates content-type, creates a document + job record, simulates processing.

import { NextRequest, NextResponse } from "next/server";
import { mockDocuments, mockJobs, generateId, simulateDelay } from "@/lib/api/mock-db";
import type { UploadPdfResponse } from "@/lib/api/types";

export async function POST(request: NextRequest) {
  await simulateDelay(600);

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

  const docId = generateId("doc");
  const jobId = generateId("job");
  const now = new Date().toISOString();
  const displayTitle = title ?? file.name;

  // Push into mock store so GET /documents reflects the new upload
  mockDocuments.unshift({
    id: docId,
    sourceType: "pdf",
    title: displayTitle,
    originalFilename: file.name,
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

  // Simulate async processing: after 4 s mark as ready
  setTimeout(() => {
    const doc = mockDocuments.find((d) => d.id === docId);
    const job = mockJobs.find((j) => j.id === jobId);
    if (doc) {
      doc.status = "ready";
      doc.chunkCount = Math.floor(Math.random() * 200) + 40;
      doc.updatedAt = new Date().toISOString();
    }
    if (job) {
      job.status = "succeeded";
      job.stage = "storing";
      job.completedAt = new Date().toISOString();
    }
  }, 4000);

  const body: UploadPdfResponse = {
    document: {
      id: docId,
      sourceType: "pdf",
      title: displayTitle,
      status: "processing",
      createdAt: now,
    },
    job: { id: jobId, status: "queued" },
  };

  return NextResponse.json(body, { status: 202 });
}
