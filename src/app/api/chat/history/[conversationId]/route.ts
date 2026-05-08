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
    .select("id, role, content, model, metadata, created_at")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (messagesError) {
    return NextResponse.json(
      { error: { code: "DATABASE_ERROR", message: messagesError.message } },
      { status: 500 },
    );
  }

  const assistantMessageIds = (messages ?? [])
    .filter((message) => message.role === "assistant")
    .map((message) => message.id);

  const { data: sources, error: sourcesError } = assistantMessageIds.length
    ? await supabase
        .from("message_sources")
        .select("message_id, document_id, chunk_id, score, snippet, metadata")
        .eq("user_id", user.id)
        .in("message_id", assistantMessageIds)
    : { data: [], error: null };

  if (sourcesError) {
    return NextResponse.json(
      { error: { code: "DATABASE_ERROR", message: sourcesError.message } },
      { status: 500 },
    );
  }

  const sourcesByMessageId = new Map<string, NonNullable<ConversationDetailResponse["messages"][number]["sources"]>>();
  for (const source of sources ?? []) {
    const metadata = source.metadata && typeof source.metadata === "object" ? source.metadata as Record<string, unknown> : {};
    const title = typeof metadata.title === "string" ? metadata.title : "Untitled source";
    const sourceType = metadata.sourceType === "website" || metadata.sourceType === "database" || metadata.sourceType === "pdf" ? metadata.sourceType : "pdf";
    const pageNumber = typeof metadata.pageNumber === "number" ? metadata.pageNumber : undefined;
    const url = typeof metadata.url === "string" ? metadata.url : undefined;
    const messageSources = sourcesByMessageId.get(source.message_id) ?? [];
    messageSources.push({
      documentId: source.document_id ?? "",
      chunkId: source.chunk_id ?? "",
      title,
      sourceType,
      pageNumber,
      url,
      score: source.score ?? 0,
      snippet: source.snippet ?? "",
    });
    sourcesByMessageId.set(source.message_id, messageSources);
  }

  const body: ConversationDetailResponse = {
    conversation: {
      id: conv.id,
      title: conv.title ?? undefined,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at,
      messageCount: messages?.length ?? 0,
    },
    messages: (messages ?? []).map((message) => {
      const metadata = message.metadata && typeof message.metadata === "object" ? message.metadata as Record<string, unknown> : {};
      const provider = typeof metadata.provider === "string" ? metadata.provider : undefined;

      return {
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.created_at,
        sources: sourcesByMessageId.get(message.id),
        provider,
        model: message.model ?? undefined,
      };
    }),
  };

  return NextResponse.json(body);
}
