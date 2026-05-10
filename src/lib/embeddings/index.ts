import { createLocalEmbeddingProvider } from "./local";
import { createOpenAiCompatibleEmbeddingProvider } from "./openai-compatible";
import { getEmbeddingCache } from "./cache";
import type { EmbeddingProvider } from "./types";

export type { EmbeddingProvider, EmbeddingProviderId, EmbeddingRequest, EmbeddingResult } from "./types";
export { getEmbeddingCache, resetEmbeddingCache } from "./cache";
export type { EmbeddingCacheStats } from "./cache";

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

// Cached singleton to avoid re-creating the provider on every call
let _cachedProvider: EmbeddingProvider | null = null;
function getCachedProvider(): EmbeddingProvider {
  if (!_cachedProvider) {
    _cachedProvider = createEmbeddingProvider();
  }
  return _cachedProvider;
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
  cacheHits: number;
}> {
  const provider = getCachedProvider();
  const cache = getEmbeddingCache();

  // Check cache for each text
  const { results: cachedResults, missIndices } = cache.getBatch(texts);

  // If all are cached, return immediately
  if (missIndices.length === 0) {
    return {
      embeddings: cachedResults as number[][],
      provider: provider.id,
      model: provider.model,
      dimensions: provider.dimensions,
      version: `${provider.id}:${provider.model}:${provider.dimensions}`,
      cacheHits: texts.length,
    };
  }

  // Embed only the uncached texts
  const uncachedTexts = missIndices.map((i) => texts[i]);
  const result = await provider.embed({ input: uncachedTexts });

  // Store new embeddings in cache
  cache.setBatch(uncachedTexts, result.embeddings);

  // Merge cached and fresh embeddings in original order
  const finalEmbeddings: number[][] = [];
  let freshIndex = 0;
  for (let i = 0; i < texts.length; i++) {
    const cached = cachedResults[i];
    if (cached) {
      finalEmbeddings.push(cached);
    } else {
      finalEmbeddings.push(result.embeddings[freshIndex]);
      freshIndex++;
    }
  }

  return {
    embeddings: finalEmbeddings,
    provider: result.provider,
    model: result.model,
    dimensions: result.dimensions,
    version: `${result.provider}:${result.model}:${result.dimensions}`,
    cacheHits: texts.length - missIndices.length,
  };
}
