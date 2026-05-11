import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatGenerationMode, ChatSource } from "@/lib/api/types";
import { generateWithFallback, streamWithFallback } from "@/lib/llm/router";
import { chooseRuleBasedTools, reflectAndImproveAnswer, retrieveAgenticContext, runCollaborativeRagAgents, runRagTool, runToolUseRagAgent, type AgenticRagTrace, type RagToolName } from "./agentic-rag";
import { orchestrateContext, type ContextOrchestratorDiagnostics } from "./context-orchestrator";
import { detectAnswerMode, expandSectionChunks, extractRequirements, validateProcedureAnswer, type AnswerMode } from "./procedure-mode";
import { buildProcedureMessages, appendValidationWarnings } from "./procedure-prompts";
import { buildRagMessages, buildToolAugmentedRagMessages } from "./prompts";
import { retrieveRelevantChunks, type RetrievedChunk } from "./retrieval";

export type RagChatResult = {
  content: string;
  sources: ChatSource[];
  metadata: {
    provider: string;
    model: string;
    attempts: unknown[];
    diagnostics: {
      mode: ChatGenerationMode;
      requestedTopK: number;
      returnedChunks: number;
      scopedDocumentIds: string[];
      sourceTitles: string[];
      topScore?: number;
      agentic?: AgenticRagTrace;
      contextOrchestrator?: ContextOrchestratorDiagnostics;
    };
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

type DocumentSummarySection = {
  title: string;
  sentence: string;
  chunk: RetrievedChunk;
  sourceIndex: number;
  kind: "overview" | "requirements" | "deliverables" | "constraints" | "assessment" | "context";
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

function shouldUseAgenticRag() {
  return process.env.AGENTIC_RAG_ENABLED !== "false";
}

function envFlagEnabled(name: string, defaultValue = true) {
  const value = process.env[name]?.toLowerCase();
  if (value === "false" || value === "0" || value === "off") return false;
  if (value === "true" || value === "1" || value === "on") return true;
  return defaultValue;
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

function cleanSummaryText(text: string): string {
  return text
    .replace(/RMIT University\s*[–-]\s*/giu, "")
    .replace(/Confidential\s*[–-]\s*For RMIT Students Only\s*[–-]\s*Do not distribute/giu, "")
    .replace(/COSC2824\s*[–-]\s*Cloud Operations\s*[–-]\s*Assignment\s*2\s*\d*/giu, "")
    .replace(/Table of Contents\s*\d*\.?/giu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isLowValueSummaryText(text: string): boolean {
  const normalized = normalizeLocal(text);
  if (normalized.length < 45) return true;
  return [
    "confidential",
    "do not distribute",
    "table of contents",
    "rmit university school",
    "assignment 2 cloud operations project total",
  ].some((noise) => normalized.includes(noise));
}

function firstUsefulSentence(text: string): string | null {
  const candidates = splitSentences(cleanSummaryText(text));
  const sentence = candidates.find((item) => !isLowValueSummaryText(item)) ?? cleanSummaryText(text);
  if (!sentence || sentence.length < 20) return null;
  return sentence.length > 240 ? `${sentence.slice(0, 237).trim()}...` : sentence;
}

function formatPageCitation(chunk: RetrievedChunk, sourceIndex: number): string {
  return chunk.pageNumber ? `[${sourceIndex}, p. ${chunk.pageNumber}]` : `[${sourceIndex}]`;
}

function classifySummarySection(text: string): DocumentSummarySection["kind"] {
  const normalized = normalizeLocal(text);
  if (/deliverable|submit|submission|report|video|github|url|artifact|nộp|bài nộp/iu.test(normalized)) return "deliverables";
  if (/requirement|must|should|load balancer|vpc|database|budget|constraint|yêu cầu/iu.test(normalized)) return "requirements";
  if (/mark|rubric|criteria|assessment|grade|100 marks|điểm/iu.test(normalized)) return "assessment";
  if (/budget|deadline|limit|constraint|disable|50/iu.test(normalized)) return "constraints";
  if (/scenario|background|context|mom|pop|cafe|khách|bối cảnh/iu.test(normalized)) return "context";
  return "overview";
}

function buildDocumentSummarySections(chunks: RetrievedChunk[]): DocumentSummarySection[] {
  const sections: DocumentSummarySection[] = [];
  const seen = new Set<string>();
  for (const [index, chunk] of chunks.entries()) {
    const sentence = firstUsefulSentence(chunk.text);
    if (!sentence) continue;
    const key = meaningKey(sentence);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const kind = classifySummarySection(sentence);
    const titleByKind: Record<DocumentSummarySection["kind"], string> = {
      overview: "Tổng quan",
      requirements: "Yêu cầu kỹ thuật",
      deliverables: "Deliverables / phần cần nộp",
      constraints: "Ràng buộc cần chú ý",
      assessment: "Cách chấm điểm",
      context: "Bối cảnh dự án",
    };
    sections.push({ title: titleByKind[kind], sentence, chunk, sourceIndex: index + 1, kind });
  }
  const priority: DocumentSummarySection["kind"][] = ["context", "requirements", "deliverables", "constraints", "assessment", "overview"];
  return sections
    .sort((a, b) => priority.indexOf(a.kind) - priority.indexOf(b.kind) || a.sourceIndex - b.sourceIndex)
    .slice(0, 8);
}

function buildLocalDocumentSummary(chunks: RetrievedChunk[]): string {
  const sections = buildDocumentSummarySections(chunks);
  const docTitle = chunks[0]?.title ?? "document";
  const overview = sections.length > 0
    ? sections.map((section) => `- ${section.title}: ${section.sentence} ${formatPageCitation(section.chunk, section.sourceIndex)}`).join("\n")
    : chunks.slice(0, 6).map((chunk, index) => `- ${firstUsefulSentence(chunk.text) ?? chunk.snippet} ${formatPageCitation(chunk, index + 1)}`).join("\n");

  const actionItems = sections
    .filter((section) => ["requirements", "deliverables", "constraints", "assessment"].includes(section.kind))
    .slice(0, 5)
    .map((section, index) => `${index + 1}. ${section.kind === "deliverables" ? "Chuẩn bị phần nộp" : section.kind === "assessment" ? "Đối chiếu rubric/marks" : section.kind === "constraints" ? "Kiểm tra ràng buộc" : "Triển khai yêu cầu"}: ${section.sentence} ${formatPageCitation(section.chunk, section.sourceIndex)}`)
    .join("\n") || "1. Đọc các source được cite ngay trong từng bullet để xác định yêu cầu chính trước khi làm.";

  return `Tóm tắt tài liệu "${docTitle}":\n${overview}\n\nBạn cần làm gì:\n${actionItems}`;
}

function cite(group: EvidenceGroup): string {
  return group.sourceIndexes.slice(0, 3).map((index) => `[${index}]`).join("");
}

function claimText(group: EvidenceGroup): string {
  return group.mainClaim.replace(/\s+/g, " ").trim().replace(/[.;:]$/, "");
}

function quotedEvidenceText(group: EvidenceGroup, limit = 360): string {
  const text = cleanSummaryText(group.supportingSentences[0]?.text ?? group.mainClaim).replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit - 3).trim()}...` : text;
}

function quoteBlock(groups: EvidenceGroup[], limit = 5): string {
  const quotes = groups.slice(0, limit).map((group, index) => `${index + 1}. "${quotedEvidenceText(group)}" ${cite(group)}`);
  return quotes.length ? `\n\nTrích đoạn từ tài liệu:\n${quotes.join("\n")}` : "";
}

function comparisonCells(groups: EvidenceGroup[]): { left: string; right: string } {
  const claims = groups.map(claimText);
  return { left: claims[0] ?? "Not enough local evidence", right: claims[1] ?? claims[0] ?? "Not enough local evidence" };
}

function renderLocalSynthesis(query: string, intent: LocalIntent, plan: LocalAnswerPlan, confidence: LocalConfidence, groups: EvidenceGroup[]): string {
  void intent;
  if (confidence === "low") {
    const related = groups.slice(0, 3).map((group) => `- ${claimText(group)} ${cite(group)}`).join("\n") || "- Mình chưa thấy đoạn nào đủ sát để trả lời chắc chắn.";
    return `Mình chưa đủ dữ liệu để trả lời chắc chắn. Các đoạn gần nhất mình thấy là:\n${related}${quoteBlock(groups, 3)}\n\nBạn có thể hỏi cụ thể hơn hoặc upload thêm tài liệu có liên quan đến: ${expandLocalQuery(query).slice(0, 6).join(", ")}.`;
  }

  const top = groups.slice(0, plan.bulletCount);
  const limitation = confidence === "medium" ? "\n\nNote: confidence is medium, so this answer only states what the local documents directly support." : "";
  if (plan.format === "definition") {
    return `${claimText(top[0])} ${cite(top[0])}\n\nChi tiết chính:\n${top.slice(1).map((group) => `- ${claimText(group)} ${cite(group)}`).join("\n")}${quoteBlock(top)}${limitation}`;
  }
  if (plan.format === "steps") {
    return `Bạn có thể làm theo thứ tự này:\n${top.map((group, index) => `${index + 1}. ${claimText(group)} ${cite(group)}`).join("\n")}${quoteBlock(top)}${limitation}`;
  }
  if (plan.format === "troubleshooting") {
    return `Khả năng cao vấn đề nằm ở: ${claimText(top[0])} ${cite(top[0])}\n\nBạn thử:\n${top.slice(1).map((group, index) => `${index + 1}. ${claimText(group)} ${cite(group)}`).join("\n") || `1. Kiểm tra lại đoạn được trích ${cite(top[0])}`}${quoteBlock(top)}${limitation}`;
  }
  if (plan.format === "comparison_table") {
    const cells = comparisonCells(top);
    return `Local comparison from retrieved evidence:\n\n| Aspect | Option A | Option B | Evidence |\n| --- | --- | --- | --- |\n| Main difference | ${cells.left} | ${cells.right} | ${top.map(cite).join(" ")} |\n\nSummary: ${top.map(claimText).slice(0, 2).join(" Meanwhile, ")}.${quoteBlock(top)}${limitation}`;
  }
  if (plan.format === "summary") {
    return `Tóm tắt chi tiết:\n${top.map((group) => `- ${claimText(group)} ${cite(group)}`).join("\n")}\n\nĐiểm nên chú ý:\n${top.slice(0, 3).map((group, index) => `${index + 1}. ${claimText(group)} ${cite(group)}`).join("\n")}${quoteBlock(top)}${limitation}`;
  }
  return `Mình tìm thấy các ý chính sau:\n${top.map((group) => `- ${claimText(group)} ${cite(group)}`).join("\n")}\n\nDiễn giải thêm: các ý trên được rút trực tiếp từ những đoạn liên quan nhất trong tài liệu, nên bạn có thể dùng chúng làm base để viết câu trả lời hoặc checklist.${quoteBlock(top)}${limitation}`;
}

function sourceTransparency(chunks: RetrievedChunk[], groups: EvidenceGroup[], confidence: LocalConfidence): string {
  const selected = chunks.slice(0, 5).map((chunk, index) => {
    const matched = Array.from(new Set(groups.filter((group) => group.sourceIndexes.includes(index + 1)).flatMap((group) => group.matchedKeywords))).slice(0, 6);
    const location = chunk.pageNumber ? `p. ${chunk.pageNumber}` : chunk.url ?? chunk.sourceType;
    const why = matched.length > 0 ? `matched: ${matched.join(", ")}` : `được dùng làm ngữ cảnh`;
    return `[${index + 1}] ${chunk.title} (${location}) — ${why}`;
  }).join("\n");
  return `Ref đã dùng:\n${selected}\nMức tin cậy local: ${confidence}.`;
}

export function buildExtractiveAnswer(message: string, chunks: RetrievedChunk[]): string {
  if (detectLocalIntent(message) === "summary") {
    return buildLocalDocumentSummary(chunks);
  }

  const ranked = uniqueTopSentences(rankLocalSentences(message, chunks), 12);
  const evidenceGroups = groupEvidenceBySourceAndMeaning(ranked).slice(0, 6);
  const intent = detectLocalIntent(message);
  const topScore = ranked[0]?.score ?? 0;
  const confidence = calculateLocalConfidence(message, evidenceGroups, topScore);
  const plan = buildLocalAnswerPlan(message, intent, evidenceGroups);
  const answer = renderLocalSynthesis(message, intent, plan, confidence, evidenceGroups);
  return answer;
}

export async function runHybridRagChat(input: {
  supabase: SupabaseClient;
  userId: string;
  message: string;
  topK?: number;
  documentIds?: string[];
  mode?: ChatGenerationMode;
}): Promise<RagChatResult> {
  const agenticEnabled = shouldUseAgenticRag();
  const retrievalResult = agenticEnabled
    ? await retrieveAgenticContext({
      supabase: input.supabase,
      userId: input.userId,
      question: input.message,
      topK: input.topK,
      documentIds: input.documentIds,
    })
    : {
      chunks: await retrieveRelevantChunks({
        supabase: input.supabase,
        userId: input.userId,
        query: input.message,
        topK: input.topK,
        documentIds: input.documentIds,
      }),
      trace: undefined,
    };
  const contextOrchestrator = orchestrateContext({ query: input.message, chunks: retrievalResult.chunks });
  let chunks = contextOrchestrator.chunks;
  const chatMode = resolveRagChatMode(input.mode);

  // ── Procedure Mode Detection ──
  const answerMode: AnswerMode = detectAnswerMode(input.message);
  let procedureExpansion: Awaited<ReturnType<typeof expandSectionChunks>> | null = null;
  let procedureRequirements: ReturnType<typeof extractRequirements> | null = null;

  if (answerMode === "procedure") {
    try {
      procedureExpansion = await expandSectionChunks({
        supabase: input.supabase,
        userId: input.userId,
        originalChunks: chunks,
        documentIds: input.documentIds,
      });
      if (procedureExpansion.expanded) {
        chunks = procedureExpansion.sectionChunks;
        console.log(`[Procedure Mode] Expanded section "${procedureExpansion.sectionHeading}" → ${chunks.length} chunks`);
      }
      procedureRequirements = extractRequirements(chunks, procedureExpansion.sectionHeading);
    } catch (procError) {
      console.warn(`[Procedure Mode] Expansion failed (falling back to standard): ${procError instanceof Error ? procError.message : "unknown"}`);
    }
  }

  const sources = chunks.map(({ text: _text, ...source }) => source);
  const diagnostics = {
    mode: chatMode,
    requestedTopK: input.topK ?? 5,
    returnedChunks: chunks.length,
    scopedDocumentIds: input.documentIds ?? [],
    sourceTitles: Array.from(new Set(chunks.map((chunk) => chunk.title))).slice(0, 8),
    topScore: chunks[0]?.score,
    agentic: retrievalResult.trace,
    contextOrchestrator: contextOrchestrator.diagnostics,
  };

  if (chatMode === "local") {
    return {
      content: buildExtractiveAnswer(input.message, chunks),
      sources,
      metadata: {
        provider: "extractive",
        model: "local-retrieval-forced",
        diagnostics,
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
    const toolUseEnabled = agenticEnabled && envFlagEnabled("RAG_TOOL_USE_ENABLED", true);
    // Collaborative is OFF by default for speed — enable with RAG_COLLABORATIVE_ENABLED=true
    const collaborativeEnabled = agenticEnabled && envFlagEnabled("RAG_COLLABORATIVE_ENABLED", false);
    // Reflection is OFF by default for speed — enable with RAG_REFLECTION_ENABLED=true
    const reflectionEnabled = agenticEnabled && envFlagEnabled("RAG_REFLECTION_ENABLED", false);

    // Use fast rule-based tool selection (no LLM call) unless RAG_TOOL_USE_LLM=true
    const toolUseLlm = envFlagEnabled("RAG_TOOL_USE_LLM", false);
    const toolUse = toolUseEnabled
      ? (toolUseLlm
        ? await runToolUseRagAgent({ question: input.message, chunks })
        : (() => {
          const selectedTools = chooseRuleBasedTools(input.message);
          return {
            selectedTools,
            results: selectedTools.map((tool: RagToolName) => runRagTool(tool, input.message, chunks)),
          };
        })())
      : { selectedTools: [] as RagToolName[], results: [] as ReturnType<typeof runRagTool>[] };
    if (diagnostics.agentic) diagnostics.agentic.toolUse = toolUse;
    const toolResults = toolUse.results.map((result) => `Tool: ${result.tool}\n${result.summary}`).join("\n\n");

    // ── Choose prompt strategy based on answer mode ──
    const isProcedure = answerMode === "procedure" && procedureRequirements !== null;
    const messages = (isProcedure && procedureRequirements)
      ? buildProcedureMessages(input.message, chunks, procedureRequirements)
      : (toolResults ? buildToolAugmentedRagMessages(input.message, chunks, toolResults) : buildRagMessages(input.message, chunks));

    const llmResult = await generateWithFallback({
      messages,
      temperature: isProcedure ? 0.15 : 0.2,
      maxTokens: isProcedure ? 4000 : 2000,
    });

    const collaborative = collaborativeEnabled
      ? await runCollaborativeRagAgents({
        question: input.message,
        draftAnswer: llmResult.content,
        chunks,
        toolUse,
        verifierEnabled: reflectionEnabled,
      })
      : undefined;
    let finalAnswer = collaborative?.answer ?? (reflectionEnabled
      ? (await reflectAndImproveAnswer({ question: input.message, answer: llmResult.content, chunks })).answer
      : llmResult.content);

    // ── Procedure Mode: Self-validation ──
    if (isProcedure && procedureRequirements) {
      const validation = validateProcedureAnswer(finalAnswer, procedureRequirements);
      if (!validation.passed) {
        finalAnswer = appendValidationWarnings(finalAnswer, validation);
        console.log(`[Procedure Mode] Self-check found ${validation.issues.length} issues`);
      }
    }
    if (diagnostics.agentic) {
      if (collaborative) {
        diagnostics.agentic.collaborative = collaborative.trace;
        const verifier = collaborative.trace.agents.find((agent) => agent.name === "verifier");
        diagnostics.agentic.reflection = { used: verifier?.notes[0] !== "skipped_by_config", issues: collaborative.trace.finalIssues };
      } else if (reflectionEnabled) {
        diagnostics.agentic.reflection = { used: true, issues: [] };
      } else {
        diagnostics.agentic.reflection = { used: false, issues: ["skipped_by_config"] };
      }
    }

    return {
      content: finalAnswer,
      sources,
      metadata: {
        provider: llmResult.provider,
        model: llmResult.model,
        diagnostics,
        attempts: llmResult.attempts,
      },
    };
  } catch (error: unknown) {
    if (chatMode === "llm") {
      throw error;
    }

    return {
      content: buildExtractiveAnswer(input.message, chunks),
      sources,
      metadata: {
        provider: "extractive",
        model: "local-retrieval-fallback",
        diagnostics,
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

/**
 * Streaming RAG chat — retrieves context then streams LLM tokens via SSE.
 * Yields SSE-formatted events: sources, delta tokens, done.
 */
export async function* streamHybridRagChat(input: {
  supabase: SupabaseClient;
  userId: string;
  message: string;
  topK?: number;
  documentIds?: string[];
}): AsyncGenerator<string, void, unknown> {
  // 0. Emit retrieving status immediately so frontend shows progress
  yield `data: ${JSON.stringify({ type: "status", status: "retrieving" })}\n\n`;

  // 1. Retrieve context (non-streaming, fast)
  const agenticEnabled = shouldUseAgenticRag();
  const retrievalResult = agenticEnabled
    ? await retrieveAgenticContext({
      supabase: input.supabase,
      userId: input.userId,
      question: input.message,
      topK: input.topK,
      documentIds: input.documentIds,
    })
    : {
      chunks: await retrieveRelevantChunks({
        supabase: input.supabase,
        userId: input.userId,
        query: input.message,
        topK: input.topK,
        documentIds: input.documentIds,
      }),
      trace: undefined,
    };

  const contextOrchestrator = orchestrateContext({ query: input.message, chunks: retrievalResult.chunks });
  let chunks = contextOrchestrator.chunks;

  // ── Procedure Mode Detection (streaming) ──
  const answerMode = detectAnswerMode(input.message);
  let procedureRequirements: ReturnType<typeof extractRequirements> | null = null;

  if (answerMode === "procedure") {
    try {
      const expansion = await expandSectionChunks({
        supabase: input.supabase,
        userId: input.userId,
        originalChunks: chunks,
        documentIds: input.documentIds,
      });
      if (expansion.expanded) {
        chunks = expansion.sectionChunks;
        console.log(`[Procedure Mode/Stream] Expanded section "${expansion.sectionHeading}" → ${chunks.length} chunks`);
      }
      procedureRequirements = extractRequirements(chunks, expansion.sectionHeading);
    } catch {
      // Fall through to standard
    }
  }

  const sources = chunks.map(({ text: _text, ...source }) => source);

  // 2. Emit sources immediately so frontend can show them
  yield `data: ${JSON.stringify({ type: "sources", sources })}\n\n`;

  // 3. Build messages — procedure-specific or standard
  const isProcedure = answerMode === "procedure" && procedureRequirements !== null;
  let messages;

  if (isProcedure && procedureRequirements) {
    messages = buildProcedureMessages(input.message, chunks, procedureRequirements);
  } else {
    const toolUseEnabled = agenticEnabled && envFlagEnabled("RAG_TOOL_USE_ENABLED", true);
    const toolUse = toolUseEnabled
      ? (() => {
        const selectedTools = chooseRuleBasedTools(input.message);
        return {
          selectedTools,
          results: selectedTools.map((tool: RagToolName) => runRagTool(tool, input.message, chunks)),
        };
      })()
      : { selectedTools: [] as RagToolName[], results: [] as ReturnType<typeof runRagTool>[] };

    const toolResults = toolUse.results.map((r) => `Tool: ${r.tool}\n${r.summary}`).join("\n\n");
    messages = toolResults
      ? buildToolAugmentedRagMessages(input.message, chunks, toolResults)
      : buildRagMessages(input.message, chunks);
  }

  // 4. Stream LLM tokens
  let fullContent = "";
  try {
    for await (const chunk of streamWithFallback({ messages, temperature: isProcedure ? 0.15 : 0.2, maxTokens: isProcedure ? 4000 : 2000 })) {
      if (chunk.delta) {
        fullContent += chunk.delta;
        yield `data: ${JSON.stringify({ type: "delta", delta: chunk.delta })}\n\n`;
      }
      if (chunk.done) {
        yield `data: ${JSON.stringify({ type: "done", provider: chunk.provider, model: chunk.model })}\n\n`;
      }
    }
  } catch {
    // Fallback to extractive if streaming fails
    const extractive = buildExtractiveAnswer(input.message, chunks);
    yield `data: ${JSON.stringify({ type: "delta", delta: extractive })}\n\n`;
    yield `data: ${JSON.stringify({ type: "done", provider: "extractive", model: "local-fallback" })}\n\n`;
    fullContent = extractive;
  }

  // 5. Emit final content for persistence
  yield `data: ${JSON.stringify({ type: "complete", content: fullContent })}\n\n`;
}
