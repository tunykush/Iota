// GET /api/chat/history  — list conversations for current user (FR-056)

import { NextResponse } from "next/server";
import type { ConversationListResponse } from "@/lib/api/types";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
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

  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, created_at, updated_at, conversation_messages(count)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: { code: "DATABASE_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  const body: ConversationListResponse = {
    conversations: (data ?? []).map((conversation) => ({
      id: conversation.id,
      title: conversation.title ?? undefined,
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at,
      messageCount: conversation.conversation_messages?.[0]?.count ?? 0,
    })),
  };
  return NextResponse.json(body);
}
