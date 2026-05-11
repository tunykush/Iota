import type { RetrievedChunk } from "./retrieval";
import { enrichChunksWithBookContext, hasBookContent, buildBookChunkContextText, type BookEnrichedChunk } from "./book-retrieval";

export type ContextOrchestratorSettings = {
  enabled: boolean;
  queryExpansion: boolean;
  rerank: boolean;
  contextCompression: boolean;
  citationVerification: boolean;
  maxContextChars: number;
};

export type ContextOrchestratorDiagnostics = {
  enabled: boolean;
  queryVariants: string[];
  reranked: boolean;
  compressed: boolean;
  citationVerification: {
    enabled: boolean;
    sourceCount: number;
    weakSourceCount: number;
    averageSupport: number;
  };
  contextChars: {
    before: number;
    after: number;
  };
};

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "this", "that", "what", "how", "are", "you", "from", "into", "about",
  "toi", "tôi", "la", "là", "gi", "gì", "cho", "cua", "của", "ve", "về", "nay", "này", "trong", "hãy", "các", "một", "những", "và", "hoặc",
]);

const EXPANSIONS: Array<[RegExp, string[]]> = [
  [/lỗi|bug|không\s*hoạt\s*động/iu, ["error", "failure", "troubleshooting", "root cause"]],
  [/cách|làm\s*sao|how\s+to/iu, ["steps", "guide", "setup", "configure"]],
  [/tóm\s*tắt|summary|overview/iu, ["summary", "overview", "key points"]],
  [/khác|so\s*sánh|compare|versus|\bvs\b/iu, ["difference", "comparison", "tradeoff"]],
  [/nguồn|cite|citation|reference/iu, ["source", "citation", "reference"]],
  [/đăng\s*nhập|login|auth/iu, ["authentication", "session", "sign in"]],
  [/upload|tải\s*lên/iu, ["upload", "multipart", "file"]],
];

function envFlag(name: string, defaultValue: boolean) {
  const value = process.env[name]?.toLowerCase();
  if (["0", "false", "off", "no"].includes(value ?? "")) return false;
  if (["1", "true", "on", "yes"].includes(value ?? "")) return true;
  return defaultValue;
}

export function getContextOrchestratorSettings(): ContextOrchestratorSettings {
  return {
    enabled: envFlag("IOTA_RAG_CONTEXT_ENABLED", true),
    queryExpansion: envFlag("IOTA_RAG_QUERY_EXPANSION", true),
    rerank: envFlag("IOTA_RAG_RERANK", true),
    contextCompression: envFlag("IOTA_RAG_CONTEXT_COMPRESSION", true),
    citationVerification: envFlag("IOTA_RAG_CITATION_CHECK", true),
    maxContextChars: Number(process.env.IOTA_RAG_MAX_CONTEXT_CHARS ?? 9000),
  };
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s\u00c0-\u1ef9_-]/gi, " ").replace(/\s+/g, " ").trim();
}

function tokenize(text: string): string[] {
  return normalize(text).split(/\s+/).filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

export function planContextQueries(query: string, settings = getContextOrchestratorSettings()): string[] {
  const variants = new Set<string>([query.trim()]);
  if (!settings.enabled || !settings.queryExpansion) return Array.from(variants).filter(Boolean);

  const tokens = tokenize(query);
  if (tokens.length > 0) variants.add(tokens.join(" "));
  for (const [pattern, terms] of EXPANSIONS) {
    if (pattern.test(query)) terms.forEach((term) => variants.add(term));
  }
  return Array.from(variants).filter(Boolean).slice(0, 6);
}

function supportScore(queryTokens: string[], chunk: RetrievedChunk): number {
  const textTokens = new Set(tokenize(`${chunk.title} ${chunk.snippet} ${chunk.text}`));
  if (queryTokens.length === 0) return 0;
  const matches = queryTokens.filter((token) => textTokens.has(token)).length;
  return Number((matches / queryTokens.length).toFixed(3));
}

function splitSentences(text: string): string[] {
  return text.replace(/\s+/g, " ").split(/(?<=[.!?。！？])\s+|\n+/).map((item) => item.trim()).filter((item) => item.length > 24);
}

function compressChunk(query: string, chunk: RetrievedChunk, maxChars: number): RetrievedChunk {
  if (chunk.text.length <= maxChars) return chunk;
  const queryTokens = tokenize(query);
  const ranked = splitSentences(chunk.text)
    .map((sentence, index) => ({ sentence, index, score: supportScore(queryTokens, { ...chunk, text: sentence, snippet: sentence }) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 6)
    .sort((a, b) => a.index - b.index);
  const text = (ranked.length > 0 ? ranked.map((item) => item.sentence).join(" ") : chunk.text.slice(0, maxChars)).slice(0, maxChars).trim();
  return { ...chunk, text, snippet: text.slice(0, 360) };
}

export function orchestrateContext(input: {
  query: string;
  chunks: RetrievedChunk[];
  settings?: ContextOrchestratorSettings;
}): { chunks: RetrievedChunk[]; diagnostics: ContextOrchestratorDiagnostics } {
  const settings = input.settings ?? getContextOrchestratorSettings();
  const beforeChars = input.chunks.reduce((sum, chunk) => sum + chunk.text.length, 0);
  const queryVariants = planContextQueries(input.query, settings);
  const queryTokens = Array.from(new Set(queryVariants.flatMap(tokenize)));

  let chunks = input.chunks;
  if (settings.enabled && settings.rerank) {
    chunks = chunks
      .map((chunk) => {
        const support = supportScore(queryTokens, chunk);
        return { ...chunk, score: Number((chunk.score * 0.70 + support * 0.30).toFixed(3)) };
      })
      .sort((a, b) => b.score - a.score);

    // Diversity-aware reranking: ensure representation from multiple documents
    // (inspired by OpenRAG's multi-source aggregation)
    if (chunks.length > 3) {
      const diversified: typeof chunks = [];
      const seenDocs = new Set<string>();
      // First pass: best chunk per document
      for (const chunk of chunks) {
        if (!seenDocs.has(chunk.documentId)) {
          diversified.push(chunk);
          seenDocs.add(chunk.documentId);
        }
      }
      // Second pass: fill with remaining by score
      for (const chunk of chunks) {
        if (!diversified.includes(chunk)) {
          diversified.push(chunk);
        }
      }
      chunks = diversified;
    }
  }

  if (settings.enabled && settings.contextCompression) {
    const perChunkBudget = Math.max(900, Math.floor(settings.maxContextChars / Math.max(chunks.length, 1)));
    chunks = chunks.map((chunk) => compressChunk(input.query, chunk, perChunkBudget));
  }

  // ── Book RAG enrichment ──
  // If chunks contain book-structured content, enrich them with hierarchy context
  if (hasBookContent(chunks)) {
    const enriched = enrichChunksWithBookContext(chunks);
    chunks = enriched.map((chunk) => {
      const bookChunk = chunk as BookEnrichedChunk;
      if (bookChunk.bookMetadata) {
        // Inject chapter context into the chunk text so the LLM sees it
        return { ...chunk, text: buildBookChunkContextText(bookChunk) };
      }
      return chunk;
    });
  }

  const supports = chunks.map((chunk) => supportScore(queryTokens, chunk));
  const weakSourceCount = supports.filter((score) => score < 0.15).length;
  const averageSupport = supports.length ? Number((supports.reduce((sum, score) => sum + score, 0) / supports.length).toFixed(3)) : 0;
  const afterChars = chunks.reduce((sum, chunk) => sum + chunk.text.length, 0);

  return {
    chunks,
    diagnostics: {
      enabled: settings.enabled,
      queryVariants,
      reranked: settings.enabled && settings.rerank,
      compressed: settings.enabled && settings.contextCompression && afterChars < beforeChars,
      citationVerification: {
        enabled: settings.enabled && settings.citationVerification,
        sourceCount: chunks.length,
        weakSourceCount: settings.citationVerification ? weakSourceCount : 0,
        averageSupport: settings.citationVerification ? averageSupport : 0,
      },
      contextChars: { before: beforeChars, after: afterChars },
    },
  };
}
