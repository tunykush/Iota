// GET /api/chat/history  — list conversations for current user (FR-056)

import { NextResponse } from "next/server";
import { mockConversations, simulateDelay } from "@/lib/api/mock-db";
import type { ConversationListResponse } from "@/lib/api/types";

export async function GET() {
  await simulateDelay(250);

  const sorted = [...mockConversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  const body: ConversationListResponse = { conversations: sorted };
  return NextResponse.json(body);
}
