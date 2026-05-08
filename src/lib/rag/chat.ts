import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatSource } from "@/lib/api/types";
import { generateWithFallback } from "@/lib/llm/router";
import { buildRagMessages } from "./prompts";
import { retrieveRelevantChunks, type RetrievedChunk } from "./retrieval";

export type RagChatResult = {
  content: string;
  sources: ChatSource[];
  metadata: {
    provider: string;
    model: string;
    attempts: unknown[];
  };
};

function buildExtractiveAnswer(message: string, chunks: RetrievedChunk[]): string {
  const intro = `Mình chưa gọi được LLM provider bên ngoài, nên dưới đây là câu trả lời trích xuất trực tiếp từ nguồn đã retrieve cho câu hỏi: "${message}".`;
  const bullets = chunks
    .slice(0, 5)
    .map((chunk, index) => {
      const source = chunk.url ? `${chunk.title} - ${chunk.url}` : chunk.title;
      return `[${index + 1}] ${chunk.snippet}\nNguồn: ${source}`;
    })
    .join("\n\n");

  return `${intro}\n\n${bullets}`;
}

export async function runHybridRagChat(input: {
  supabase: SupabaseClient;
  userId: string;
  message: string;
  topK?: number;
  documentIds?: string[];
}): Promise<RagChatResult> {
  const chunks = await retrieveRelevantChunks({
    supabase: input.supabase,
    userId: input.userId,
    query: input.message,
    topK: input.topK,
    documentIds: input.documentIds,
  });
  const sources = chunks.map(({ text: _text, ...source }) => source);

  try {
    const llmResult = await generateWithFallback({
      messages: buildRagMessages(input.message, chunks),
      temperature: 0.2,
      maxTokens: 900,
    });

    return {
      content: llmResult.content,
      sources,
      metadata: {
        provider: llmResult.provider,
        model: llmResult.model,
        attempts: llmResult.attempts,
      },
    };
  } catch (error) {
    return {
      content: buildExtractiveAnswer(input.message, chunks),
      sources,
      metadata: {
        provider: "extractive",
        model: "local-retrieval-fallback",
        attempts: [
          {
            provider: "extractive",
            model: "local-retrieval-fallback",
            ok: true,
            error: error instanceof Error ? error.message : "All LLM providers failed",
            latencyMs: 0,
          },
        ],
      },
    };
  }
}
