// GET /api/chat/history/[conversationId]  — messages for one conversation (FR-056)

import { NextRequest, NextResponse } from "next/server";
import { mockConversations, mockMessages, simulateDelay } from "@/lib/api/mock-db";
import type { ConversationDetailResponse } from "@/lib/api/types";

type Params = { params: Promise<{ conversationId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  await simulateDelay(200);
  const { conversationId } = await params;

  const conv = mockConversations.find((c) => c.id === conversationId);
  if (!conv) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: `Conversation '${conversationId}' not found` } },
      { status: 404 },
    );
  }

  const messages = mockMessages[conversationId] ?? [];

  const body: ConversationDetailResponse = {
    conversation: conv,
    messages,
  };

  return NextResponse.json(body);
}
