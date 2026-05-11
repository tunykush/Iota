/**
 * Book Structure Module — Detects chapters, sections, and builds hierarchical structure from book text.
 *
 * This module is the foundation of Book RAG. It:
 * 1. Detects chapter boundaries using multiple heuristics (headings, page breaks, patterns)
 * 2. Detects section boundaries within chapters
 * 3. Builds a hierarchical tree: Book → Chapter → Section → Paragraph
 * 4. Tracks position metadata (position in book as 0.0-1.0, chapter number, section depth)
 * 5. Extracts a table of contents from the detected structure
 *
 * Works with both English and Vietnamese books.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type BookNode = {
  type: "book" | "chapter" | "section" | "subsection";
  title: string;
  /** 0-based depth: book=0, chapter=1, section=2, subsection=3 */
  depth: number;
  /** Chapter number (1-based), null for book-level */
  chapterNumber: number | null;
  /** Section identifier like "2.3" */
  sectionId: string | null;
  /** Position in the full text as a fraction 0.0–1.0 */
  positionInBook: number;
  /** The raw text content of this node (excluding children text) */
  text: string;
  /** Full text including children, for summary generation */
  fullText: string;
  /** Page number if detectable */
  pageNumber?: number;
  /** Child nodes */
  children: BookNode[];
};

export type BookStructure = {
  root: BookNode;
  chapters: BookNode[];
  totalChapters: number;
  totalSections: number;
  totalCharacters: number;
  /** Flat table of contents */
  toc: TocEntry[];
  /** Whether the document was detected as a book (vs short document) */
  isBook: boolean;
};

export type TocEntry = {
  title: string;
  depth: number;
  chapterNumber: number | null;
  sectionId: string | null;
  positionInBook: number;
  charOffset: number;
};

// ── Configuration ──────────────────────────────────────────────────────────

/** Minimum text length to consider a document as a "book" */
const MIN_BOOK_LENGTH = 15_000;
/** Minimum chapters to classify as book */
const MIN_CHAPTERS_FOR_BOOK = 3;

// ── Chapter/Section Detection Patterns ─────────────────────────────────────

const CHAPTER_PATTERNS: Array<{ pattern: RegExp; extract: (match: RegExpMatchArray) => { number: number | null; title: string } }> = [
  // "Chapter 1: Title" or "Chapter 1 - Title" or "CHAPTER 1"
  {
    pattern: /^(?:chapter|chương)\s+(\d+)\s*[:\-–—.]?\s*(.*)/i,
    extract: (m) => ({ number: Number.parseInt(m[1], 10), title: m[2]?.trim() || `Chapter ${m[1]}` }),
  },
  // "Chương I: Title" (Roman numerals)
  {
    pattern: /^(?:chapter|chương)\s+(I{1,3}|IV|V|VI{0,3}|IX|X{0,3})\s*[:\-–—.]?\s*(.*)/i,
    extract: (m) => ({ number: romanToInt(m[1]), title: m[2]?.trim() || `Chapter ${m[1]}` }),
  },
  // "PART 1" / "Phần 1"
  {
    pattern: /^(?:part|phần)\s+(\d+)\s*[:\-–—.]?\s*(.*)/i,
    extract: (m) => ({ number: Number.parseInt(m[1], 10), title: m[2]?.trim() || `Part ${m[1]}` }),
  },
  // Markdown heading "# Chapter Title" or "## Chapter Title"
  {
    pattern: /^#{1,2}\s+(.+)/,
    extract: (m) => ({ number: null, title: m[1].trim() }),
  },
  // ALL CAPS heading on its own line (likely chapter title)
  {
    pattern: /^([A-ZĐÀ-Ỹ\s]{10,80})$/,
    extract: (m) => ({ number: null, title: m[1].trim() }),
  },
];

const SECTION_PATTERNS: Array<{ pattern: RegExp; extract: (match: RegExpMatchArray) => { id: string; title: string } }> = [
  // "1.2 Section Title" or "1.2. Section Title"
  {
    pattern: /^(\d+\.\d+(?:\.\d+)?)\s*\.?\s+([A-ZĐÀ-Ỹa-zđà-ỹ].*)/,
    extract: (m) => ({ id: m[1], title: m[2].trim() }),
  },
  // "### Section Title" (Markdown h3)
  {
    pattern: /^###\s+(.+)/,
    extract: (m) => ({ id: "", title: m[1].trim() }),
  },
  // "#### Subsection Title" (Markdown h4)
  {
    pattern: /^####\s+(.+)/,
    extract: (m) => ({ id: "", title: m[1].trim() }),
  },
  // Bold section: "**Section Title**"
  {
    pattern: /^\*\*(.{5,80})\*\*\s*$/,
    extract: (m) => ({ id: "", title: m[1].trim() }),
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function romanToInt(roman: string): number {
  const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };
  let result = 0;
  const upper = roman.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    const current = map[upper[i]] ?? 0;
    const next = map[upper[i + 1]] ?? 0;
    result += current < next ? -current : current;
  }
  return result;
}

function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

/** Detect if a line looks like a page break marker */
function isPageBreak(line: string): boolean {
  const trimmed = line.trim();
  // Form feed character
  if (trimmed === "\f" || trimmed === "") return false;
  // "--- Page 5 ---" or similar
  if (/^[-=_]{3,}\s*(?:page|trang)?\s*\d*\s*[-=_]*$/i.test(trimmed)) return true;
  // Just a page number on its own line
  if (/^\d{1,4}$/.test(trimmed)) return true;
  return false;
}

// ── Core: Detect Structure ─────────────────────────────────────────────────

type DetectedHeading = {
  lineIndex: number;
  charOffset: number;
  type: "chapter" | "section" | "subsection";
  chapterNumber: number | null;
  sectionId: string | null;
  title: string;
  line: string;
};

function detectHeadings(lines: string[]): DetectedHeading[] {
  const headings: DetectedHeading[] = [];
  let charOffset = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineLen = lines[i].length + 1; // +1 for newline

    if (!line || isPageBreak(line)) {
      charOffset += lineLen;
      continue;
    }

    // Check chapter patterns first
    let matched = false;
    for (const { pattern, extract } of CHAPTER_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        const { number, title } = extract(match);
        // Validate: ALL CAPS pattern needs surrounding blank lines
        if (pattern.source.includes("[A-ZĐÀ-Ỹ")) {
          const prevBlank = i === 0 || !lines[i - 1]?.trim();
          const nextBlank = i === lines.length - 1 || !lines[i + 1]?.trim();
          if (!prevBlank || !nextBlank) {
            charOffset += lineLen;
            continue;
          }
        }
        headings.push({
          lineIndex: i,
          charOffset,
          type: "chapter",
          chapterNumber: number,
          sectionId: null,
          title,
          line,
        });
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Check section patterns
      for (const { pattern, extract } of SECTION_PATTERNS) {
        const match = line.match(pattern);
        if (match) {
          const { id, title } = extract(match);
          const isSubsection = pattern.source.includes("####") || (id && id.split(".").length > 2);
          headings.push({
            lineIndex: i,
            charOffset,
            type: isSubsection ? "subsection" : "section",
            chapterNumber: null,
            sectionId: id || null,
            title,
            line,
          });
          break;
        }
      }
    }

    charOffset += lineLen;
  }

  return headings;
}

/** Auto-number chapters if they weren't numbered in the text */
function autoNumberChapters(headings: DetectedHeading[]): DetectedHeading[] {
  let chapterCount = 0;
  return headings.map((h) => {
    if (h.type === "chapter") {
      chapterCount++;
      return { ...h, chapterNumber: h.chapterNumber ?? chapterCount };
    }
    return h;
  });
}

// ── Core: Build Tree ───────────────────────────────────────────────────────

function buildBookTree(text: string, headings: DetectedHeading[]): BookNode {
  const lines = text.split("\n");
  const totalChars = text.length;

  const root: BookNode = {
    type: "book",
    title: "Document",
    depth: 0,
    chapterNumber: null,
    sectionId: null,
    positionInBook: 0,
    text: "",
    fullText: text,
    children: [],
  };

  if (headings.length === 0) {
    // No structure detected — treat entire text as one chapter
    root.children.push({
      type: "chapter",
      title: "Content",
      depth: 1,
      chapterNumber: 1,
      sectionId: null,
      positionInBook: 0,
      text: text,
      fullText: text,
      children: [],
    });
    return root;
  }

  // Build nodes from headings
  const nodes: BookNode[] = headings.map((h, idx) => {
    const nextHeading = headings[idx + 1];
    const startLine = h.lineIndex;
    const endLine = nextHeading ? nextHeading.lineIndex : lines.length;
    const nodeText = lines.slice(startLine, endLine).join("\n").trim();

    return {
      type: h.type === "chapter" ? "chapter" : h.type === "subsection" ? "subsection" : "section",
      title: h.title,
      depth: h.type === "chapter" ? 1 : h.type === "section" ? 2 : 3,
      chapterNumber: h.chapterNumber,
      sectionId: h.sectionId,
      positionInBook: totalChars > 0 ? Number((h.charOffset / totalChars).toFixed(4)) : 0,
      text: nodeText,
      fullText: nodeText,
      children: [],
    };
  });

  // Handle text before first heading (preamble/introduction)
  if (headings[0].lineIndex > 0) {
    const preambleText = lines.slice(0, headings[0].lineIndex).join("\n").trim();
    if (preambleText.length > 100) {
      root.children.push({
        type: "chapter",
        title: "Introduction",
        depth: 1,
        chapterNumber: 0,
        sectionId: null,
        positionInBook: 0,
        text: preambleText,
        fullText: preambleText,
        children: [],
      });
    }
  }

  // Nest sections under chapters
  let currentChapter: BookNode | null = null;
  let currentSection: BookNode | null = null;

  for (const node of nodes) {
    if (node.type === "chapter") {
      currentChapter = node;
      currentSection = null;
      root.children.push(node);
    } else if (node.type === "section") {
      currentSection = node;
      if (currentChapter) {
        currentChapter.children.push(node);
        // Update chapter fullText to include section
        currentChapter.fullText = `${currentChapter.fullText}\n${node.fullText}`;
      } else {
        // Section without a chapter — create implicit chapter
        currentChapter = {
          type: "chapter",
          title: "Content",
          depth: 1,
          chapterNumber: null,
          sectionId: null,
          positionInBook: node.positionInBook,
          text: "",
          fullText: node.fullText,
          children: [node],
        };
        root.children.push(currentChapter);
      }
    } else if (node.type === "subsection") {
      if (currentSection) {
        currentSection.children.push(node);
        currentSection.fullText = `${currentSection.fullText}\n${node.fullText}`;
      } else if (currentChapter) {
        currentChapter.children.push(node);
        currentChapter.fullText = `${currentChapter.fullText}\n${node.fullText}`;
      } else {
        root.children.push(node);
      }
    }
  }

  return root;
}

// ── Core: Build TOC ────────────────────────────────────────────────────────

function buildToc(root: BookNode): TocEntry[] {
  const toc: TocEntry[] = [];

  function walk(node: BookNode, charOffset: number) {
    if (node.type !== "book") {
      toc.push({
        title: node.title,
        depth: node.depth,
        chapterNumber: node.chapterNumber,
        sectionId: node.sectionId,
        positionInBook: node.positionInBook,
        charOffset,
      });
    }
    let offset = charOffset;
    for (const child of node.children) {
      walk(child, offset);
      offset += child.text.length;
    }
  }

  walk(root, 0);
  return toc;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Analyze text and extract book structure.
 * Returns a hierarchical tree with chapters, sections, and metadata.
 */
export function analyzeBookStructure(text: string): BookStructure {
  const cleaned = cleanText(text);
  const lines = cleaned.split("\n");
  const rawHeadings = detectHeadings(lines);
  const headings = autoNumberChapters(rawHeadings);

  const root = buildBookTree(cleaned, headings);
  const toc = buildToc(root);

  const chapters = root.children.filter((n) => n.type === "chapter");
  let totalSections = 0;
  for (const ch of chapters) {
    totalSections += ch.children.length;
    for (const sec of ch.children) {
      totalSections += sec.children.length;
    }
  }

  const isBook = cleaned.length >= MIN_BOOK_LENGTH && chapters.length >= MIN_CHAPTERS_FOR_BOOK;

  // Try to detect book title from first heading or first line
  if (chapters.length > 0 && root.title === "Document") {
    const firstLine = lines.find((l) => l.trim().length > 5 && l.trim().length < 120);
    if (firstLine) root.title = firstLine.trim();
  }

  return {
    root,
    chapters,
    totalChapters: chapters.length,
    totalSections,
    totalCharacters: cleaned.length,
    toc,
    isBook,
  };
}

/**
 * Quick check: is this text long enough and structured enough to benefit from Book RAG?
 */
export function isBookLikeDocument(text: string): boolean {
  if (text.length < MIN_BOOK_LENGTH) return false;
  const lines = text.split("\n");
  const headings = detectHeadings(lines);
  const chapters = headings.filter((h) => h.type === "chapter");
  return chapters.length >= MIN_CHAPTERS_FOR_BOOK;
}

/**
 * Get a flat list of all nodes in the tree (depth-first).
 */
export function flattenBookNodes(root: BookNode): BookNode[] {
  const result: BookNode[] = [];
  function walk(node: BookNode) {
    result.push(node);
    for (const child of node.children) walk(child);
  }
  walk(root);
  return result;
}

/**
 * Find the chapter that contains a given character offset.
 */
export function findChapterAtOffset(structure: BookStructure, charOffset: number): BookNode | null {
  const fraction = structure.totalCharacters > 0 ? charOffset / structure.totalCharacters : 0;
  // Find the last chapter whose position is <= the target fraction
  let best: BookNode | null = null;
  for (const ch of structure.chapters) {
    if (ch.positionInBook <= fraction) best = ch;
    else break;
  }
  return best;
}
