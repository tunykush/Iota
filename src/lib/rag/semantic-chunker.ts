/**
 * Semantic Chunker — Sentence-based chunking with semantic boundary detection.
 *
 * Instead of splitting text at fixed character counts, this chunker:
 * 1. Splits text into sentences
 * 2. Groups sentences by semantic similarity (topic coherence)
 * 3. Detects topic shifts using cosine similarity between sentence groups
 * 4. Creates chunks at natural semantic boundaries
 *
 * Falls back to the standard chunker if semantic chunking is disabled.
 *
 * Configuration via env:
 *   SEMANTIC_CHUNKING_ENABLED=true (default: true)
 *   SEMANTIC_CHUNK_MAX_CHARS=1600
 *   SEMANTIC_CHUNK_MIN_CHARS=300
 *   SEMANTIC_SIMILARITY_THRESHOLD=0.45 (lower = more splits)
 */

import type { IngestibleChunk } from "./ingestion";

// ── Configuration ──────────────────────────────────────────────────────────

function isSemanticChunkingEnabled(): boolean {
  const flag = (process.env.SEMANTIC_CHUNKING_ENABLED ?? "true").toLowerCase();
  return flag === "true" || flag === "1";
}

function getMaxChunkChars(): number {
  return Math.max(400, Number(process.env.SEMANTIC_CHUNK_MAX_CHARS ?? 1600));
}

function getMinChunkChars(): number {
  return Math.max(100, Number(process.env.SEMANTIC_CHUNK_MIN_CHARS ?? 300));
}

function getSimilarityThreshold(): number {
  return Math.max(0.1, Math.min(0.95, Number(process.env.SEMANTIC_SIMILARITY_THRESHOLD ?? 0.45)));
}

// ── Sentence Splitting ────────────────────────────────────────────────────

const SENTENCE_BOUNDARY = /(?<=[.!?。！？])\s+(?=[A-ZĐÀ-Ỹ\d"'([])|(?<=\n)\s*(?=\n)|(?<=\n)(?=[#\d•\-*])/;
const HEADING_PATTERN = /^(?:#{1,4}\s+\S|\d+(?:\.\d+)*\.?\s+[A-ZĐ\u00C0-\u1EF9]|[A-ZĐ\u00C0-\u1EF9\s]{8,100}$)/m;

type Sentence = {
  text: string;
  isHeading: boolean;
  index: number;
};

function splitIntoSentences(text: string): Sentence[] {
  const cleaned = text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!cleaned) return [];

  // First split by paragraphs (double newlines)
  const paragraphs = cleaned.split(/\n\s*\n/).filter(Boolean);
  const sentences: Sentence[] = [];
  let globalIndex = 0;

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    const isHeading = HEADING_PATTERN.test(trimmed) && trimmed.length < 120;

    if (isHeading || trimmed.length < 80) {
      // Short paragraphs and headings stay as single sentences
      sentences.push({ text: trimmed, isHeading, index: globalIndex++ });
    } else {
      // Split longer paragraphs into sentences
      const parts = trimmed.split(SENTENCE_BOUNDARY).filter(Boolean);
      for (const part of parts) {
        const sentenceText = part.trim();
        if (sentenceText.length > 10) {
          sentences.push({ text: sentenceText, isHeading: false, index: globalIndex++ });
        } else if (sentences.length > 0) {
          // Merge very short fragments with previous sentence
          sentences[sentences.length - 1].text += ` ${sentenceText}`;
        }
      }
    }
  }

  return sentences;
}

// ── Semantic Similarity (lightweight, no embeddings needed) ───────────────

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s\u00c0-\u1ef9]/gi, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2),
  );
}

/**
 * Compute Jaccard similarity between two text segments.
 * This is a lightweight proxy for semantic similarity that doesn't require
 * embedding API calls. For production, this could be replaced with
 * embedding-based cosine similarity.
 */
function textSimilarity(textA: string, textB: string): number {
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection++;
  }

  const union = tokensA.size + tokensB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Enhanced similarity using bigrams for better topic detection.
 */
function bigramSimilarity(textA: string, textB: string): number {
  const getBigrams = (text: string): Set<string> => {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s\u00c0-\u1ef9]/gi, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2);
    const bigrams = new Set<string>();
    for (let i = 0; i < words.length - 1; i++) {
      bigrams.add(`${words[i]}_${words[i + 1]}`);
    }
    return bigrams;
  };

  const bigramsA = getBigrams(textA);
  const bigramsB = getBigrams(textB);

  if (bigramsA.size === 0 || bigramsB.size === 0) return 0;

  let intersection = 0;
  for (const bigram of bigramsA) {
    if (bigramsB.has(bigram)) intersection++;
  }

  const union = bigramsA.size + bigramsB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Combined similarity score using both unigram and bigram overlap.
 */
function combinedSimilarity(textA: string, textB: string): number {
  const unigram = textSimilarity(textA, textB);
  const bigram = bigramSimilarity(textA, textB);
  return unigram * 0.6 + bigram * 0.4;
}

// ── Semantic Boundary Detection ───────────────────────────────────────────

type SentenceGroup = {
  sentences: Sentence[];
  text: string;
};

/**
 * Group sentences into windows and detect topic boundaries.
 */
function detectSemanticBoundaries(sentences: Sentence[]): number[] {
  if (sentences.length <= 3) return [];

  const windowSize = 3;
  const threshold = getSimilarityThreshold();
  const boundaries: number[] = [];

  // Create sliding windows of sentences
  const windows: string[] = [];
  for (let i = 0; i <= sentences.length - windowSize; i++) {
    windows.push(
      sentences
        .slice(i, i + windowSize)
        .map((s) => s.text)
        .join(" "),
    );
  }

  // Compare adjacent windows to find topic shifts
  for (let i = 0; i < windows.length - 1; i++) {
    const similarity = combinedSimilarity(windows[i], windows[i + 1]);

    // A heading always creates a boundary
    const nextSentenceIdx = i + windowSize;
    if (nextSentenceIdx < sentences.length && sentences[nextSentenceIdx].isHeading) {
      boundaries.push(nextSentenceIdx);
      continue;
    }

    // Low similarity indicates a topic shift
    if (similarity < threshold) {
      // Place boundary at the start of the second window
      const boundaryIdx = i + windowSize;
      if (boundaryIdx < sentences.length) {
        boundaries.push(boundaryIdx);
      }
    }
  }

  // Also add boundaries at headings that weren't caught
  for (let i = 1; i < sentences.length; i++) {
    if (sentences[i].isHeading && !boundaries.includes(i)) {
      boundaries.push(i);
    }
  }

  return [...new Set(boundaries)].sort((a, b) => a - b);
}

// ── Chunk Assembly ────────────────────────────────────────────────────────

function assembleChunks(sentences: Sentence[], boundaries: number[]): string[] {
  const maxChars = getMaxChunkChars();
  const minChars = getMinChunkChars();
  const chunks: string[] = [];

  // Create groups based on boundaries
  const groups: SentenceGroup[] = [];
  let start = 0;

  for (const boundary of boundaries) {
    if (boundary > start) {
      const groupSentences = sentences.slice(start, boundary);
      groups.push({
        sentences: groupSentences,
        text: groupSentences.map((s) => s.text).join("\n"),
      });
    }
    start = boundary;
  }

  // Add remaining sentences
  if (start < sentences.length) {
    const groupSentences = sentences.slice(start);
    groups.push({
      sentences: groupSentences,
      text: groupSentences.map((s) => s.text).join("\n"),
    });
  }

  // Merge small groups and split large ones
  let currentChunk = "";

  for (const group of groups) {
    if (group.text.length > maxChars) {
      // Flush current chunk
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }

      // Split large group by sentences
      for (const sentence of group.sentences) {
        const candidate = currentChunk ? `${currentChunk}\n${sentence.text}` : sentence.text;
        if (candidate.length > maxChars && currentChunk.length >= minChars) {
          chunks.push(currentChunk.trim());
          currentChunk = sentence.text;
        } else {
          currentChunk = candidate;
        }
      }
    } else {
      const candidate = currentChunk ? `${currentChunk}\n\n${group.text}` : group.text;
      if (candidate.length > maxChars && currentChunk.length >= minChars) {
        chunks.push(currentChunk.trim());
        currentChunk = group.text;
      } else {
        currentChunk = candidate;
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // Merge tiny trailing chunks
  const merged: string[] = [];
  for (const chunk of chunks) {
    if (merged.length > 0 && chunk.length < 100) {
      merged[merged.length - 1] += `\n\n${chunk}`;
    } else {
      merged.push(chunk);
    }
  }

  return merged.filter((c) => c.length > 0);
}

// ── Public API ─────────────────────────────────────────────────────────────

export type SemanticChunkResult = {
  chunks: string[];
  method: "semantic" | "fixed";
  sentenceCount: number;
  boundaryCount: number;
};

/**
 * Split text into semantically coherent chunks.
 * Falls back to the standard fixed-size chunker if disabled or if the text
 * is too short to benefit from semantic analysis.
 */
export function semanticChunkText(text: string): SemanticChunkResult {
  if (!isSemanticChunkingEnabled() || text.length < 500) {
    // Import would create circular dependency, so inline a simple split
    const { chunkText } = require("./ingestion") as { chunkText: (t: string) => string[] };
    return {
      chunks: chunkText(text),
      method: "fixed",
      sentenceCount: 0,
      boundaryCount: 0,
    };
  }

  const sentences = splitIntoSentences(text);
  if (sentences.length < 4) {
    const { chunkText } = require("./ingestion") as { chunkText: (t: string) => string[] };
    return {
      chunks: chunkText(text),
      method: "fixed",
      sentenceCount: sentences.length,
      boundaryCount: 0,
    };
  }

  const boundaries = detectSemanticBoundaries(sentences);
  const chunks = assembleChunks(sentences, boundaries);

  return {
    chunks,
    method: "semantic",
    sentenceCount: sentences.length,
    boundaryCount: boundaries.length,
  };
}

/**
 * Semantic chunking with page number support.
 */
export function semanticChunkTextWithPageNumber(text: string, pageNumber?: number): IngestibleChunk[] {
  const result = semanticChunkText(text);
  return result.chunks.map((chunk) => ({ text: chunk, pageNumber }));
}