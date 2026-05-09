// POST /api/cron/ingestion — process queued website ingestion jobs.

import { NextRequest, NextResponse } from "next/server";
import { runWebsiteIngestionWorker } from "@/lib/rag/background-worker";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Invalid cron secret" } }, { status: 401 });
  }

  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 3);
  const result = await runWebsiteIngestionWorker(createAdminClient(), Math.min(Math.max(limit, 1), 10));
  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  return POST(request);
}