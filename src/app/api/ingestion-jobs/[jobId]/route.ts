// GET /api/ingestion-jobs/[jobId]  — ingestion job status (FR-014)

import { NextRequest, NextResponse } from "next/server";
import type { JobStage, JobStatus } from "@/lib/api/types";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ jobId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "You must be signed in to view ingestion jobs" } },
      { status: 401 },
    );
  }

  const { jobId } = await params;

  const { data: job, error } = await supabase
    .from("ingestion_jobs")
    .select("id, document_id, status, stage, error_message, created_at, completed_at")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (error || !job) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: `Job '${jobId}' not found` } },
      { status: 404 },
    );
  }

  return NextResponse.json({
    id: job.id,
    documentId: job.document_id,
    status: job.status as JobStatus,
    stage: job.stage as JobStage | undefined,
    errorMessage: job.error_message ?? undefined,
    createdAt: job.created_at,
    completedAt: job.completed_at ?? undefined,
  });
}
