// GET /api/ingestion-jobs/[jobId]  — ingestion job status (FR-014)

import { NextRequest, NextResponse } from "next/server";
import { mockJobs, simulateDelay } from "@/lib/api/mock-db";

type Params = { params: Promise<{ jobId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  await simulateDelay(150);
  const { jobId } = await params;

  const job = mockJobs.find((j) => j.id === jobId);
  if (!job) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: `Job '${jobId}' not found` } },
      { status: 404 },
    );
  }

  return NextResponse.json(job);
}
