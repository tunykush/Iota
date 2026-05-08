import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatSource } from "@/lib/api/types";
import { generateWithFallback } from "@/lib/llm/router";
import { buildRagMessages } from "./prompts";
import { retrieveRelevantChunks } from "./retrieval";

export type RagChatResult = {
  content: string;
  sources: ChatSource[];
  metadata: {
    provider: string;
    model: string;
    attempts: unknown[];
  };
};

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
}