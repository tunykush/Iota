// GET    /api/documents/[documentId]  — document detail (FR-014)
// DELETE /api/documents/[documentId]  — delete document + all chunks (FR-041)

import { NextRequest, NextResponse } from "next/server";
import { mockDocuments, mockJobs, simulateDelay } from "@/lib/api/mock-db";

type Params = { params: Promise<{ documentId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  await simulateDelay(200);
  const { documentId } = await params;

  const doc = mockDocuments.find((d) => d.id === documentId);
  if (!doc) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: `Document '${documentId}' not found` } },
      { status: 404 },
    );
  }

  const job = mockJobs.find((j) => j.documentId === documentId);

  return NextResponse.json({ document: doc, job: job ?? null });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  await simulateDelay(300);
  const { documentId } = await params;

  const idx = mockDocuments.findIndex((d) => d.id === documentId);
  if (idx === -1) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: `Document '${documentId}' not found` } },
      { status: 404 },
    );
  }

  // Remove document (chunks/jobs cascade in real DB via FK ON DELETE CASCADE)
  mockDocuments.splice(idx, 1);

  // Also remove associated jobs from mock store
  const jobIdx = mockJobs.findIndex((j) => j.documentId === documentId);
  if (jobIdx !== -1) mockJobs.splice(jobIdx, 1);

  return new NextResponse(null, { status: 204 });
}
