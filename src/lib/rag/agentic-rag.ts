import type { SupabaseClient } from "@supabase/supabase-js";
import { generateWithFallback } from "@/lib/llm/router";
import { formatContext } from "./prompts";
import { retrieveRelevantChunks, type RetrievedChunk } from "./retrieval";

export type AgenticRagTrace = {
  enabled: boolean;
  queryRewriteEnabled?: boolean;
  rewrittenQuery: string;
  retrievalQueries: string[];
  hops: Array<{ query: string; returnedChunks: number }>;
  toolUse?: ToolUseTrace;
  collaborative?: CollaborativeRagTrace;
  reflection?: { used: boolean; issues: string[] };
};

export type RagToolName = "search_documents" | "summarize_document" | "compare_sources" | "inspect_citations";

export type ToolUseTrace = {
  selectedTools: RagToolName[];
  results: Array<{ tool: RagToolName; summary: string; sourceIndexes?: number[] }>;
};

export type CollaborativeRagTrace = {
  agents: Array<{ name: "retriever" | "evidence_critic" | "answer_writer" | "verifier"; ok: boolean; notes: string[] }>;
  finalIssues: string[];
};

const MAX_RETRIEVAL_QUERIES = 3;
const TOOL_NAMES: RagToolName[] = ["search_documents", "summarize_document", "compare_sources", "inspect_citations"];

function envFlagEnabled(name: string, defaultValue = true) {
  const value = process.env[name]?.toLowerCase();
  if (value === "false" || value === "0" || value === "off") return false;
  if (value === "true" || value === "1" || value === "on") return true;
  return defaultValue;
}

function parseJsonObject<T>(text: string, fallback: T): T {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return fallback;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return fallback;
  }
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  return values.map((value) => value.trim()).filter((value) => {
    const key = value.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeChunks(chunks: RetrievedChunk[], topK: number) {
  const merged = new Map<string, RetrievedChunk>();
  for (const chunk of chunks) {
    const existing = merged.get(chunk.chunkId);
    if (!existing || chunk.score > existing.score) merged.set(chunk.chunkId, chunk);
  }
  return Array.from(merged.values()).sort((a, b) => b.score - a.score).slice(0, topK);
}

function sourceMarker(index: number) {
  return `[${index + 1}]`;
}

function shortText(text: string, limit = 260) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > limit ? `${normalized.slice(0, limit - 3)}...` : normalized;
}

function chooseRuleBasedTools(question: string): RagToolName[] {
  const q = question.toLowerCase();
  const tools: RagToolName[] = ["search_documents"];
  if (/summari[sz]e|summary|overview|tóm\s*tắt|tổng\s*quan/iu.test(q)) tools.push("summarize_document");
  if (/compare|difference|vs\.?|versus|khác|so\s*sánh/iu.test(q)) tools.push("compare_sources");
  if (/cite|citation|source|nguồn|trích\s*dẫn/iu.test(q)) tools.push("inspect_citations");
  return tools;
}

async function chooseToolsWithAgent(question: string): Promise<RagToolName[]> {
  try {
    const result = await generateWithFallback({
      temperature: 0,
      maxTokens: 180,
      messages: [
        {
          role: "system",
          content: `You select private RAG tools. Return JSON only. Allowed tools: ${TOOL_NAMES.join(", ")}. Always include search_documents unless the user only asks about existing citations.`,
        },
        {
          role: "user",
          content: `Question: ${question}\nReturn JSON: {"tools":["search_documents"]}`,
        },
      ],
    });
    const parsed = parseJsonObject(result.content, { tools: chooseRuleBasedTools(question) as string[] });
    const selected = Array.isArray(parsed.tools) ? parsed.tools.filter((tool): tool is RagToolName => TOOL_NAMES.includes(tool as RagToolName)) : [];
    return uniqueStrings(["search_documents", ...selected]) as RagToolName[];
  } catch {
    return chooseRuleBasedTools(question);
  }
}

function runRagTool(tool: RagToolName, question: string, chunks: RetrievedChunk[]): ToolUseTrace["results"][number] {
  if (tool === "summarize_document") {
    const grouped = new Map<string, RetrievedChunk[]>();
    chunks.forEach((chunk) => grouped.set(chunk.documentId, [...(grouped.get(chunk.documentId) ?? []), chunk]));
    const summary = Array.from(grouped.values()).slice(0, 3).map((items) => {
      const first = items[0];
      return `${first.title}: ${items.slice(0, 3).map((chunk) => shortText(chunk.snippet || chunk.text, 140)).join(" | ")}`;
    }).join("\n");
    return { tool, summary: summary || "No document content available.", sourceIndexes: chunks.slice(0, 3).map((_, index) => index + 1) };
  }

  if (tool === "compare_sources") {
    const compared = chunks.slice(0, 4).map((chunk, index) => `${sourceMarker(index)} ${chunk.title}: ${shortText(chunk.snippet || chunk.text, 180)}`).join("\n");
    return { tool, summary: compared || "No sources available to compare.", sourceIndexes: chunks.slice(0, 4).map((_, index) => index + 1) };
  }

  if (tool === "inspect_citations") {
    const citationMap = chunks.slice(0, 8).map((chunk, index) => {
      const location = chunk.pageNumber ? `page ${chunk.pageNumber}` : chunk.url ?? chunk.sourceType;
      return `${sourceMarker(index)} ${chunk.title} (${location}) score=${chunk.score}`;
    }).join("\n");
    return { tool, summary: citationMap || "No citation candidates available.", sourceIndexes: chunks.slice(0, 8).map((_, index) => index + 1) };
  }

  const hits = chunks.slice(0, 5).map((chunk, index) => `${sourceMarker(index)} ${chunk.title}: ${shortText(chunk.snippet || chunk.text)}`).join("\n");
  return { tool, summary: `Search question: ${question}\n${hits}`, sourceIndexes: chunks.slice(0, 5).map((_, index) => index + 1) };
}

export async function runToolUseRagAgent(input: {
  question: string;
  chunks: RetrievedChunk[];
}): Promise<ToolUseTrace> {
  const selectedTools = await chooseToolsWithAgent(input.question);
  return {
    selectedTools,
    results: selectedTools.map((tool) => runRagTool(tool, input.question, input.chunks)),
  };
}

export async function rewriteQueryForRetrieval(question: string): Promise<{ rewrittenQuery: string; subQueries: string[] }> {
  try {
    const result = await generateWithFallback({
      temperature: 0,
      maxTokens: 260,
      messages: [
        {
          role: "system",
          content: "You rewrite user questions for private RAG retrieval. Return compact JSON only. Preserve language and named entities. Do not answer.",
        },
        {
          role: "user",
          content: `Question: ${question}\n\nReturn JSON shape: {"rewrittenQuery":"clear standalone search query","subQueries":["optional narrow retrieval query 1","optional narrow retrieval query 2"]}`,
        },
      ],
    });
    const parsed = parseJsonObject(result.content, { rewrittenQuery: question, subQueries: [] as string[] });
    return {
      rewrittenQuery: parsed.rewrittenQuery?.trim() || question,
      subQueries: Array.isArray(parsed.subQueries) ? parsed.subQueries.filter((item) => typeof item === "string") : [],
    };
  } catch {
    return { rewrittenQuery: question, subQueries: [] };
  }
}

export async function retrieveAgenticContext(input: {
  supabase: SupabaseClient;
  userId: string;
  question: string;
  topK?: number;
  documentIds?: string[];
}): Promise<{ chunks: RetrievedChunk[]; trace: AgenticRagTrace }> {
  const requestedTopK = input.topK ?? 5;
  const queryRewriteEnabled = envFlagEnabled("RAG_QUERY_REWRITE_ENABLED", true);
  const rewrite = queryRewriteEnabled ? await rewriteQueryForRetrieval(input.question) : { rewrittenQuery: input.question, subQueries: [] };
  const retrievalQueries = uniqueStrings([input.question, rewrite.rewrittenQuery, ...rewrite.subQueries]).slice(0, MAX_RETRIEVAL_QUERIES);
  const allChunks: RetrievedChunk[] = [];
  const hops: AgenticRagTrace["hops"] = [];

  for (const query of retrievalQueries) {
    const chunks = await retrieveRelevantChunks({
      supabase: input.supabase,
      userId: input.userId,
      query,
      topK: Math.max(requestedTopK, 5),
      documentIds: input.documentIds,
    });
    allChunks.push(...chunks);
    hops.push({ query, returnedChunks: chunks.length });
  }

  return {
    chunks: mergeChunks(allChunks, Math.max(requestedTopK, 5)),
    trace: {
      enabled: true,
      queryRewriteEnabled,
      rewrittenQuery: rewrite.rewrittenQuery,
      retrievalQueries,
      hops,
    },
  };
}

export async function reflectAndImproveAnswer(input: {
  question: string;
  answer: string;
  chunks: RetrievedChunk[];
}): Promise<{ answer: string; issues: string[]; used: boolean }> {
  try {
    const result = await generateWithFallback({
      temperature: 0,
      maxTokens: 900,
      messages: [
        {
          role: "system",
          content: "You are a strict RAG self-reflection agent. Check whether the draft answer is grounded in CONTEXT and has inline citations. If good, return the same answer. If not, rewrite it using only CONTEXT. Return JSON only.",
        },
        {
          role: "user",
          content: `CONTEXT:\n${formatContext(input.chunks)}\n\nQUESTION:\n${input.question}\n\nDRAFT ANSWER:\n${input.answer}\n\nReturn JSON: {"issues":["short issue labels"],"answer":"final grounded answer with citations"}`,
        },
      ],
    });
    const parsed = parseJsonObject(result.content, { issues: [] as string[], answer: input.answer });
    const issues = Array.isArray(parsed.issues) ? parsed.issues.filter((item) => typeof item === "string") : [];
    return { answer: parsed.answer?.trim() || input.answer, issues, used: true };
  } catch {
    return { answer: input.answer, issues: ["reflection_unavailable"], used: false };
  }
}

export async function runCollaborativeRagAgents(input: {
  question: string;
  draftAnswer: string;
  chunks: RetrievedChunk[];
  toolUse: ToolUseTrace;
  verifierEnabled?: boolean;
}): Promise<{ answer: string; trace: CollaborativeRagTrace }> {
  const trace: CollaborativeRagTrace = {
    agents: [
      { name: "retriever", ok: input.chunks.length > 0, notes: [`retrieved_chunks=${input.chunks.length}`, `tools=${input.toolUse.selectedTools.join(",")}`] },
    ],
    finalIssues: [],
  };

  const context = formatContext(input.chunks);
  const toolContext = input.toolUse.results.map((result) => `Tool: ${result.tool}\n${result.summary}`).join("\n\n");

  let criticNotes: string[] = [];
  try {
    const critic = await generateWithFallback({
      temperature: 0,
      maxTokens: 350,
      messages: [
        { role: "system", content: "You are the Evidence Critic Agent. Find missing evidence, weak citations, conflicts, and unsupported claims. Return JSON only." },
        { role: "user", content: `CONTEXT:\n${context}\n\nTOOLS:\n${toolContext}\n\nQUESTION:\n${input.question}\n\nDRAFT:\n${input.draftAnswer}\n\nReturn JSON: {"notes":["concise critique notes"]}` },
      ],
    });
    const parsed = parseJsonObject(critic.content, { notes: [] as string[] });
    criticNotes = Array.isArray(parsed.notes) ? parsed.notes.filter((note) => typeof note === "string") : [];
    trace.agents.push({ name: "evidence_critic", ok: true, notes: criticNotes });
  } catch {
    criticNotes = ["evidence_critic_unavailable"];
    trace.agents.push({ name: "evidence_critic", ok: false, notes: criticNotes });
  }

  let answer = input.draftAnswer;
  try {
    const writer = await generateWithFallback({
      temperature: 0.15,
      maxTokens: 950,
      messages: [
        { role: "system", content: "You are the Answer Writer Agent. Produce the best final answer using only CONTEXT and TOOL RESULTS. Answer in Vietnamese by default. Do not dump raw snippets. Synthesize them into a useful answer with the right shape: definition, prioritized actions, thematic summary, comparison table, or troubleshooting steps. Cite only the strongest claims inline with [1], [2]. Remove source boilerplate/noise. If evidence is partial, state what is known and what is missing instead of over-refusing." },
        { role: "user", content: `CONTEXT:\n${context}\n\nTOOL RESULTS:\n${toolContext}\n\nQUESTION:\n${input.question}\n\nCRITIC NOTES:\n${criticNotes.join("\n")}\n\nDRAFT ANSWER:\n${input.draftAnswer}` },
      ],
    });
    answer = writer.content.trim() || input.draftAnswer;
    trace.agents.push({ name: "answer_writer", ok: true, notes: ["final_answer_written"] });
  } catch {
    trace.agents.push({ name: "answer_writer", ok: false, notes: ["answer_writer_unavailable_using_draft"] });
  }

  if (input.verifierEnabled ?? true) {
    const verified = await reflectAndImproveAnswer({ question: input.question, answer, chunks: input.chunks });
    trace.agents.push({ name: "verifier", ok: verified.used, notes: verified.issues.length ? verified.issues : ["verified"] });
    trace.finalIssues = verified.issues;
    return { answer: verified.answer, trace };
  }

  trace.agents.push({ name: "verifier", ok: true, notes: ["skipped_by_config"] });
  return { answer, trace };
}