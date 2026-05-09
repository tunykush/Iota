import type { EmbeddingProvider, EmbeddingRequest, EmbeddingResult } from "./types";

const LOCAL_MODEL = "local-hash-embedding";

function hashToken(token: string): number {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalize(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!norm) return vector;
  return vector.map((value) => Number((value / norm).toFixed(8)));
}

function embedText(text: string, dimensions: number): number[] {
  const vector = Array.from({ length: dimensions }, () => 0);
  const tokens = text.toLowerCase().match(/[a-z0-9\u00c0-\u1ef9_-]+/g) ?? [];

  for (const token of tokens) {
    const hash = hashToken(token);
    const index = hash % dimensions;
    vector[index] += (hash & 1) === 0 ? 1 : -1;
  }

  return normalize(vector);
}

export function createLocalEmbeddingProvider(dimensions: number): EmbeddingProvider {
  return {
    id: "local",
    model: LOCAL_MODEL,
    dimensions,
    isConfigured: () => true,
    async embed(request: EmbeddingRequest): Promise<EmbeddingResult> {
      return {
        embeddings: request.input.map((text) => embedText(text, dimensions)),
        provider: "local",
        model: LOCAL_MODEL,
        dimensions,
      };
    },
  };
}