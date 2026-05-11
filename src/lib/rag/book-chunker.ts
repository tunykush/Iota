/**
 * Book Chunker — Multi-granularity chunking for Book RAG.
 *
 * Unlike the standard chunker that produces flat, equal-sized chunks, this creates:
 * 1. **Summary chunks**: One per chapter — a condensed overview for broad queries
 * 2. **Detail chunks**: Fine-grained chunks within each chapter for precise retrieval
 * 3. **Parent-child linking**: Each detail chunk knows its parent chapter/section
 * 4. **Rich metadata**: chapter number, section ID, position in book, hierarchy depth
 *
 * The retrieval system uses summary chunks to identify relevant chapters,
 * then drills into detail chunks for precise answers.
 */

import type { IngestibleChunk } from "./ingestion";
import { analyzeBookStructure, isBookLikeDocument, type BookNode, type BookStructure } from "./book-structure";

// ── Configuration ──────────────────────────────────────────────────────────

const DETAIL_CHUNK_MAX_CHARS = 1200;
const DETAIL_CHUNK_MIN_CHARS = 300;
const DETAIL_CHUNK_OVERLAP_CHARS = 150;
const SUMMARY_CHUNK_MAX_CHARS = 800;

// ── Types ──────────────────────────────────────────────────────────────────

export type BookChunkType = "book_summary" | "chapter_summary" | "section_summary" | "detail";

export type BookChunk = IngestibleChunk & {
  metadata: {
    bookRag: true;
    chunkType: BookChunkType;
    chapterNumber: number | null;
    chapterTitle: string | null;
    sectionId: string | null;
    sectionTitle: string | null;
    depth: number;
    positionInBook: number;
    /** For detail chunks: the parent chapter summary text (truncated) for context */
    parentContext: string | null;
    /** For detail chunks: adjacent chunk hints */
    prevChunkHint: string | null;
    nextChunkHint: string | null;
  };
};

export type BookChunkingResult = {
  chunks: BookChunk[];
  structure: BookStructure;
  stats: {
    summaryChunks: number;
    detailChunks: number;
    totalChunks: number;
    isBook: boolean;
  };
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 3).trim()}...`;
}

function generateChapterSummaryText(node: BookNode): string {
  // Create a condensed summary from the chapter text
  // Take the first few sentences + section titles as a summary
  const lines = node.text.split("\n").filter((l) => l.trim());
  const parts: string[] = [];
  let charCount = 0;

  // Add chapter title
  parts.push(`[Chapter${node.chapterNumber ? ` ${node.chapterNumber}` : ""}: ${node.title}]`);
  charCount += parts[0].length;

  // Add section titles if any
  if (node.children.length > 0) {
    const sectionList = node.children
      .map((s) => `• ${s.title}`)
      .join("\n");
    if (sectionList.length + charCount < SUMMARY_CHUNK_MAX_CHARS) {
      parts.push(`Sections:\n${sectionList}`);
      charCount += sectionList.length + 10;
    }
  }

  // Add first meaningful sentences from the chapter
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 30) continue;
    if (charCount + trimmed.length > SUMMARY_CHUNK_MAX_CHARS) break;
    parts.push(trimmed);
    charCount += trimmed.length;
  }

  return parts.join("\n").slice(0, SUMMARY_CHUNK_MAX_CHARS);
}

function generateBookSummaryText(structure: BookStructure): string {
  const parts: string[] = [`[Book: ${structure.root.title}]`];
  parts.push(`Chapters: ${structure.totalChapters}, Sections: ${structure.totalSections}`);
  parts.push("");
  parts.push("Table of Contents:");

  for (const entry of structure.toc) {
    if (entry.depth <= 2) {
      const indent = entry.depth === 1 ? "" : "  ";
      const num = entry.chapterNumber ? `${entry.chapterNumber}. ` : "";
      parts.push(`${indent}${num}${entry.title}`);
    }
  }

  return parts.join("\n").slice(0, SUMMARY_CHUNK_MAX_CHARS);
}

// ── Core: Split node text into detail chunks ───────────────────────────────

function splitNodeIntoDetailChunks(
  text: string,
  node: BookNode,
  chapterNode: BookNode | null,
  chapterSummary: string,
): BookChunk[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned.length < 50) return [];

  const chunks: BookChunk[] = [];
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter((p) => p.length > 20);

  let currentText = "";
  const rawChunks: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.length > DETAIL_CHUNK_MAX_CHARS) {
      // Flush current
      if (currentText.trim()) rawChunks.push(currentText.trim());
      currentText = "";
      // Split long paragraph by sentences
      let start = 0;
      while (start < paragraph.length) {
        const hardEnd = Math.min(start + DETAIL_CHUNK_MAX_CHARS, paragraph.length);
        const window = paragraph.slice(start, hardEnd);
        const sentenceEnd = Math.max(
          window.lastIndexOf(". "),
          window.lastIndexOf("? "),
          window.lastIndexOf("! "),
        );
        const softEnd = sentenceEnd > DETAIL_CHUNK_MAX_CHARS * 0.5 ? start + sentenceEnd + 1 : hardEnd;
        const chunk = paragraph.slice(start, softEnd).trim();
        if (chunk) rawChunks.push(chunk);
        if (softEnd >= paragraph.length) break;
        start = Math.max(0, softEnd - DETAIL_CHUNK_OVERLAP_CHARS);
      }
      continue;
    }

    const candidate = currentText ? `${currentText}\n\n${paragraph}` : paragraph;
    if (candidate.length <= DETAIL_CHUNK_MAX_CHARS || currentText.length < DETAIL_CHUNK_MIN_CHARS) {
      currentText = candidate;
    } else {
      rawChunks.push(currentText.trim());
      currentText = paragraph;
    }
  }
  if (currentText.trim()) rawChunks.push(currentText.trim());

  // Merge tiny trailing chunks
  const merged: string[] = [];
  for (const chunk of rawChunks) {
    if (merged.length > 0 && chunk.length < 80) {
      merged[merged.length - 1] += `\n\n${chunk}`;
    } else {
      merged.push(chunk);
    }
  }

  // Convert to BookChunks with metadata
  for (let i = 0; i < merged.length; i++) {
    chunks.push({
      text: merged[i],
      pageNumber: node.pageNumber,
      metadata: {
        bookRag: true,
        chunkType: "detail",
        chapterNumber: chapterNode?.chapterNumber ?? node.chapterNumber,
        chapterTitle: chapterNode?.title ?? node.title,
        sectionId: node.sectionId,
        sectionTitle: node.type === "section" || node.type === "subsection" ? node.title : null,
        depth: node.depth,
        positionInBook: node.positionInBook,
        parentContext: truncate(chapterSummary, 300),
        prevChunkHint: i > 0 ? truncate(merged[i - 1], 100) : null,
        nextChunkHint: i < merged.length - 1 ? truncate(merged[i + 1], 100) : null,
      },
    });
  }

  return chunks;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Chunk a book-like document into multi-granularity chunks.
 * Produces summary chunks (chapter-level) and detail chunks (paragraph-level).
 *
 * If the document is not book-like, returns null so the caller can fall back
 * to the standard chunker.
 */
export function chunkBookText(text: string): BookChunkingResult | null {
  if (!isBookLikeDocument(text)) return null;

  const structure = analyzeBookStructure(text);
  const chunks: BookChunk[] = [];

  // 1. Book-level summary chunk
  const bookSummary = generateBookSummaryText(structure);
  chunks.push({
    text: bookSummary,
    metadata: {
      bookRag: true,
      chunkType: "book_summary",
      chapterNumber: null,
      chapterTitle: null,
      sectionId: null,
      sectionTitle: null,
      depth: 0,
      positionInBook: 0,
      parentContext: null,
      prevChunkHint: null,
      nextChunkHint: null,
    },
  });

  // 2. Process each chapter
  for (const chapter of structure.chapters) {
    // Chapter summary chunk
    const chapterSummary = generateChapterSummaryText(chapter);
    chunks.push({
      text: chapterSummary,
      metadata: {
        bookRag: true,
        chunkType: "chapter_summary",
        chapterNumber: chapter.chapterNumber,
        chapterTitle: chapter.title,
        sectionId: null,
        sectionTitle: null,
        depth: 1,
        positionInBook: chapter.positionInBook,
        parentContext: truncate(bookSummary, 200),
        prevChunkHint: null,
        nextChunkHint: null,
      },
    });

    // If chapter has sections, chunk each section separately
    if (chapter.children.length > 0) {
      for (const section of chapter.children) {
        // Section summary (if section is large enough)
        if (section.text.length > 1500) {
          const sectionSummary = truncate(
            section.text.split("\n").filter((l) => l.trim().length > 30).slice(0, 3).join(" "),
            SUMMARY_CHUNK_MAX_CHARS,
          );
          chunks.push({
            text: `[Section: ${section.title}]\n${sectionSummary}`,
            metadata: {
              bookRag: true,
              chunkType: "section_summary",
              chapterNumber: chapter.chapterNumber,
              chapterTitle: chapter.title,
              sectionId: section.sectionId,
              sectionTitle: section.title,
              depth: 2,
              positionInBook: section.positionInBook,
              parentContext: truncate(chapterSummary, 200),
              prevChunkHint: null,
              nextChunkHint: null,
            },
          });
        }

        // Detail chunks for section
        const detailChunks = splitNodeIntoDetailChunks(section.text, section, chapter, chapterSummary);
        chunks.push(...detailChunks);

        // Process subsections
        for (const subsection of section.children) {
          const subChunks = splitNodeIntoDetailChunks(subsection.text, subsection, chapter, chapterSummary);
          chunks.push(...subChunks);
        }
      }
    } else {
      // Chapter has no sections — chunk the chapter text directly
      const detailChunks = splitNodeIntoDetailChunks(chapter.text, chapter, chapter, chapterSummary);
      chunks.push(...detailChunks);
    }
  }

  const summaryChunks = chunks.filter((c) => c.metadata.chunkType !== "detail").length;
  const detailChunks = chunks.filter((c) => c.metadata.chunkType === "detail").length;

  return {
    chunks,
    structure,
    stats: {
      summaryChunks,
      detailChunks,
      totalChunks: chunks.length,
      isBook: structure.isBook,
    },
  };
}

/**
 * Convert BookChunks to IngestibleChunks for the existing ingestion pipeline.
 * The book metadata is preserved in the chunk metadata field.
 */
export function bookChunksToIngestible(bookChunks: BookChunk[]): IngestibleChunk[] {
  return bookChunks.map((chunk) => ({
    text: chunk.text,
    pageNumber: chunk.pageNumber,
    metadata: chunk.metadata as unknown as Record<string, unknown>,
  }));
}
