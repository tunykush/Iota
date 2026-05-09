// POST /api/chat - hybrid RAG endpoint.
// Uses Supabase document chunks for retrieval and the LLM router for generation.

import { NextRequest, NextResponse } from "next/server";
import type { ChatRequest, ChatResponse, ConversationMessage } from "@/lib/api/types";
import { ragServices } from "@/lib/rag/services";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_MESSAGE_LENGTH = 32_000;

function autoTitle(message: string): string {
  return message.length > 60 ? `${message.slice(0, 57)}...` : message;
}

function classifyChatError(error: unknown) {
  const message = error instanceof Error ? error.message : "No LLM provider could answer this request";

  if (message.includes("No indexed document chunks") || message.includes("Failed to retrieve document chunks")) {
    return {
      status: 422,
      code: "RETRIEVAL_ERROR",
      message,
    };
  }

  return {
    status: 502,
    code: "LLM_PROVIDER_ERROR",
    message,
  };
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "You must be signed in to chat with your documents" } },
      { status: 401 },
    );
  }

  let body: ChatRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Request body must be valid JSON" } },
      { status: 400 },
    );
  }

  const { message, conversationId, topK = 5, documentIds, mode } = body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Field 'message' is required and must be non-empty", details: [{ field: "message", message: "Empty message" }] } },
      { status: 400 },
    );
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`, details: [{ field: "message", message: "Message too long" }] } },
      { status: 400 },
    );
  }

  let convId = conversationId ?? null;
  if (!convId) {
    const { data: createdConversation, error: createConversationError } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        title: autoTitle(message.trim()),
      })
      .select("id")
      .single();

    if (createConversationError || !createdConversation) {
      return NextResponse.json(
        { error: { code: "DATABASE_ERROR", message: createConversationError?.message ?? "Failed to create conversation" } },
        { status: 500 },
      );
    }

    convId = createdConversation.id;
  } else {
    const { data: existingConversation, error: existingConversationError } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", convId)
      .eq("user_id", user.id)
      .single();

    if (existingConversationError || !existingConversation) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: `Conversation '${convId}' not found` } },
        { status: 404 },
      );
    }
  }

  const finalConversationId = convId;
  if (!finalConversationId) {
    return NextResponse.json(
      { error: { code: "DATABASE_ERROR", message: "Failed to resolve conversation" } },
      { status: 500 },
    );
  }

  const { data: insertedUserMessage, error: userMessageError } = await supabase
    .from("conversation_messages")
    .insert({
      user_id: user.id,
      conversation_id: finalConversationId,
      role: "user",
      content: message.trim(),
    })
    .select("id, role, content, created_at")
    .single();

  if (userMessageError || !insertedUserMessage) {
    return NextResponse.json(
      { error: { code: "DATABASE_ERROR", message: userMessageError?.message ?? "Failed to save user message" } },
      { status: 500 },
    );
  }

  let ragResponse;
  try {
    ragResponse = await ragServices.chat.run({
      supabase,
      userId: user.id,
      message: message.trim(),
      topK,
      documentIds,
      mode,
    });
  } catch (error) {
    console.error("/api/chat failed", error);
    const chatError = classifyChatError(error);

    return NextResponse.json(
      {
        error: {
          code: chatError.code,
          message: chatError.message,
        },
      },
      { status: chatError.status },
    );
  }

  const { data: insertedAssistantMessage, error: assistantMessageError } = await supabase
    .from("conversation_messages")
    .insert({
      user_id: user.id,
      conversation_id: finalConversationId,
      role: "assistant",
      content: ragResponse.content,
      model: ragResponse.metadata.model,
      metadata: {
        provider: ragResponse.metadata.provider,
        attempts: ragResponse.metadata.attempts,
        diagnostics: ragResponse.metadata.diagnostics,
      },
    })
    .select("id, role, content, created_at")
    .single();

  if (assistantMessageError || !insertedAssistantMessage) {
    return NextResponse.json(
      { error: { code: "DATABASE_ERROR", message: assistantMessageError?.message ?? "Failed to save assistant message" } },
      { status: 500 },
    );
  }

  if (ragResponse.sources.length > 0) {
    const { error: sourcesError } = await supabase.from("message_sources").insert(
      ragResponse.sources.map((source) => ({
        user_id: user.id,
        message_id: insertedAssistantMessage.id,
        document_id: source.documentId,
        chunk_id: source.chunkId,
        score: source.score,
        snippet: source.snippet,
        metadata: {
          title: source.title,
          sourceType: source.sourceType,
          pageNumber: source.pageNumber ?? null,
          url: source.url ?? null,
        },
      })),
    );

    if (sourcesError) {
      console.error("Failed to save message sources", sourcesError);
    }
  }

  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", finalConversationId)
    .eq("user_id", user.id);

  const assistantMsg: ConversationMessage = {
    id: insertedAssistantMessage.id,
    role: "assistant",
    content: insertedAssistantMessage.content,
    createdAt: insertedAssistantMessage.created_at,
    sources: ragResponse.sources,
    provider: ragResponse.metadata.provider,
    model: ragResponse.metadata.model,
    diagnostics: ragResponse.metadata.diagnostics,
  };

  const responseBody: ChatResponse = {
    conversationId: finalConversationId,
    message: {
      id: assistantMsg.id,
      role: "assistant",
      content: assistantMsg.content,
      createdAt: assistantMsg.createdAt,
      provider: assistantMsg.provider,
      model: assistantMsg.model,
      diagnostics: assistantMsg.diagnostics,
    },
    sources: ragResponse.sources,
    diagnostics: ragResponse.metadata.diagnostics,
  };

  return NextResponse.json(responseBody);
}