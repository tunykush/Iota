// GET /api/chat/history/[conversationId]  — messages for one conversation (FR-056)

import { NextRequest, NextResponse } from "next/server";
import type { ChatRetrievalDiagnostics, ConversationDetailResponse } from "@/lib/api/types";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ conversationId: string }> };

function readDiagnostics(metadata: Record<string, unknown>): ChatRetrievalDiagnostics | undefined {
  const value = metadata.diagnostics;
  if (!value || typeof value !== "object") return undefined;
  const diagnostics = value as Partial<ChatRetrievalDiagnostics>;

  if (
    (diagnostics.mode === "auto" || diagnostics.mode === "llm" || diagnostics.mode === "local") &&
    typeof diagnostics.requestedTopK === "number" &&
    typeof diagnostics.returnedChunks === "number" &&
    Array.isArray(diagnostics.scopedDocumentIds) &&
    Array.isArray(diagnostics.sourceTitles)
  ) {
    return {
      mode: diagnostics.mode,
      requestedTopK: diagnostics.requestedTopK,
      returnedChunks: diagnostics.returnedChunks,
      scopedDocumentIds: diagnostics.scopedDocumentIds.filter((id): id is string => typeof id === "string"),
      sourceTitles: diagnostics.sourceTitles.filter((title): title is string => typeof title === "string"),
      topScore: typeof diagnostics.topScore === "number" ? diagnostics.topScore : undefined,
    };
  }

  return undefined;
}

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
      const diagnostics = readDiagnostics(metadata);

      return {
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.created_at,
        sources: sourcesByMessageId.get(message.id),
        provider,
        model: message.model ?? undefined,
        diagnostics,
      };
    }),
  };

  return NextResponse.json(body);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "You must be signed in to delete chat history" } },
      { status: 401 },
    );
  }

  const { conversationId } = await params;

  const { data: conv, error: convError } = await supabase
    .from("conversations")
    .select("id")
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
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);

  if (messagesError) {
    return NextResponse.json(
      { error: { code: "DATABASE_ERROR", message: messagesError.message } },
      { status: 500 },
    );
  }

  const messageIds = (messages ?? []).map((message) => message.id);
  if (messageIds.length > 0) {
    const { error: sourcesError } = await supabase
      .from("message_sources")
      .delete()
      .eq("user_id", user.id)
      .in("message_id", messageIds);

    if (sourcesError) {
      return NextResponse.json(
        { error: { code: "DATABASE_ERROR", message: sourcesError.message } },
        { status: 500 },
      );
    }
  }

  const { error: deleteMessagesError } = await supabase
    .from("conversation_messages")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);

  if (deleteMessagesError) {
    return NextResponse.json(
      { error: { code: "DATABASE_ERROR", message: deleteMessagesError.message } },
      { status: 500 },
    );
  }

  const { error: deleteConversationError } = await supabase
    .from("conversations")
    .delete()
    .eq("id", conversationId)
    .eq("user_id", user.id);

  if (deleteConversationError) {
    return NextResponse.json(
      { error: { code: "DATABASE_ERROR", message: deleteConversationError.message } },
      { status: 500 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
