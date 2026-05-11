/**
 * Procedure-Specific LLM Prompts — Generates structured, task-oriented answers.
 *
 * When procedure mode is detected, this replaces the standard RAG prompt with
 * a specialized prompt that forces the LLM to produce ordered, complete answers
 * covering all requirements, constraints, commands, and deliverables.
 */

import type { LlmMessage } from "@/lib/llm/types";
import type { RetrievedChunk } from "./retrieval";
import type { ExtractedRequirements, ValidationResult } from "./procedure-mode";

// ── Prompt Templates ───────────────────────────────────────────────────────

const PROCEDURE_SYSTEM_PROMPT = `You are Iota, a precise technical assistant that helps students complete assignment tasks step by step.

CRITICAL RULES:
1. You MUST answer ONLY from the CONTEXT provided. Never invent steps, commands, or resources not in the source material.
2. You MUST follow the exact answer structure specified below — do not skip sections.
3. If the task says "AWS CLI only", do NOT suggest AWS Console steps except where screenshots are explicitly required.
4. If the task says "work out the command", provide command templates but clearly mark which values the student must replace (use <PLACEHOLDER> format).
5. Always include region, naming conventions, and student ID placeholders when the assignment requires them.
6. Always include required output files (e.g., cli_commands_partA.txt, cli_commands_partB.txt) if mentioned in the source.
7. Always include the screenshot checklist if the PDF asks for screenshots.
8. Cite the exact task section (e.g., "Task C3", "Section 6.3") in your answer.
9. Use Vietnamese for explanations if the user's question is in Vietnamese, but keep commands/code in English.

ANSWER STRUCTURE (follow this exact order):

## 🎯 Mục tiêu (What this task is asking you to build)
Brief description of what the task requires.

## 📋 Điều kiện tiên quyết (Prerequisites)
List any required setup, accounts, tools, or prior tasks that must be completed first.

## 🔧 Các bước thực hiện (Step-by-step commands/actions)
Numbered steps with exact commands. For each step:
- State what the step does
- Provide the exact command (with placeholders where needed)
- Explain any important flags or parameters

## 💡 Tại sao thứ tự này quan trọng (Why this order matters)
Brief explanation of dependencies between steps.

## ✅ Kiểm tra kết quả (Verification steps)
How to verify each major step succeeded. Include expected output.

## 📦 Danh sách bài nộp (Deliverables checklist)
- [ ] Each required file
- [ ] Each required screenshot
- [ ] Each required output

## ⚠️ Lỗi thường gặp (Common mistakes to avoid)
List 3-5 common mistakes students make on this task.

---
If any section has no relevant information in the CONTEXT, write "Không có thông tin trong tài liệu" for that section.`;

// ── Prompt Builder ─────────────────────────────────────────────────────────

function formatRequirementsBlock(req: ExtractedRequirements): string {
  const parts: string[] = [];

  if (req.taskTitle) parts.push(`TASK: ${req.taskTitle}`);
  if (req.goal) parts.push(`GOAL: ${req.goal}`);

  if (req.constraints.length > 0) {
    parts.push(`CONSTRAINTS:\n${req.constraints.map((c) => `  ⚠️ ${c}`).join("\n")}`);
  }

  if (req.requiredResources.length > 0) {
    parts.push(`REQUIRED RESOURCES: ${req.requiredResources.join(", ")}`);
  }

  if (req.requiredCommands.length > 0) {
    parts.push(`COMMANDS FOUND IN SPEC:\n${req.requiredCommands.map((c) => `  $ ${c}`).join("\n")}`);
  }

  if (req.requiredFiles.length > 0) {
    parts.push(`REQUIRED FILES: ${req.requiredFiles.join(", ")}`);
  }

  if (req.requiredScreenshots.length > 0) {
    parts.push(`REQUIRED SCREENSHOTS:\n${req.requiredScreenshots.map((s) => `  📸 ${s}`).join("\n")}`);
  }

  if (req.verificationSteps.length > 0) {
    parts.push(`VERIFICATION STEPS:\n${req.verificationSteps.map((v) => `  ✓ ${v}`).join("\n")}`);
  }

  if (req.notes.length > 0) {
    parts.push(`NOTES/WARNINGS:\n${req.notes.map((n) => `  💡 ${n}`).join("\n")}`);
  }

  if (req.deliverables.length > 0) {
    parts.push(`DELIVERABLES:\n${req.deliverables.map((d) => `  📦 ${d}`).join("\n")}`);
  }

  return parts.join("\n\n");
}

function formatContextChunks(chunks: RetrievedChunk[], maxChars = 12000): string {
  const parts: string[] = [];
  let totalChars = 0;

  for (const chunk of chunks) {
    const label = chunk.pageNumber ? `[p.${chunk.pageNumber}]` : `[${chunk.sourceType}]`;
    const entry = `${label} ${chunk.text}`;
    if (totalChars + entry.length > maxChars && parts.length > 0) break;
    parts.push(entry);
    totalChars += entry.length;
  }

  return parts.join("\n\n---\n\n");
}

/**
 * Build LLM messages for procedure mode.
 * Includes the full section context + extracted requirements as structured metadata.
 */
export function buildProcedureMessages(
  question: string,
  chunks: RetrievedChunk[],
  requirements: ExtractedRequirements,
): LlmMessage[] {
  const requirementsBlock = formatRequirementsBlock(requirements);
  const contextBlock = formatContextChunks(chunks);

  return [
    { role: "system", content: PROCEDURE_SYSTEM_PROMPT },
    {
      role: "user",
      content: `EXTRACTED REQUIREMENTS (auto-detected from the assignment spec — use these as a checklist):\n${requirementsBlock}\n\n---\n\nFULL SECTION CONTEXT (this is the complete text of the relevant assignment section — read it carefully):\n${contextBlock}\n\n---\n\nUSER QUESTION:\n${question}\n\nGenerate a complete, ordered procedure following the ANSWER STRUCTURE above. Cover every requirement, constraint, and deliverable from the EXTRACTED REQUIREMENTS. Do not skip any section.`,
    },
  ];
}

/**
 * Append validation warnings to the answer if the self-check found issues.
 */
export function appendValidationWarnings(answer: string, validation: ValidationResult): string {
  if (validation.passed || validation.issues.length === 0) return answer;

  const warnings = validation.issues
    .slice(0, 5) // Cap at 5 warnings
    .map((issue) => `- ⚠️ ${issue}`)
    .join("\n");

  return `${answer}\n\n---\n\n### 🔍 Self-Check Warnings\nThe following items from the assignment spec may not be fully covered in the answer above:\n${warnings}\n\nPlease review the original assignment PDF to ensure completeness.`;
}
