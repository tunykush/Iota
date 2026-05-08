// GET /api/dashboard  — aggregated stats + recent items for the overview page

import { NextResponse } from "next/server";
import type { DashboardResponse, DocumentSourceType, DocumentStatus } from "@/lib/api/types";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "You must be signed in to view the dashboard" } },
      { status: 401 },
    );
  }

  const [{ data: docs, error: docsError }, { data: conversations, error: conversationsError }] = await Promise.all([
    supabase
      .from("documents")
      .select("id, source_type, title, original_filename, url, status, chunk_count, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("conversations")
      .select("id, title, created_at, updated_at, conversation_messages(count)")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(3),
  ]);

  if (docsError || conversationsError) {
    return NextResponse.json(
      { error: { code: "DATABASE_ERROR", message: docsError?.message ?? conversationsError?.message } },
      { status: 500 },
    );
  }

  const documents = (docs ?? []).map((doc) => ({
    id: doc.id,
    sourceType: doc.source_type as DocumentSourceType,
    title: doc.title,
    originalFilename: doc.original_filename ?? undefined,
    url: doc.url ?? undefined,
    status: doc.status as DocumentStatus,
    chunkCount: doc.chunk_count ?? 0,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
  }));

  const recentConversations = (conversations ?? []).map((conversation) => ({
    id: conversation.id,
    title: conversation.title ?? undefined,
    createdAt: conversation.created_at,
    updatedAt: conversation.updated_at,
    messageCount: conversation.conversation_messages?.[0]?.count ?? 0,
  }));

  const processingCount = documents.filter((doc) => doc.status === "processing").length;
  const chunkCount = documents.reduce((sum, doc) => sum + doc.chunkCount, 0);

  const body: DashboardResponse = {
    stats: {
      documentCount: documents.length,
      processingCount,
      chunkCount,
      queryCountToday: 0,
      queryCountYesterday: 0,
      avgAnswerMs: 0,
    },
    recentDocuments: documents.slice(0, 5),
    recentConversations,
  };

  return NextResponse.json(body);
}
