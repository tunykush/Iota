// GET /api/chat/history/[conversationId]  — messages for one conversation (FR-056)

import { NextRequest, NextResponse } from "next/server";
import type { ConversationDetailResponse } from "@/lib/api/types";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ conversationId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "You must be signed in to view chat history" } },
      { status: 401 },
    );
  }

  const { conversationId } = await params;

  const { data: conv, error: convError } = await supabase
    .from("conversations")
    .select("id, title, created_at, updated_at")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (convError || !conv) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: `Conversation '${conversationId}' not found` } },
      { status: 404 },
    );
  }

  const { data: messages, error: messagesError } = await supabase
    .from("conversation_messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (messagesError) {
    return NextResponse.json(
      { error: { code: "DATABASE_ERROR", message: messagesError.message } },
      { status: 500 },
    );
  }

  const body: ConversationDetailResponse = {
    conversation: {
      id: conv.id,
      title: conv.title ?? undefined,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at,
      messageCount: messages?.length ?? 0,
    },
    messages: (messages ?? []).map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.created_at,
    })),
  };

  return NextResponse.json(body);
}
