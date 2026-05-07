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

  const [profilesResult, documentsResult, jobsResult, conversationsResult, messagesResult] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, role, created_at").order("created_at", { ascending: false }),
    supabase.from("documents").select("id, user_id, source_type, title, status, chunk_count, created_at").order("created_at", { ascending: false }),
    supabase.from("ingestion_jobs").select("id, user_id, document_id, job_type, status, stage, error_message, created_at, completed_at").order("created_at", { ascending: false }),
    supabase.from("conversations").select("id, user_id, title, created_at, updated_at").order("updated_at", { ascending: false }),
    supabase.from("conversation_messages").select("id, user_id, conversation_id, role, content, created_at").order("created_at", { ascending: false }).limit(25),
  ]);

  const error = profilesResult.error ?? documentsResult.error ?? jobsResult.error ?? conversationsResult.error ?? messagesResult.error;
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

  const users = profiles.map((profile) => {
    const userDocuments = documents.filter((document) => document.user_id === profile.id);
    const userJobs = jobs.filter((job) => job.user_id === profile.id);
    const userConversations = conversations.filter((conversation) => conversation.user_id === profile.id);
    const userMessages = messages.filter((message) => message.user_id === profile.id);

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
    };
  });

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
    },
    users,
    recentDocuments: documents.slice(0, 20).map((document) => ({
      id: document.id,
      userId: document.user_id,
      sourceType: document.source_type,
      title: document.title,
      status: document.status,
      chunkCount: document.chunk_count,
      createdAt: document.created_at,
    })),
    recentJobs: jobs.slice(0, 20).map((job) => ({
      id: job.id,
      userId: job.user_id,
      documentId: job.document_id,
      jobType: job.job_type,
      status: job.status,
      stage: job.stage,
      errorMessage: job.error_message,
      createdAt: job.created_at,
      completedAt: job.completed_at,
    })),
    recentMessages: messages.map((message) => ({
      id: message.id,
      userId: message.user_id,
      conversationId: message.conversation_id,
      role: message.role,
      content: message.content,
      createdAt: message.created_at,
    })),
  });
}