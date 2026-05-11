/**
 * Procedure Mode — Deep task-oriented answer generation for technical assignment PDFs.
 *
 * When a user asks "step by step", "how to do this", "từng bước", etc., this module:
 * 1. Detects the query intent as "procedure"
 * 2. Identifies the closest assignment section heading (e.g. "6.3 Task C3: Amazon S3")
 * 3. Expands retrieval to fetch ALL chunks from that section (not just topK)
 * 4. Extracts structured requirements (goal, constraints, commands, deliverables, etc.)
 * 5. Generates an ordered procedure answer via a specialized LLM prompt
 *
 * Works for any assignment structure: Part A, B, C, D, E, Task A1, B2, C3, etc.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { RetrievedChunk } from "./retrieval";

// ── Types ──────────────────────────────────────────────────────────────────

export type AnswerMode = "procedure" | "summary" | "lookup" | "comparison";

export type ExtractedRequirements = {
  taskTitle: string | null;
  goal: string | null;
  constraints: string[];
  requiredResources: string[];
  requiredCommands: string[];
  requiredFiles: string[];
  requiredScreenshots: string[];
  verificationSteps: string[];
  notes: string[];
  deliverables: string[];
};

export type SectionExpansionResult = {
  sectionHeading: string | null;
  sectionChunks: RetrievedChunk[];
  originalChunks: RetrievedChunk[];
  expanded: boolean;
};

// ── 1. Query Intent Detection ──────────────────────────────────────────────

const PROCEDURE_PATTERNS = [
  /\btừng\s*bước\b/iu,
  /\bstep\s*by\s*step\b/iu,
  /\blàm\s*sao\s*làm\b/iu,
  /\bhướng\s*dẫn\s*làm\b/iu,
  /\bchỉ\s*(tôi|mình)\s*làm\b/iu,
  /\bđể\s*(tôi|mình)\s*có\s*thể\s*làm\b/iu,
  /\bcommands?\b/iu,
  /\blệnh\b/iu,
  /\bsetup\b/iu,
  /\bhow\s+(do\s+i|to|can\s+i)\s+(do|complete|implement|set\s*up|configure|create|build|deploy)\b/iu,
  /\bwalk\s*me\s*through\b/iu,
  /\bimplement(ation)?\s*(steps|guide)?\b/iu,
  /\bcli\s*(commands?|steps?)\b/iu,
  /\blàm\s*thế\s*nào\b/iu,
  /\bcách\s*(làm|thực\s*hiện|triển\s*khai|cài\s*đặt|tạo)\b/iu,
  /\bthực\s*hiện\s*(như\s*thế\s*nào|ra\s*sao)\b/iu,
  /\bguide\s*me\b/iu,
  /\btutorial\b/iu,
];

const SUMMARY_PATTERNS = [
  /\b(summarize|summary|overview|explain|describe)\b/iu,
  /\b(tóm\s*tắt|tổng\s*quan|giải\s*thích|mô\s*tả)\b/iu,
  /\bwhat\s+is\b/iu,
  /\blà\s*gì\b/iu,
];

const COMPARISON_PATTERNS = [
  /\b(compare|comparison|difference|versus|vs\.?)\b/iu,
  /\b(khác\s*(gì|nhau)|so\s*sánh)\b/iu,
];

export function detectAnswerMode(query: string): AnswerMode {
  // Procedure takes priority — it's the most specific intent
  if (PROCEDURE_PATTERNS.some((p) => p.test(query))) return "procedure";
  if (COMPARISON_PATTERNS.some((p) => p.test(query))) return "comparison";
  if (SUMMARY_PATTERNS.some((p) => p.test(query))) return "summary";
  return "lookup";
}

// ── 2. Section Heading Detection ───────────────────────────────────────────

/**
 * Assignment section heading patterns — matches headings like:
 * - "6.3 Task C3: Amazon S3 – Static Website Hosting"
 * - "5.1 Task B1: VPC Setup"
 * - "Part A: Networking"
 * - "4.3 Task A2"
 * - "Task 1: ..."
 */
const SECTION_HEADING_PATTERNS = [
  // "6.3 Task C3: Title" or "5.1 Task B1"
  /(\d+(?:\.\d+)*)\s+Task\s+[A-Z]\d+[:\s\-–—].*/i,
  /(\d+(?:\.\d+)*)\s+Task\s+[A-Z]\d+/i,
  // "Part A: Title" or "Part B"
  /Part\s+[A-Z][:\s\-–—].*/i,
  /Part\s+[A-Z]\b/i,
  // "Task 1: Title" or "Task A1: Title"
  /Task\s+[A-Z]?\d+[:\s\-–—].*/i,
  // Generic numbered section: "6.3 Title"
  /^\d+\.\d+\s+[A-Z].*/,
  // Vietnamese: "Phần A:", "Bài tập C3:"
  /Phần\s+[A-Z][:\s\-–—].*/iu,
  /Bài\s*tập\s+[A-Z]?\d*[:\s\-–—].*/iu,
];

/**
 * Extract the section heading from a chunk's text.
 * Returns the heading line if found, null otherwise.
 */
function extractSectionHeading(text: string): string | null {
  const lines = text.split("\n").slice(0, 5); // Check first 5 lines
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 200) continue;
    for (const pattern of SECTION_HEADING_PATTERNS) {
      if (pattern.test(trimmed)) return trimmed;
    }
  }
  return null;
}

/**
 * Find the best matching section heading from the retrieved chunks.
 * Prioritizes chunks with higher scores that contain section headings.
 */
function findBestSectionHeading(chunks: RetrievedChunk[]): string | null {
  // Sort by score descending — top chunks are most relevant
  const sorted = [...chunks].sort((a, b) => b.score - a.score);

  for (const chunk of sorted) {
    const heading = extractSectionHeading(chunk.text);
    if (heading) return heading;
  }

  // Fallback: look for task references in chunk text
  for (const chunk of sorted) {
    const taskMatch = chunk.text.match(/Task\s+[A-Z]\d+[:\s\-–—][^\n]*/i);
    if (taskMatch) return taskMatch[0].trim();
  }

  return null;
}

// ── 3. Section-Level Chunk Expansion ───────────────────────────────────────

/**
 * Expand retrieval to get ALL chunks from the identified section.
 * Uses the section heading to find the section boundaries, then fetches
 * all chunks between the heading and the next same-level heading.
 */
export async function expandSectionChunks(input: {
  supabase: SupabaseClient;
  userId: string;
  originalChunks: RetrievedChunk[];
  documentIds?: string[];
}): Promise<SectionExpansionResult> {
  const { supabase, userId, originalChunks, documentIds } = input;

  const sectionHeading = findBestSectionHeading(originalChunks);
  if (!sectionHeading) {
    return { sectionHeading: null, sectionChunks: originalChunks, originalChunks, expanded: false };
  }

  // Find the chunk that contains this heading
  const headingChunk = originalChunks.find((c) => c.text.includes(sectionHeading));
  if (!headingChunk) {
    return { sectionHeading, sectionChunks: originalChunks, originalChunks, expanded: false };
  }

  // Get the document ID and chunk index of the heading chunk
  const docId = headingChunk.documentId;

  // Fetch all chunks from this document, ordered by chunk_index
  let query = supabase
    .from("document_chunks")
    .select("id, document_id, chunk_index, text, source_type, page_number, url, metadata, token_count, chunk_type, chapter_number, position_in_book")
    .eq("user_id", userId)
    .eq("document_id", docId)
    .order("chunk_index", { ascending: true });

  if (documentIds?.length) {
    query = query.in("document_id", documentIds);
  }

  const { data: allChunks, error } = await query;
  if (error || !allChunks || allChunks.length === 0) {
    return { sectionHeading, sectionChunks: originalChunks, originalChunks, expanded: false };
  }

  // Find the heading chunk index
  const headingIdx = allChunks.findIndex((c) => c.text.includes(sectionHeading));
  if (headingIdx === -1) {
    return { sectionHeading, sectionChunks: originalChunks, originalChunks, expanded: false };
  }

  // Determine the heading "level" from the section number (e.g., "6.3" → depth 2)
  const depthMatch = sectionHeading.match(/^(\d+(?:\.\d+)*)/);
  const headingDepth = depthMatch ? depthMatch[1].split(".").length : 1;

  // Scan forward until we hit the next same-level or higher-level heading
  let endIdx = allChunks.length;
  for (let i = headingIdx + 1; i < allChunks.length; i++) {
    const nextHeading = extractSectionHeading(allChunks[i].text);
    if (nextHeading) {
      const nextDepthMatch = nextHeading.match(/^(\d+(?:\.\d+)*)/);
      const nextDepth = nextDepthMatch ? nextDepthMatch[1].split(".").length : 1;
      if (nextDepth <= headingDepth) {
        endIdx = i;
        break;
      }
    }
  }

  // Cap at 30 chunks to avoid overwhelming the context
  const maxSectionChunks = 30;
  const sectionSlice = allChunks.slice(headingIdx, Math.min(endIdx, headingIdx + maxSectionChunks));

  // Get the document title from the first original chunk
  const docTitle = originalChunks[0]?.title ?? "Untitled";

  // Convert DB rows to RetrievedChunk format
  const sectionChunks: RetrievedChunk[] = sectionSlice.map((row, idx) => ({
    documentId: row.document_id,
    chunkId: row.id,
    title: docTitle,
    sourceType: (row.source_type ?? "pdf") as "pdf" | "website" | "database",
    pageNumber: row.page_number ?? undefined,
    url: row.url ?? undefined,
    score: 1.0 - idx * 0.01, // Preserve document order with decreasing scores
    snippet: row.text.slice(0, 360),
    text: row.text,
  }));

  // Also include any original chunks that aren't in the section (from other documents)
  const sectionChunkIds = new Set(sectionChunks.map((c) => c.chunkId));
  const otherDocChunks = originalChunks.filter((c) => c.documentId !== docId && !sectionChunkIds.has(c.chunkId));

  return {
    sectionHeading,
    sectionChunks: [...sectionChunks, ...otherDocChunks],
    originalChunks,
    expanded: true,
  };
}

// ── 4. Requirement Extraction ──────────────────────────────────────────────

/**
 * Extract structured requirements from the section text.
 * This is a regex/heuristic-based extraction — no LLM call needed.
 */
export function extractRequirements(chunks: RetrievedChunk[], sectionHeading: string | null): ExtractedRequirements {
  const fullText = chunks.map((c) => c.text).join("\n\n");
  const lines = fullText.split("\n").map((l) => l.trim()).filter(Boolean);

  const result: ExtractedRequirements = {
    taskTitle: sectionHeading,
    goal: null,
    constraints: [],
    requiredResources: [],
    requiredCommands: [],
    requiredFiles: [],
    requiredScreenshots: [],
    verificationSteps: [],
    notes: [],
    deliverables: [],
  };

  // ── Goal extraction ──
  const goalPatterns = [
    /(?:goal|objective|purpose|aim|you\s+(?:will|need\s+to|must|should)|in\s+this\s+task)[:\s]+(.+)/i,
    /(?:mục\s*tiêu|yêu\s*cầu\s*chính|bạn\s*(?:sẽ|cần|phải))[:\s]+(.+)/iu,
  ];
  for (const line of lines) {
    for (const pattern of goalPatterns) {
      const match = line.match(pattern);
      if (match && !result.goal) {
        result.goal = match[1].trim();
      }
    }
  }

  // ── Constraint extraction ──
  const constraintPatterns = [
    /(?:must\s+(?:use|only|not)|do\s+not|cannot|only\s+use|restriction|constraint|cli\s+only|console\s+only|not\s+allowed)/i,
    /(?:không\s*được|chỉ\s*dùng|bắt\s*buộc|ràng\s*buộc|hạn\s*chế)/iu,
    /(?:you\s+are\s+(?:not\s+allowed|required|expected)\s+to)/i,
    /(?:aws\s+cli\s+only|using\s+(?:only\s+)?the\s+cli)/i,
  ];
  for (const line of lines) {
    if (constraintPatterns.some((p) => p.test(line))) {
      result.constraints.push(line);
    }
  }

  // ── AWS resource names ──
  const resourcePatterns = [
    /\b(s3:\/\/[\w\-./]+)/gi,
    /\b(arn:aws:[a-z0-9\-:\/.*]+)/gi,
    /\b(vpc-\w+|subnet-\w+|sg-\w+|igw-\w+|rtb-\w+|i-\w+|ami-\w+)/gi,
    /\b([\w-]+-bucket|[\w-]+-table|[\w-]+-function|[\w-]+-role|[\w-]+-policy)\b/gi,
    /\b(us-east-1|us-west-2|ap-southeast-2|eu-west-1|ap-northeast-1)\b/g,
  ];
  for (const line of lines) {
    for (const pattern of resourcePatterns) {
      const matches = line.match(pattern);
      if (matches) result.requiredResources.push(...matches);
    }
  }
  result.requiredResources = [...new Set(result.requiredResources)];

  // ── Command extraction ──
  const commandPatterns = [
    /\b(aws\s+\S+(?:\s+\S+){0,15})/g,
    /\b(docker\s+\S+(?:\s+\S+){0,10})/g,
    /\b(kubectl\s+\S+(?:\s+\S+){0,10})/g,
    /\b(terraform\s+\S+(?:\s+\S+){0,5})/g,
    /\b(npm\s+\S+(?:\s+\S+){0,5})/g,
    /\b(pip\s+\S+(?:\s+\S+){0,5})/g,
    /\b(curl\s+\S+(?:\s+\S+){0,10})/g,
    /\b(ssh\s+\S+(?:\s+\S+){0,5})/g,
  ];
  for (const line of lines) {
    for (const pattern of commandPatterns) {
      const matches = line.match(pattern);
      if (matches) {
        for (const m of matches) {
          if (m.length > 10) result.requiredCommands.push(m.trim());
        }
      }
    }
  }
  result.requiredCommands = [...new Set(result.requiredCommands)];

  // ── Required files ──
  const filePatterns = [
    /\b(cli_commands_part[A-Z]\.txt)\b/gi,
    /\b([\w-]+\.(txt|json|yaml|yml|csv|sh|py|js|ts|html|css|md|pdf|png|jpg|jpeg|gif|zip))\b/gi,
    /\b(index\.html|error\.html|style\.css|script\.js)\b/gi,
  ];
  for (const line of lines) {
    for (const pattern of filePatterns) {
      const matches = line.match(pattern);
      if (matches) result.requiredFiles.push(...matches);
    }
  }
  result.requiredFiles = [...new Set(result.requiredFiles)];

  // ── Screenshots ──
  const screenshotPatterns = [
    /screenshot[s]?\s*(?:of|showing|for|:)\s*(.+)/i,
    /(?:take|capture|include)\s+(?:a\s+)?screenshot/i,
    /(?:chụp\s*(?:màn\s*hình|ảnh))\s*(.+)/iu,
  ];
  for (const line of lines) {
    if (screenshotPatterns.some((p) => p.test(line))) {
      result.requiredScreenshots.push(line);
    }
  }

  // ── Verification steps ──
  const verifyPatterns = [
    /(?:verify|confirm|check|test|validate|ensure)\s+(?:that\s+)?(.+)/i,
    /(?:kiểm\s*tra|xác\s*nhận|đảm\s*bảo)\s+(.+)/iu,
    /(?:should\s+(?:see|show|display|return|output))\s+(.+)/i,
  ];
  for (const line of lines) {
    if (verifyPatterns.some((p) => p.test(line))) {
      result.verificationSteps.push(line);
    }
  }

  // ── Notes/warnings ──
  const notePatterns = [
    /(?:note|warning|important|caution|tip|hint)[:\s]+(.+)/i,
    /(?:lưu\s*ý|cảnh\s*báo|quan\s*trọng|gợi\s*ý)[:\s]+(.+)/iu,
    /(?:⚠|⚡|💡|📝|🔴|🟡)\s*(.+)/,
  ];
  for (const line of lines) {
    if (notePatterns.some((p) => p.test(line))) {
      result.notes.push(line);
    }
  }

  // ── Deliverables ──
  const deliverablePatterns = [
    /(?:deliverable|submit|submission|hand\s*in|turn\s*in|upload)[s]?\s*[:\-–]\s*(.+)/i,
    /(?:nộp|giao\s*nộp|bài\s*nộp)[:\s]+(.+)/iu,
    /(?:you\s+(?:must|need\s+to|should)\s+(?:submit|provide|include))\s+(.+)/i,
    /(?:required\s+(?:output|submission|deliverable)s?)[:\s]+(.+)/i,
  ];
  for (const line of lines) {
    if (deliverablePatterns.some((p) => p.test(line))) {
      result.deliverables.push(line);
    }
  }

  // Also check for file deliverables
  if (result.requiredFiles.length > 0 && result.deliverables.length === 0) {
    result.deliverables.push(`Required files: ${result.requiredFiles.join(", ")}`);
  }

  return result;
}

// ── 5. Self-Validation ─────────────────────────────────────────────────────

export type ValidationResult = {
  passed: boolean;
  issues: string[];
};

/**
 * Validate that the generated answer covers all extracted requirements.
 * Returns issues that should be appended as warnings.
 */
export function validateProcedureAnswer(answer: string, requirements: ExtractedRequirements): ValidationResult {
  const issues: string[] = [];
  const lowerAnswer = answer.toLowerCase();

  // Check constraints mentioned
  for (const constraint of requirements.constraints) {
    const keywords = constraint.toLowerCase().split(/\s+/).filter((w) => w.length > 4).slice(0, 3);
    const mentioned = keywords.some((kw) => lowerAnswer.includes(kw));
    if (!mentioned) {
      issues.push(`Constraint may be missing: "${constraint.slice(0, 80)}..."`);
    }
  }

  // Check deliverables mentioned
  for (const deliverable of requirements.deliverables) {
    const keywords = deliverable.toLowerCase().split(/\s+/).filter((w) => w.length > 4).slice(0, 3);
    const mentioned = keywords.some((kw) => lowerAnswer.includes(kw));
    if (!mentioned) {
      issues.push(`Deliverable may be missing: "${deliverable.slice(0, 80)}..."`);
    }
  }

  // Check required files mentioned
  for (const file of requirements.requiredFiles) {
    if (!lowerAnswer.includes(file.toLowerCase())) {
      issues.push(`Required file not mentioned: ${file}`);
    }
  }

  // Check task section referenced
  if (requirements.taskTitle && !lowerAnswer.includes(requirements.taskTitle.slice(0, 20).toLowerCase())) {
    issues.push(`Task section not referenced: ${requirements.taskTitle}`);
  }

  return { passed: issues.length === 0, issues };
}
