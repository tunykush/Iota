// POST /api/chat  — RAG chat endpoint (FR-050 to FR-056)
// Mock: simulates retrieval + LLM response with realistic latency.
// Replace body with real FastAPI proxy call when backend is ready.

import { NextRequest, NextResponse } from "next/server";
import {
  mockConversations,
  mockMessages,
  getNextRagResponse,
  generateId,
  simulateDelay,
} from "@/lib/api/mock-db";
import type { ChatRequest, ChatResponse, ConversationMessage } from "@/lib/api/types";

export async function POST(request: NextRequest) {
  // Simulate RAG retrieval + LLM latency (1.2–2.0 s)
  await simulateDelay(1200 + Math.random() * 800);

  let body: ChatRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Request body must be valid JSON" } },
      { status: 400 },
    );
  }

  const { message, conversationId, topK = 5 } = body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Field 'message' is required and must be non-empty", details: [{ field: "message", message: "Empty message" }] } },
      { status: 400 },
    );
  }

  // Resolve or create conversation
  let convId = conversationId ?? null;
  if (!convId) {
    convId = generateId("conv");
    const now = new Date().toISOString();
    // Auto-title from first message (truncated)
    const autoTitle = message.length > 60 ? `${message.slice(0, 57)}…` : message;
    mockConversations.unshift({
      id: convId,
      title: autoTitle,
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
    });
    mockMessages[convId] = [];
  }

  const now = new Date().toISOString();
  const userMsgId = generateId("msg");
  const assistantMsgId = generateId("msg");

  // Store user message
  const userMsg: ConversationMessage = {
    id: userMsgId,
    role: "user",
    content: message.trim(),
    createdAt: now,
  };

  // Get mock RAG response
  const ragResponse = getNextRagResponse();

  // Store assistant message
  const assistantMsg: ConversationMessage = {
    id: assistantMsgId,
    role: "assistant",
    content: ragResponse.content,
    createdAt: new Date().toISOString(),
    sources: ragResponse.sources,
  };

  if (!mockMessages[convId]) mockMessages[convId] = [];
  mockMessages[convId].push(userMsg, assistantMsg);

  // Update conversation metadata
  const conv = mockConversations.find((c) => c.id === convId);
  if (conv) {
    conv.updatedAt = new Date().toISOString();
    conv.messageCount = (conv.messageCount ?? 0) + 2;
  }

  const responseBody: ChatResponse = {
    conversationId: convId,
    message: {
      id: assistantMsgId,
      role: "assistant",
      content: ragResponse.content,
      createdAt: assistantMsg.createdAt,
    },
    sources: ragResponse.sources,
  };

  return NextResponse.json(responseBody);
}
