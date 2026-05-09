import type { EmbeddingProvider, EmbeddingRequest, EmbeddingResult } from "./types";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const API_KEY_PLACEHOLDERS = ["sk-your-openai-api-key-here", "your-openai-api-key", "sk-your-api-key-here"];

type EmbeddingResponse = {
  data?: Array<{ embedding?: number[] }>;
};

export function createOpenAiCompatibleEmbeddingProvider(input?: {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  dimensions?: number;
}): EmbeddingProvider {
  const baseUrl = input?.baseUrl ?? process.env.EMBEDDING_BASE_URL ?? DEFAULT_BASE_URL;
  const apiKey = input?.apiKey ?? process.env.EMBEDDING_API_KEY ?? process.env.OPENAI_API_KEY;
  const model = input?.model ?? process.env.EMBEDDING_MODEL ?? "text-embedding-3-small";
  const dimensions = input?.dimensions ?? Number(process.env.EMBEDDING_DIMENSIONS ?? 1536);
  const configured = Boolean(apiKey) && !API_KEY_PLACEHOLDERS.includes(apiKey?.trim().toLowerCase() ?? "");

  return {
    id: "openai-compatible",
    model,
    dimensions,
    isConfigured: () => configured,
    async embed(request: EmbeddingRequest): Promise<EmbeddingResult> {
      const res = await fetch(`${baseUrl.replace(/\/$/, "")}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, input: request.input, dimensions }),
        signal: request.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Embedding provider failed (${res.status}): ${text.slice(0, 240)}`);
      }

      const data = (await res.json()) as EmbeddingResponse;
      const embeddings = data.data?.map((item) => item.embedding).filter((item): item is number[] => Array.isArray(item));

      if (!embeddings || embeddings.length !== request.input.length) {
        throw new Error("Embedding provider returned an invalid embedding count");
      }

      return { embeddings, provider: "openai-compatible", model, dimensions };
    },
  };
}