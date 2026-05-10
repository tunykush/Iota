/**
 * RAG Evaluation Metrics — RAGAS-inspired scoring for retrieval quality.
 *
 * Provides automated evaluation of RAG pipeline quality across 4 dimensions:
 * 1. Context Relevance — Are the retrieved chunks relevant to the query?
 * 2. Answer Faithfulness — Is the answer grounded in the retrieved context?
 * 3. Answer Relevance — Does the answer actually address the query?
 * 4. Context Precision — Are the most relevant chunks ranked highest?
 *
 * These metrics can be computed without ground-truth labels (reference-free),
 * making them suitable for production monitoring.
 *
 * Enable via env: RAG_EVALUATION_ENABLED=true (default: false for perf)
 */

import { generateWithFallback } from "@/lib/llm/router";
import type { RetrievedChunk } from "./retrieval";

// ── Configuration ──────────────────────────────────────────────────────────

function isEvaluationEnabled(): boolean {
  const flag = (process.env.RAG_EVALUATION_ENABLED ?? "false").toLowerCase();
  return flag === "true" || flag === "1";
}

// ── Types ──────────────────────────────────────────────────────────────────

export type RagEvaluationScores = {
  contextRelevance: number;
  answerFaithfulness: number;
  answerRelevance: number;
  contextPrecision: number;
  overall: number;
  details: {
    contextRelevanceReason: string;
    faithfulnessReason: string;
    relevanceReason: string;
    precisionReason: string;
  };
  latencyMs: number;
};

export type EvaluationInput = {
  query: string;
  answer: string;
  chunks: RetrievedChunk[];
};

// ── Lightweight Heuristic Metrics (no LLM needed) ─────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\u00c0-\u1ef9]/gi, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

/**
 * Context Precision — measures if the most relevant chunks are ranked first.
 * Uses a weighted scoring where higher-ranked chunks contribute more.
 */
function computeContextPrecision(query: string, chunks: RetrievedChunk[]): { score: number; reason: string } {
  if (chunks.length === 0) return { score: 0, reason: "No chunks retrieved" };

  const queryTokens = new Set(tokenize(query));
  if (queryTokens.size === 0) return { score: 0.5, reason: "Query too short to evaluate" };

  let weightedSum = 0;
  let totalWeight = 0;

  for (let i = 0; i < chunks.length; i++) {
    const weight = 1 / (i + 1); // DCG-style weighting
    totalWeight += weight;

    const chunkTokens = tokenize(chunks[i].text);
    const overlap = chunkTokens.filter((t) => queryTokens.has(t)).length;
    const relevance = Math.min(1, overlap / Math.max(1, queryTokens.size));

    weightedSum += weight * relevance;
  }

  const score = Number((weightedSum / totalWeight).toFixed(3));
  const topRelevant = chunks.slice(0, 3).filter((c) => {
    const tokens = tokenize(c.text);
    return tokens.filter((t) => queryTokens.has(t)).length >= queryTokens.size * 0.3;
  }).length;

  return {
    score,
    reason: `${topRelevant}/${Math.min(3, chunks.length)} top chunks contain query terms. Weighted precision: ${(score * 100).toFixed(0)}%`,
  };
}

/**
 * Context Relevance — measures overall relevance of retrieved context to query.
 */
function computeContextRelevance(query: string, chunks: RetrievedChunk[]): { score: number; reason: string } {
  if (chunks.length === 0) return { score: 0, reason: "No chunks retrieved" };

  const queryTokens = new Set(tokenize(query));
  if (queryTokens.size === 0) return { score: 0.5, reason: "Query too short" };

  let totalRelevance = 0;
  let relevantChunks = 0;

  for (const chunk of chunks) {
    const chunkTokens = new Set(tokenize(chunk.text));
    let overlap = 0;
    for (const qt of queryTokens) {
      if (chunkTokens.has(qt)) overlap++;
    }
    const relevance = overlap / queryTokens.size;
    totalRelevance += relevance;
    if (relevance > 0.2) relevantChunks++;
  }

  const avgRelevance = totalRelevance / chunks.length;
  const score = Number(Math.min(1, avgRelevance * 1.5).toFixed(3));

  return {
    score,
    reason: `${relevantChunks}/${chunks.length} chunks are relevant. Average token overlap: ${(avgRelevance * 100).toFixed(0)}%`,
  };
}

/**
 * Answer Faithfulness — measures if the answer is grounded in the context.
 * Checks what fraction of answer claims appear in the retrieved chunks.
 */
function computeAnswerFaithfulness(answer: string, chunks: RetrievedChunk[]): { score: number; reason: string } {
  if (!answer.trim()) return { score: 0, reason: "Empty answer" };
  if (chunks.length === 0) return { score: 0, reason: "No context to verify against" };

  const contextText = chunks.map((c) => c.text).join(" ").toLowerCase();
  const contextTokens = new Set(tokenize(contextText));

  // Split answer into sentences as "claims"
  const sentences = answer
    .split(/[.!?。！？]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);

  if (sentences.length === 0) return { score: 0.5, reason: "Answer too short to evaluate" };

  let groundedSentences = 0;

  for (const sentence of sentences) {
    const sentenceTokens = tokenize(sentence);
    if (sentenceTokens.length === 0) continue;

    const grounded = sentenceTokens.filter((t) => contextTokens.has(t)).length;
    const groundedness = grounded / sentenceTokens.length;

    if (groundedness > 0.35) groundedSentences++;
  }

  const score = Number((groundedSentences / sentences.length).toFixed(3));

  return {
    score,
    reason: `${groundedSentences}/${sentences.length} answer sentences are grounded in context (>35% token overlap)`,
  };
}

/**
 * Answer Relevance — measures if the answer addresses the query.
 */
function computeAnswerRelevance(query: string, answer: string): { score: number; reason: string } {
  if (!answer.trim()) return { score: 0, reason: "Empty answer" };

  const queryTokens = new Set(tokenize(query));
  const answerTokens = new Set(tokenize(answer));

  if (queryTokens.size === 0) return { score: 0.5, reason: "Query too short" };

  let queryTermsInAnswer = 0;
  for (const qt of queryTokens) {
    if (answerTokens.has(qt)) queryTermsInAnswer++;
  }

  const termCoverage = queryTermsInAnswer / queryTokens.size;

  // Also check if answer is substantive (not just "I don't know")
  const isSubstantive = answer.length > 50 && answerTokens.size > 10;
  const substantiveBonus = isSubstantive ? 0.15 : 0;

  const score = Number(Math.min(1, termCoverage + substantiveBonus).toFixed(3));

  return {
    score,
    reason: `${queryTermsInAnswer}/${queryTokens.size} query terms appear in answer. ${isSubstantive ? "Answer is substantive." : "Answer may be too brief."}`,
  };
}

// ── LLM-Enhanced Evaluation (optional, more accurate) ─────────────────────

async function llmEvaluate(input: EvaluationInput): Promise<RagEvaluationScores | null> {
  const contextPreview = input.chunks
    .slice(0, 5)
    .map((c, i) => `[${i + 1}] ${c.text.slice(0, 300)}`)
    .join("\n\n");

  const prompt = `You are a RAG quality evaluator. Score the following retrieval-augmented generation on 4 dimensions (0.0 to 1.0):

QUERY: "${input.query}"

RETRIEVED CONTEXT:
${contextPreview}

GENERATED ANSWER:
"${input.answer.slice(0, 1000)}"

Score each dimension:
1. context_relevance: Are the retrieved passages relevant to the query?
2. answer_faithfulness: Is the answer factually grounded in the retrieved context?
3. answer_relevance: Does the answer actually address the query?
4. context_precision: Are the most relevant passages ranked first?

Respond with ONLY a JSON object:
{"context_relevance":0.8,"answer_faithfulness":0.9,"answer_relevance":0.85,"context_precision":0.7,"context_relevance_reason":"...","faithfulness_reason":"...","relevance_reason":"...","precision_reason":"..."}`;

  try {
    const result = await generateWithFallback({
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      maxTokens: 512,
    });

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    const cr = Number(parsed.context_relevance ?? 0);
    const af = Number(parsed.answer_faithfulness ?? 0);
    const ar = Number(parsed.answer_relevance ?? 0);
    const cp = Number(parsed.context_precision ?? 0);

    return {
      contextRelevance: Math.max(0, Math.min(1, cr)),
      answerFaithfulness: Math.max(0, Math.min(1, af)),
      answerRelevance: Math.max(0, Math.min(1, ar)),
      contextPrecision: Math.max(0, Math.min(1, cp)),
      overall: Number(((cr * 0.25 + af * 0.3 + ar * 0.25 + cp * 0.2)).toFixed(3)),
      details: {
        contextRelevanceReason: String(parsed.context_relevance_reason ?? ""),
        faithfulnessReason: String(parsed.faithfulness_reason ?? ""),
        relevanceReason: String(parsed.relevance_reason ?? ""),
        precisionReason: String(parsed.precision_reason ?? ""),
      },
      latencyMs: result.latencyMs,
    };
  } catch {
    return null;
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Evaluate RAG pipeline quality for a single query-answer pair.
 *
 * Uses lightweight heuristic metrics by default. If RAG_EVALUATION_ENABLED=true
 * and LLM is available, enhances with LLM-based evaluation.
 */
export async function evaluateRagQuality(input: EvaluationInput): Promise<RagEvaluationScores> {
  const startTime = Date.now();

  // Always compute heuristic metrics (fast, no API calls)
  const precision = computeContextPrecision(input.query, input.chunks);
  const relevance = computeContextRelevance(input.query, input.chunks);
  const faithfulness = computeAnswerFaithfulness(input.answer, input.chunks);
  const answerRelevance = computeAnswerRelevance(input.query, input.answer);

  const heuristicResult: RagEvaluationScores = {
    contextRelevance: relevance.score,
    answerFaithfulness: faithfulness.score,
    answerRelevance: answerRelevance.score,
    contextPrecision: precision.score,
    overall: Number(
      (relevance.score * 0.25 + faithfulness.score * 0.3 + answerRelevance.score * 0.25 + precision.score * 0.2).toFixed(3),
    ),
    details: {
      contextRelevanceReason: relevance.reason,
      faithfulnessReason: faithfulness.reason,
      relevanceReason: answerRelevance.reason,
      precisionReason: precision.reason,
    },
    latencyMs: Date.now() - startTime,
  };

  // If LLM evaluation is enabled, try to enhance with LLM scores
  if (isEvaluationEnabled()) {
    const llmResult = await llmEvaluate(input);
    if (llmResult) {
      // Blend heuristic and LLM scores (60% LLM, 40% heuristic)
      return {
        contextRelevance: Number((llmResult.contextRelevance * 0.6 + heuristicResult.contextRelevance * 0.4).toFixed(3)),
        answerFaithfulness: Number((llmResult.answerFaithfulness * 0.6 + heuristicResult.answerFaithfulness * 0.4).toFixed(3)),
        answerRelevance: Number((llmResult.answerRelevance * 0.6 + heuristicResult.answerRelevance * 0.4).toFixed(3)),
        contextPrecision: Number((llmResult.contextPrecision * 0.6 + heuristicResult.contextPrecision * 0.4).toFixed(3)),
        overall: Number((llmResult.overall * 0.6 + heuristicResult.overall * 0.4).toFixed(3)),
        details: {
          contextRelevanceReason: `LLM: ${llmResult.details.contextRelevanceReason} | Heuristic: ${heuristicResult.details.contextRelevanceReason}`,
          faithfulnessReason: `LLM: ${llmResult.details.faithfulnessReason} | Heuristic: ${heuristicResult.details.faithfulnessReason}`,
          relevanceReason: `LLM: ${llmResult.details.relevanceReason} | Heuristic: ${heuristicResult.details.relevanceReason}`,
          precisionReason: `LLM: ${llmResult.details.precisionReason} | Heuristic: ${heuristicResult.details.precisionReason}`,
        },
        latencyMs: Date.now() - startTime,
      };
    }
  }

  return heuristicResult;
}

/**
 * Quick heuristic-only evaluation (no LLM calls, very fast).
 * Useful for real-time monitoring without latency overhead.
 */
export function evaluateRagQualitySync(input: EvaluationInput): Omit<RagEvaluationScores, "latencyMs"> {
  const precision = computeContextPrecision(input.query, input.chunks);
  const relevance = computeContextRelevance(input.query, input.chunks);
  const faithfulness = computeAnswerFaithfulness(input.answer, input.chunks);
  const answerRelevance = computeAnswerRelevance(input.query, input.answer);

  return {
    contextRelevance: relevance.score,
    answerFaithfulness: faithfulness.score,
    answerRelevance: answerRelevance.score,
    contextPrecision: precision.score,
    overall: Number(
      (relevance.score * 0.25 + faithfulness.score * 0.3 + answerRelevance.score * 0.25 + precision.score * 0.2).toFixed(3),
    ),
    details: {
      contextRelevanceReason: relevance.reason,
      faithfulnessReason: faithfulness.reason,
      relevanceReason: answerRelevance.reason,
      precisionReason: precision.reason,
    },
  };
}