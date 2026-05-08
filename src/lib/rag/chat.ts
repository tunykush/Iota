import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatGenerationMode, ChatSource } from "@/lib/api/types";
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

export type LocalIntent =
  | "definition"
  | "how_to"
  | "comparison"
  | "troubleshooting"
  | "summary"
  | "list"
  | "citation_request"
  | "unknown";

export type LocalConfidence = "high" | "medium" | "low";

type EvidenceGroup = {
  mainClaim: string;
  supportingSentences: RankedSentence[];
  sourceIndexes: number[];
  confidenceScore: number;
  matchedKeywords: string[];
};

type LocalAnswerPlan = {
  format: "definition" | "steps" | "comparison_table" | "troubleshooting" | "summary" | "list" | "direct";
  bulletCount: number;
  includeSteps: boolean;
  includeComparisonTable: boolean;
  warnInsufficientEvidence: boolean;
  includeVerifiedLocally: boolean;
};

const LOCAL_STOP_WORDS = new Set([
  "the", "and", "for", "with", "this", "that", "what", "how", "are", "you", "a", "an", "to", "of", "in", "on", "is",
  "toi", "tôi", "la", "là", "gi", "gì", "cho", "cua", "của", "ve", "về", "nay", "này", "trong",
  "hãy", "hay", "nào", "như", "được", "không", "có", "các", "một", "những", "và", "hoặc", "thì",
]);

const INTENT_BOOSTS: Record<LocalIntent, string[]> = {
  definition: ["is", "refers", "means", "definition", "là", "nghĩa", "được hiểu là"],
  how_to: ["step", "first", "then", "configure", "install", "run", "setup", "implement", "guide", "cách"],
  comparison: ["whereas", "while", "different", "similar", "compared", "difference", "khác", "giống", "vs"],
  troubleshooting: ["error", "failed", "fix", "solution", "cause", "issue", "bug", "lỗi", "sửa"],
  summary: ["summary", "overview", "key", "main", "tóm tắt", "tổng quan"],
  list: ["include", "includes", "list", "types", "items", "những", "liệt kê"],
  citation_request: ["source", "citation", "reference", "cite", "nguồn", "tham khảo"],
  unknown: [],
};

const QUERY_EXPANSIONS: Array<[RegExp, string[]]> = [
  [/lỗi/iu, ["error", "bug", "issue", "failed"]],
  [/cách/iu, ["how", "steps", "guide"]],
  [/tóm\s*tắt/iu, ["summary", "overview"]],
  [/khác\s*gì/iu, ["difference", "compare"]],
  [/nguồn/iu, ["source", "citation", "reference"]],
  [/đăng\s*nhập/iu, ["login", "sign in", "auth"]],
  [/đăng\s*ký/iu, ["signup", "register"]],
  [/tải\s*lên/iu, ["upload"]],
  [/chấm\s*điểm/iu, ["grading", "assessment"]],
  [/rubric/iu, ["criteria", "marking guide"]],
];

type RankedSentence = {
  text: string;
  chunk: RetrievedChunk;
  chunkIndex: number;
  sentenceIndex: number;
  score: number;
  matchedKeywords: string[];
  exactPhraseMatch: boolean;
};

function getDefaultRagChatMode(): ChatGenerationMode {
  const mode = process.env.RAG_CHAT_MODE?.toLowerCase();
  return mode === "llm" || mode === "local" ? mode : "auto";
}

function resolveRagChatMode(mode?: ChatGenerationMode): ChatGenerationMode {
  return mode ?? getDefaultRagChatMode();
}

function normalizeLocal(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s\u00c0-\u1ef9_-]/gi, " ").replace(/\s+/g, " ").trim();
}

function tokenizeLocal(text: string): string[] {
  return normalizeLocal(text).split(/\s+/).filter((token) => token.length > 1 && !LOCAL_STOP_WORDS.has(token));
}

export function detectLocalIntent(query: string): LocalIntent {
  const q = query.toLowerCase();
  if (/\b(what is|define|definition)\b|là\s*gì/i.test(q)) return "definition";
  if (/\b(how to|setup|implement|configure|install)\b|làm\s*sao|\bcách\b/i.test(q)) return "how_to";
  if (/\b(compare|difference|different|vs\.?|versus)\b|khác\s*gì/i.test(q)) return "comparison";
  if (/\b(error|fix|failed|not working|bug|issue)\b|lỗi|không\s*hoạt\s*động/i.test(q)) return "troubleshooting";
  if (/\b(summarize|summary|overview)\b|tóm\s*tắt/i.test(q)) return "summary";
  if (/\b(list|which|what are)\b|liệt\s*kê|\bnhững\b/i.test(q)) return "list";
  if (/\b(cite|citation|reference|source)\b|\bnguồn\b/i.test(q)) return "citation_request";
  return "unknown";
}

export function expandLocalQuery(query: string): string[] {
  const variants = new Set<string>([normalizeLocal(query), ...tokenizeLocal(query)]);
  for (const [pattern, expansions] of QUERY_EXPANSIONS) {
    if (pattern.test(query)) expansions.forEach((term) => variants.add(term));
  }
  return Array.from(variants).filter(Boolean);
}

function splitSentences(text: string): string[] {
  return text.replace(/\s+/g, " ").split(/(?<=[.!?。！？])\s+|\n+/).map((sentence) => sentence.trim()).filter((sentence) => sentence.length >= 35 && sentence.length <= 650);
}

function acronymTokens(text: string): string[] {
  return (text.match(/\b[A-ZĐ]{2,}\b/g) ?? []).map((token) => token.toLowerCase());
}

function scoreSentence(sentence: string, query: string, expandedTerms: string[], intent: LocalIntent, chunk: RetrievedChunk, chunkIndex: number, sentenceIndex: number, allSentences: string[]): RankedSentence {
  const sentenceTokens = tokenizeLocal(sentence);
  const sentenceTokenSet = new Set(sentenceTokens);
  const titleTokens = new Set(tokenizeLocal(chunk.title));
  const normalizedSentence = normalizeLocal(sentence);
  const normalizedQuery = normalizeLocal(query);
  const queryTokens = tokenizeLocal(query);
  const queryAcronyms = acronymTokens(query);
  let score = 0;
  const matched = new Set<string>();

  for (const term of expandedTerms) {
    const normalizedTerm = normalizeLocal(term);
    if (!normalizedTerm) continue;
    const termTokens = tokenizeLocal(normalizedTerm);
    const phraseMatch = normalizedTerm.length > 3 && normalizedSentence.includes(normalizedTerm);
    const tokenMatch = termTokens.some((token) => sentenceTokenSet.has(token));
    if (phraseMatch || tokenMatch) {
      matched.add(term);
      score += phraseMatch ? 1.8 : 0.9;
    }
    if (termTokens.some((token) => titleTokens.has(token))) score += 0.6;
  }

  for (const token of queryTokens) {
    if (titleTokens.has(token)) score += 0.7;
    if (sentenceTokenSet.has(token) && token.length > 5) score += 0.5;
  }

  const exactPhraseMatch = normalizedQuery.length > 6 && normalizedSentence.includes(normalizedQuery);
  if (exactPhraseMatch) score += 4;

  const sentenceAcronyms = new Set(acronymTokens(sentence));
  for (const acronym of queryAcronyms) {
    if (sentenceAcronyms.has(acronym)) score += 2;
  }

  const nearby = [allSentences[sentenceIndex - 1], allSentences[sentenceIndex + 1]].filter(Boolean).join(" ");
  const nearbyTokens = new Set(tokenizeLocal(nearby));
  if (queryTokens.some((token) => nearbyTokens.has(token))) score += 0.8;

  for (const boost of INTENT_BOOSTS[intent]) {
    if (normalizedSentence.includes(normalizeLocal(boost))) score += 1.2;
  }

  const coverage = queryTokens.length ? queryTokens.filter((token) => sentenceTokenSet.has(token)).length / queryTokens.length : 0;
  const density = matched.size / Math.max(sentenceTokens.length, 12);
  score += coverage * 4 + density * 12 + Math.min(chunk.score, 10) * 0.4 - chunkIndex * 0.08;

  return { text: sentence, chunk, chunkIndex, sentenceIndex, score, matchedKeywords: Array.from(matched).slice(0, 8), exactPhraseMatch };
}

function rankLocalSentences(message: string, chunks: RetrievedChunk[]): RankedSentence[] {
  const intent = detectLocalIntent(message);
  const expandedTerms = expandLocalQuery(message);
  return chunks.flatMap((chunk, chunkIndex) => {
    const sentences = splitSentences(chunk.text);
    const candidates = sentences.length > 0 ? sentences : [chunk.snippet];
    return candidates.map((sentence, sentenceIndex) => scoreSentence(sentence, message, expandedTerms, intent, chunk, chunkIndex, sentenceIndex, candidates));
  }).filter((candidate) => candidate.score > 0).sort((a, b) => b.score - a.score);
}

function meaningKey(text: string): string {
  return tokenizeLocal(text).slice(0, 12).join(" ");
}

function uniqueTopSentences(candidates: RankedSentence[], limit: number): RankedSentence[] {
  const selected: RankedSentence[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const normalized = meaningKey(candidate.text);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    selected.push(candidate);
    if (selected.length >= limit) break;
  }
  return selected;
}

export function groupEvidenceBySourceAndMeaning(evidence: RankedSentence[]): EvidenceGroup[] {
  const groups: EvidenceGroup[] = [];
  for (const item of evidence) {
    const itemTokens = new Set(tokenizeLocal(item.text));
    const existing = groups.find((group) => {
      const groupTokens = new Set(tokenizeLocal(group.mainClaim));
      const overlap = Array.from(itemTokens).filter((token) => groupTokens.has(token)).length;
      return item.chunk.chunkId === group.supportingSentences[0]?.chunk.chunkId || overlap / Math.max(itemTokens.size, 1) >= 0.45;
    });
    const sourceIndex = item.chunkIndex + 1;
    if (existing) {
      existing.supportingSentences.push(item);
      if (!existing.sourceIndexes.includes(sourceIndex)) existing.sourceIndexes.push(sourceIndex);
      existing.confidenceScore = Math.max(existing.confidenceScore, item.score);
      existing.matchedKeywords = Array.from(new Set([...existing.matchedKeywords, ...item.matchedKeywords])).slice(0, 8);
    } else {
      groups.push({ mainClaim: item.text, supportingSentences: [item], sourceIndexes: [sourceIndex], confidenceScore: item.score, matchedKeywords: item.matchedKeywords });
    }
  }
  return groups.sort((a, b) => b.confidenceScore - a.confidenceScore);
}

export function buildLocalAnswerPlan(query: string, intent: LocalIntent, evidenceGroups: EvidenceGroup[]): LocalAnswerPlan {
  const weak = evidenceGroups.length === 0 || evidenceGroups[0].confidenceScore < 4;
  const base = { bulletCount: Math.min(Math.max(evidenceGroups.length, 3), 5), warnInsufficientEvidence: weak, includeVerifiedLocally: true };
  if (intent === "definition") return { ...base, format: "definition", includeSteps: false, includeComparisonTable: false };
  if (intent === "how_to") return { ...base, format: "steps", includeSteps: true, includeComparisonTable: false };
  if (intent === "comparison") return { ...base, format: "comparison_table", includeSteps: false, includeComparisonTable: true };
  if (intent === "troubleshooting") return { ...base, format: "troubleshooting", includeSteps: true, includeComparisonTable: false };
  if (intent === "summary") return { ...base, format: "summary", includeSteps: false, includeComparisonTable: false };
  if (intent === "list" || intent === "citation_request") return { ...base, format: "list", includeSteps: false, includeComparisonTable: false };
  return { ...base, format: "direct", includeSteps: false, includeComparisonTable: false };
}

export function calculateLocalConfidence(query: string, evidenceGroups: EvidenceGroup[], topScore: number): LocalConfidence {
  if (evidenceGroups.length === 0) return "low";
  const avg = evidenceGroups.reduce((sum, group) => sum + group.confidenceScore, 0) / evidenceGroups.length;
  const sourceDiversity = new Set(evidenceGroups.flatMap((group) => group.sourceIndexes)).size;
  const queryTokens = new Set(tokenizeLocal(query));
  const matched = new Set(evidenceGroups.flatMap((group) => group.matchedKeywords.flatMap(tokenizeLocal)));
  const coverage = queryTokens.size ? Array.from(queryTokens).filter((token) => matched.has(token)).length / queryTokens.size : 0;
  const exactPhrase = evidenceGroups.some((group) => group.supportingSentences.some((sentence) => sentence.exactPhraseMatch));
  if ((topScore >= 9 || exactPhrase) && avg >= 6 && sourceDiversity >= 1 && coverage >= 0.45) return "high";
  if (topScore >= 4.5 && avg >= 3.5 && coverage >= 0.25) return "medium";
  return "low";
}

function cite(group: EvidenceGroup): string {
  return group.sourceIndexes.slice(0, 3).map((index) => `[${index}]`).join("");
}

function claimText(group: EvidenceGroup): string {
  return group.mainClaim.replace(/\s+/g, " ").trim().replace(/[.;:]$/, "");
}

function comparisonCells(groups: EvidenceGroup[]): { left: string; right: string } {
  const claims = groups.map(claimText);
  return { left: claims[0] ?? "Not enough local evidence", right: claims[1] ?? claims[0] ?? "Not enough local evidence" };
}

function renderLocalSynthesis(query: string, intent: LocalIntent, plan: LocalAnswerPlan, confidence: LocalConfidence, groups: EvidenceGroup[]): string {
  void intent;
  if (confidence === "low") {
    const related = groups.slice(0, 3).map((group) => `- ${claimText(group)} ${cite(group)}`).join("\n") || "- Không có đoạn nào đủ mạnh để xác minh trực tiếp.";
    return `Local fallback found related information, but not enough evidence to answer confidently.\n\nRelated findings:\n${related}\n\nBạn nên upload/search thêm tài liệu có keyword gần với: ${expandLocalQuery(query).slice(0, 8).join(", ")}. Local fallback không thể suy luận vượt quá text đã retrieve.`;
  }

  const top = groups.slice(0, plan.bulletCount);
  const limitation = confidence === "medium" ? "\n\nNote: confidence is medium, so this answer only states what the local documents directly support." : "";
  if (plan.format === "definition") {
    return `Based on the local documents, ${claimText(top[0])} ${cite(top[0])}\n\nKey details:\n${top.slice(1).map((group) => `- ${claimText(group)} ${cite(group)}`).join("\n")}${limitation}`;
  }
  if (plan.format === "steps") {
    return `Locally, the safest flow is:\n${top.map((group, index) => `${index + 1}. ${claimText(group)} ${cite(group)}`).join("\n")}\n\nThis is based only on the retrieved local evidence.${limitation}`;
  }
  if (plan.format === "troubleshooting") {
    return `The likely issue is: ${claimText(top[0])} ${cite(top[0])}\n\nTry:\n${top.slice(1).map((group, index) => `${index + 1}. ${claimText(group)} ${cite(group)}`).join("\n") || `1. Check the cited source details ${cite(top[0])}`}\n\nLocal fallback cannot infer causes beyond the retrieved notes.${limitation}`;
  }
  if (plan.format === "comparison_table") {
    const cells = comparisonCells(top);
    return `Local comparison from retrieved evidence:\n\n| Aspect | Option A | Option B | Evidence |\n| --- | --- | --- | --- |\n| Main difference | ${cells.left} | ${cells.right} | ${top.map(cite).join(" ")} |\n\nSummary: ${top.map(claimText).slice(0, 2).join(" Meanwhile, ")}.${limitation}`;
  }
  if (plan.format === "summary") {
    return `Concise local summary:\n${top.map((group) => `- ${claimText(group)} ${cite(group)}`).join("\n")}${limitation}`;
  }
  return `Direct local answer:\n${top.map((group) => `- ${claimText(group)} ${cite(group)}`).join("\n")}${limitation}`;
}

function sourceTransparency(chunks: RetrievedChunk[], groups: EvidenceGroup[], confidence: LocalConfidence): string {
  const selected = chunks.slice(0, 3).map((chunk, index) => {
    const matched = Array.from(new Set(groups.filter((group) => group.sourceIndexes.includes(index + 1)).flatMap((group) => group.matchedKeywords))).slice(0, 6);
    const location = chunk.pageNumber ? `p. ${chunk.pageNumber}` : chunk.url ?? chunk.sourceType;
    const why = matched.length > 0 ? `matched: ${matched.join(", ")}` : `retrieval score: ${chunk.score.toFixed(2)}`;
    return `[${index + 1}] ${chunk.title} (${location}) — ${why} — confidence: ${confidence}`;
  }).join("\n");
  return `Nguồn ưu tiên:\n${selected}`;
}

export function buildExtractiveAnswer(message: string, chunks: RetrievedChunk[]): string {
  const ranked = uniqueTopSentences(rankLocalSentences(message, chunks), 12);
  const evidenceGroups = groupEvidenceBySourceAndMeaning(ranked).slice(0, 6);
  const intent = detectLocalIntent(message);
  const topScore = ranked[0]?.score ?? 0;
  const confidence = calculateLocalConfidence(message, evidenceGroups, topScore);
  const plan = buildLocalAnswerPlan(message, intent, evidenceGroups);
  const answer = renderLocalSynthesis(message, intent, plan, confidence, evidenceGroups);
  const verified = plan.includeVerifiedLocally && confidence !== "low"
    ? `\n\nWhat I could verify locally: ${evidenceGroups.slice(0, 3).map((group) => claimText(group)).join("; ")}.`
    : "";
  return `${answer}${verified}\n\n${sourceTransparency(chunks, evidenceGroups, confidence)}`;
}

export async function runHybridRagChat(input: {
  supabase: SupabaseClient;
  userId: string;
  message: string;
  topK?: number;
  documentIds?: string[];
  mode?: ChatGenerationMode;
}): Promise<RagChatResult> {
  const chunks = await retrieveRelevantChunks({
    supabase: input.supabase,
    userId: input.userId,
    query: input.message,
    topK: input.topK,
    documentIds: input.documentIds,
  });
  const sources = chunks.map(({ text: _text, ...source }) => source);
  const chatMode = resolveRagChatMode(input.mode);

  if (chatMode === "local") {
    return {
      content: buildExtractiveAnswer(input.message, chunks),
      sources,
      metadata: {
        provider: "extractive",
        model: "local-retrieval-forced",
        attempts: [
          {
            provider: "extractive",
            model: "local-retrieval-forced",
            ok: true,
            latencyMs: 0,
          },
        ],
      },
    };
  }

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
    if (chatMode === "llm") {
      throw error;
    }

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
