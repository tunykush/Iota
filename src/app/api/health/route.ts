// GET /api/health
// Public endpoint — no auth required.
// When FastAPI backend is live, this route can proxy to http://localhost:8000/api/health

import { NextResponse } from "next/server";
import type { HealthResponse } from "@/lib/api/types";

export async function GET() {
  const body: HealthResponse = {
    status: "ok",
    version: "1.0.0",
  };
  return NextResponse.json(body);
}
