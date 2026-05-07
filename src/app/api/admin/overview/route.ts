// GET /api/admin/overview — admin-only cross-user activity overview.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";

function authErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "UNKNOWN";

  if (message === "UNAUTHORIZED") {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "You must be signed in" } },
      { status: 401 },
    );
  }

  if (message === "FORBIDDEN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Admin access is required" } },
      { status: 403 },
    );
  }

  return null;
}

export async function GET() {
  try {
    await requireAdmin();
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    throw error;
  }

  const supabase = createAdminClient();

  const [profilesResult, documentsResult, jobsResult, conversationsResult, messagesResult, chunksResult, sourcesResult] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, role, created_at").order("created_at", { ascending: false }),
    supabase.from("documents").select("id, user_id, source_type, title, original_filename, storage_bucket, storage_path, url, status, chunk_count, content_hash, metadata, error_message, created_at, updated_at").order("created_at", { ascending: false }),
    supabase.from("ingestion_jobs").select("id, user_id, document_id, job_type, status, stage, error_message, metadata, started_at, created_at, completed_at").order("created_at", { ascending: false }),
    supabase.from("conversations").select("id, user_id, title, created_at, updated_at").order("updated_at", { ascending: false }),
    supabase.from("conversation_messages").select("id, user_id, conversation_id, role, content, model, metadata, created_at").order("created_at", { ascending: false }).limit(100),
    supabase.from("document_chunks").select("id, user_id, document_id, chunk_index, token_count, source_type, page_number, url, metadata, created_at").order("created_at", { ascending: false }).limit(250),
    supabase.from("message_sources").select("id, user_id, message_id, document_id, chunk_id, score, snippet, metadata, created_at").order("created_at", { ascending: false }).limit(100),
  ]);

  const error = profilesResult.error ?? documentsResult.error ?? jobsResult.error ?? conversationsResult.error ?? messagesResult.error ?? chunksResult.error ?? sourcesResult.error;
  if (error) {
    return NextResponse.json(
      { error: { code: "DATABASE_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  const profiles = profilesResult.data ?? [];
  const documents = documentsResult.data ?? [];
  const jobs = jobsResult.data ?? [];
  const conversations = conversationsResult.data ?? [];
  const messages = messagesResult.data ?? [];
  const chunks = chunksResult.data ?? [];
  const sources = sourcesResult.data ?? [];

  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const countBy = <T,>(items: T[], getKey: (item: T) => string | null | undefined) => {
    return items.reduce<Record<string, number>>((acc, item) => {
      const key = getKey(item) || "unknown";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  };

  const toTimestamp = (value?: string | null) => (value ? new Date(value).getTime() : 0);

  const users = profiles.map((profile) => {
    const userDocuments = documents.filter((document) => document.user_id === profile.id);
    const userJobs = jobs.filter((job) => job.user_id === profile.id);
    const userConversations = conversations.filter((conversation) => conversation.user_id === profile.id);
    const userMessages = messages.filter((message) => message.user_id === profile.id);
    const userChunks = chunks.filter((chunk) => chunk.user_id === profile.id);
    const userSources = sources.filter((source) => source.user_id === profile.id);

    return {
      id: profile.id,
      email: profile.email,
      name: profile.full_name,
      role: profile.role,
      createdAt: profile.created_at,
      documentCount: userDocuments.length,
      processingCount: userDocuments.filter((document) => document.status === "processing").length,
      failedJobCount: userJobs.filter((job) => job.status === "failed").length,
      conversationCount: userConversations.length,
      recentMessageCount: userMessages.length,
      chunkCount: userDocuments.reduce((sum, document) => sum + (document.chunk_count ?? 0), 0),
      sampledChunkCount: userChunks.length,
      sourceCitationCount: userSources.length,
      lastActivityAt: [
        ...userDocuments.map((document) => document.updated_at ?? document.created_at),
        ...userJobs.map((job) => job.completed_at ?? job.started_at ?? job.created_at),
        ...userConversations.map((conversation) => conversation.updated_at ?? conversation.created_at),
        ...userMessages.map((message) => message.created_at),
      ].sort((a, b) => toTimestamp(b) - toTimestamp(a))[0] ?? profile.created_at,
    };
  });

  const timeline = [
    ...documents.map((document) => ({ type: "document", userId: document.user_id, title: document.title, status: document.status, createdAt: document.created_at })),
    ...jobs.map((job) => ({ type: "job", userId: job.user_id, title: job.job_type, status: job.status, createdAt: job.created_at })),
    ...conversations.map((conversation) => ({ type: "conversation", userId: conversation.user_id, title: conversation.title || "Untitled conversation", status: "updated", createdAt: conversation.updated_at })),
    ...messages.map((message) => ({ type: "message", userId: message.user_id, title: message.content.slice(0, 120), status: message.role, createdAt: message.created_at })),
  ].sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt)).slice(0, 60);

  return NextResponse.json({
    stats: {
      userCount: users.length,
      adminCount: users.filter((user) => user.role === "admin").length,
      documentCount: documents.length,
      processingCount: documents.filter((document) => document.status === "processing").length,
      jobCount: jobs.length,
      failedJobCount: jobs.filter((job) => job.status === "failed").length,
      conversationCount: conversations.length,
      recentMessageCount: messages.length,
      chunkCount: documents.reduce((sum, document) => sum + (document.chunk_count ?? 0), 0),
      sampledChunkCount: chunks.length,
      sourceCitationCount: sources.length,
      messagesLast24h: messages.filter((message) => toTimestamp(message.created_at) >= oneDayAgo).length,
      documentsLast7d: documents.filter((document) => toTimestamp(document.created_at) >= sevenDaysAgo).length,
    },
    breakdowns: {
      documentsByStatus: countBy(documents, (document) => document.status),
      documentsBySourceType: countBy(documents, (document) => document.source_type),
      jobsByStatus: countBy(jobs, (job) => job.status),
      messagesByRole: countBy(messages, (message) => message.role),
      chunksBySourceType: countBy(chunks, (chunk) => chunk.source_type),
    },
    users,
    recentDocuments: documents.slice(0, 20).map((document) => ({
      id: document.id,
      userId: document.user_id,
      sourceType: document.source_type,
      title: document.title,
      originalFilename: document.original_filename,
      storageBucket: document.storage_bucket,
      storagePath: document.storage_path,
      url: document.url,
      status: document.status,
      chunkCount: document.chunk_count,
      contentHash: document.content_hash,
      metadata: document.metadata,
      errorMessage: document.error_message,
      createdAt: document.created_at,
      updatedAt: document.updated_at,
    })),
    recentJobs: jobs.slice(0, 20).map((job) => ({
      id: job.id,
      userId: job.user_id,
      documentId: job.document_id,
      jobType: job.job_type,
      status: job.status,
      stage: job.stage,
      errorMessage: job.error_message,
      metadata: job.metadata,
      startedAt: job.started_at,
      createdAt: job.created_at,
      completedAt: job.completed_at,
    })),
    recentMessages: messages.map((message) => ({
      id: message.id,
      userId: message.user_id,
      conversationId: message.conversation_id,
      role: message.role,
      content: message.content,
      model: message.model,
      metadata: message.metadata,
      createdAt: message.created_at,
    })),
    sampledChunks: chunks.slice(0, 60).map((chunk) => ({
      id: chunk.id,
      userId: chunk.user_id,
      documentId: chunk.document_id,
      chunkIndex: chunk.chunk_index,
      tokenCount: chunk.token_count,
      sourceType: chunk.source_type,
      pageNumber: chunk.page_number,
      url: chunk.url,
      metadata: chunk.metadata,
      createdAt: chunk.created_at,
    })),
    recentSources: sources.slice(0, 60).map((source) => ({
      id: source.id,
      userId: source.user_id,
      messageId: source.message_id,
      documentId: source.document_id,
      chunkId: source.chunk_id,
      score: source.score,
      snippet: source.snippet,
      metadata: source.metadata,
      createdAt: source.created_at,
    })),
    timeline,
  });
}