import { createLocalEmbeddingProvider } from "./local";
import { createOpenAiCompatibleEmbeddingProvider } from "./openai-compatible";
import type { EmbeddingProvider } from "./types";

export type { EmbeddingProvider, EmbeddingProviderId, EmbeddingRequest, EmbeddingResult } from "./types";

export function getEmbeddingDimensions(): number {
  return Number(process.env.EMBEDDING_DIMENSIONS ?? 1536);
}

export function createEmbeddingProvider(): EmbeddingProvider {
  const provider = (process.env.EMBEDDING_PROVIDER ?? "openai-compatible").toLowerCase();
  const dimensions = getEmbeddingDimensions();

  if (provider === "local") {
    return createLocalEmbeddingProvider(dimensions);
  }

  const openAiCompatible = createOpenAiCompatibleEmbeddingProvider({ dimensions });
  return openAiCompatible.isConfigured() ? openAiCompatible : createLocalEmbeddingProvider(dimensions);
}

export type EmbeddingModelMetadata = {
  provider: string;
  model: string;
  dimensions: number;
  version: string;
};

export function getEmbeddingModelMetadata(): EmbeddingModelMetadata {
  const provider = createEmbeddingProvider();
  return {
    provider: provider.id,
    model: provider.model,
    dimensions: provider.dimensions,
    version: `${provider.id}:${provider.model}:${provider.dimensions}`,
  };
}

export async function embedTexts(texts: string[]): Promise<{
  embeddings: number[][];
  provider: string;
  model: string;
  dimensions: number;
  version: string;
}> {
  const provider = createEmbeddingProvider();
  const result = await provider.embed({ input: texts });
  return { ...result, version: `${result.provider}:${result.model}:${result.dimensions}` };
}