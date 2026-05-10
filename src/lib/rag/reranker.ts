/**
 * Reranker — LLM-based cross-encoder reranking for retrieved chunks.
 *
 * After hybrid retrieval returns candidate chunks, the reranker uses an LLM
 * to score each chunk's relevance to the query on a 0-10 scale, then re-sorts
 * by that score. Falls back gracefully to the original ranking if the LLM
 * call fails or is disabled.
 *
 * Enable/disable via env: RERANKER_ENABLED=true (default: true)
 * Max chunks to rerank:   RERANKER_MAX_CHUNKS=20
 */

import { generateWithFallback } from "@/lib/llm/router";
import type { RetrievedChunk } from "./retrieval";

// ── Configuration ──────────────────────────────────────────────────────────

function isRerankerEnabled(): boolean {
  const flag = (process.env.RERANKER_ENABLED ?? "true").toLowerCase();
  return flag === "true" || flag === "1";
}

function getMaxRerankerChunks(): number {
  return Math.max(1, Number(process.env.RERANKER_MAX_CHUNKS ?? 20));
}

// ── Types ──────────────────────────────────────────────────────────────────

export type RerankResult = {
  chunks: RetrievedChunk[];
  reranked: boolean;
  /** Time spent on reranking in ms */
  latencyMs: number;
};

type ChunkScore = {
  index: number;
  relevanceScore: number;
};

// ── Prompt ─────────────────────────────────────────────────────────────────

function buildRerankPrompt(query: string, chunks: RetrievedChunk[]): string {
  const chunkDescriptions = chunks
    .map((chunk, i) => {
      const preview = chunk.text.slice(0, 600).replace(/\n+/g, " ").trim();
      return `[${i}] "${preview}"`;
    })
    .join("\n\n");

  return `You are a relevance judge. Given a user query and a list of text passages, rate each passage's relevance to the query on a scale of 0-10.

QUERY: "${query}"

PASSAGES:
${chunkDescriptions}

Respond with ONLY a JSON array of objects, each with "index" (passage number) and "score" (0-10 integer).
Example: [{"index":0,"score":8},{"index":1,"score":3}]

Rate ALL ${chunks.length} passages. Higher score = more relevant to the query.`;
}

// ── Score Parsing ──────────────────────────────────────────────────────────

function parseScores(text: string, chunkCount: number): ChunkScore[] | null {
  // Extract JSON array from response
  const jsonMatch = text.match(/\[[\s\S]*?\]/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as unknown;
    if (!Array.isArray(parsed)) return null;

    const scores: ChunkScore[] = [];
    const seen = new Set<number>();

    for (const item of parsed) {
      if (
        typeof item === "object" &&
        item !== null &&
        "index" in item &&
        "score" in item &&
        typeof (item as Record<string, unknown>).index === "number" &&
        typeof (item as Record<string, unknown>).score === "number"
      ) {
        const index = (item as { index: number; score: number }).index;
        const score = (item as { index: number; score: number }).score;
        if (index >= 0 && index < chunkCount && !seen.has(index)) {
          seen.add(index);
          scores.push({
            index,
            relevanceScore: Math.max(0, Math.min(10, Math.round(score))),
          });
        }
      }
    }

    // Must have scores for at least half the chunks to be useful
    if (scores.length < Math.ceil(chunkCount / 2)) return null;

    // Fill in missing chunks with score 0
    for (let i = 0; i < chunkCount; i++) {
      if (!seen.has(i)) {
        scores.push({ index: i, relevanceScore: 0 });
      }
    }

    return scores;
  } catch {
    return null;
  }
}

// ── Main Rerank Function ───────────────────────────────────────────────────

/**
 * Rerank retrieved chunks using LLM-based relevance scoring.
 * Falls back to original order if reranking fails or is disabled.
 */
export async function rerankChunks(
  query: string,
  chunks: RetrievedChunk[],
  topK?: number,
): Promise<RerankResult> {
  const startTime = Date.now();

  // Skip if disabled or too few chunks
  if (!isRerankerEnabled() || chunks.length <= 1) {
    return {
      chunks: topK ? chunks.slice(0, topK) : chunks,
      reranked: false,
      latencyMs: Date.now() - startTime,
    };
  }

  const maxChunks = getMaxRerankerChunks();
  const chunksToRerank = chunks.slice(0, maxChunks);
  const remainingChunks = chunks.slice(maxChunks);

  try {
    const prompt = buildRerankPrompt(query, chunksToRerank);
    const result = await generateWithFallback({
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      maxTokens: 1024,
    });

    const scores = parseScores(result.content, chunksToRerank.length);
    if (!scores) {
      // Parsing failed — return original order
      return {
        chunks: topK ? chunks.slice(0, topK) : chunks,
        reranked: false,
        latencyMs: Date.now() - startTime,
      };
    }

    // Sort by relevance score descending, then by original hybrid score
    const reranked = scores
      .sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
        return (chunksToRerank[b.index]?.score ?? 0) - (chunksToRerank[a.index]?.score ?? 0);
      })
      .map((s) => ({
        ...chunksToRerank[s.index],
        score: Number(((s.relevanceScore / 10) * 0.7 + (chunksToRerank[s.index]?.score ?? 0) * 0.3).toFixed(3)),
      }))
      .filter((c): c is RetrievedChunk => c !== undefined);

    const finalChunks = [...reranked, ...remainingChunks];
    return {
      chunks: topK ? finalChunks.slice(0, topK) : finalChunks,
      reranked: true,
      latencyMs: Date.now() - startTime,
    };
  } catch {
    // LLM call failed — graceful fallback
    return {
      chunks: topK ? chunks.slice(0, topK) : chunks,
      reranked: false,
      latencyMs: Date.now() - startTime,
    };
  }
}