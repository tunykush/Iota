// POST /api/chat/stream - SSE streaming RAG chat endpoint.
// Streams LLM tokens as Server-Sent Events for real-time UI updates.

import { NextRequest } from "next/server";
import type { ChatRequest } from "@/lib/api/types";
import { streamHybridRagChat } from "@/lib/rag/chat";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_MESSAGE_LENGTH = 32_000;

function autoTitle(message: string): string {
  return message.length > 60 ? `${message.slice(0, 57)}...` : message;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Sign in required" } }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: ChatRequest;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "Invalid JSON" } }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { message, conversationId, topK = 5, documentIds } = body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return new Response(JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "Empty message" } }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return new Response(JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "Message too long" } }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Resolve or create conversation
  let convId = conversationId ?? null;
  if (!convId) {
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title: autoTitle(message.trim()) })
      .select("id")
      .single();
    if (error || !data) {
      return new Response(JSON.stringify({ error: { code: "DATABASE_ERROR", message: error?.message ?? "Failed to create conversation" } }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    convId = data.id;
  }

  // Save user message
  await supabase.from("conversation_messages").insert({
    user_id: user.id,
    conversation_id: convId,
    role: "user",
    content: message.trim(),
  });

  const finalConvId = convId;

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Emit conversationId first
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "init", conversationId: finalConvId })}\n\n`));

        let fullContent = "";
        let provider = "";
        let model = "";

        for await (const event of streamHybridRagChat({
          supabase,
          userId: user.id,
          message: message.trim(),
          topK,
          documentIds,
        })) {
          controller.enqueue(encoder.encode(event));

          // Parse to capture final content
          try {
            const dataMatch = event.match(/^data: (.+)$/m);
            if (dataMatch) {
              const parsed = JSON.parse(dataMatch[1]);
              if (parsed.type === "complete") fullContent = parsed.content;
              if (parsed.type === "done") {
                provider = parsed.provider;
                model = parsed.model;
              }
            }
          } catch { /* ignore parse errors */ }
        }

        // Persist assistant message
        if (fullContent) {
          const { data: assistantMsg } = await supabase
            .from("conversation_messages")
            .insert({
              user_id: user.id,
              conversation_id: finalConvId,
              role: "assistant",
              content: fullContent,
              model,
              metadata: { provider, streaming: true },
            })
            .select("id")
            .single();

          // Emit persisted message ID
          if (assistantMsg) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "persisted", messageId: assistantMsg.id })}\n\n`));
          }

          await supabase
            .from("conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", finalConvId)
            .eq("user_id", user.id);
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : "Stream failed";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: errMsg })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}