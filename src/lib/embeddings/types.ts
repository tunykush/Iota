export type EmbeddingProviderId = "openai-compatible" | "local";

export type EmbeddingRequest = {
  input: string[];
  signal?: AbortSignal;
};

export type EmbeddingResult = {
  embeddings: number[][];
  provider: EmbeddingProviderId;
  model: string;
  dimensions: number;
};

export type EmbeddingProvider = {
  id: EmbeddingProviderId;
  model: string;
  dimensions: number;
  isConfigured: () => boolean;
  embed: (request: EmbeddingRequest) => Promise<EmbeddingResult>;
};