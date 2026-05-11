/**
 * Book Entity Extractor — Extracts named entities from book chunks during ingestion.
 *
 * Uses a hybrid approach:
 * 1. **Regex-based NER**: Fast, zero-cost extraction of common patterns
 *    (capitalized names, quoted terms, numbered references)
 * 2. **Frequency-based filtering**: Only keeps entities that appear multiple times
 *    (reduces noise from one-off capitalized words)
 * 3. **Entity deduplication**: Merges aliases (e.g., "Dr. Smith" and "Smith")
 *
 * Designed to work WITHOUT an LLM call (zero cost, fast).
 * Can be enhanced later with LLM-based extraction for higher quality.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookChunk } from "./book-chunker";

// ── Types ──────────────────────────────────────────────────────────────────

export type ExtractedEntity = {
  name: string;
  type: "person" | "place" | "concept" | "event" | "organization" | "other";
  aliases: string[];
  chunkIds: string[];
  chapterNumbers: number[];
  mentionCount: number;
  firstAppearance: number; // position_in_book 0.0-1.0
};

type RawMention = {
  text: string;
  chunkIndex: number;
  chapterNumber: number | null;
  positionInBook: number;
};

// ── Configuration ──────────────────────────────────────────────────────────

/** Minimum mentions to consider something an entity */
const MIN_MENTIONS = 2;
/** Maximum entities to extract per document */
const MAX_ENTITIES = 100;
/** Words to ignore even if capitalized */
const STOP_ENTITIES = new Set([
  // English
  "the", "this", "that", "these", "those", "here", "there", "where", "when",
  "what", "which", "who", "whom", "whose", "how", "why", "chapter", "section",
  "part", "page", "figure", "table", "note", "example", "introduction",
  "conclusion", "summary", "overview", "appendix", "index", "contents",
  "however", "therefore", "furthermore", "moreover", "although", "because",
  "since", "while", "during", "before", "after", "between", "through",
  "about", "above", "below", "under", "over", "into", "onto", "upon",
  "first", "second", "third", "last", "next", "previous", "following",
  "new", "old", "good", "bad", "great", "small", "large", "long", "short",
  "many", "much", "more", "most", "some", "any", "all", "each", "every",
  // Vietnamese
  "chương", "phần", "mục", "trang", "hình", "bảng", "ví dụ", "ghi chú",
  "giới thiệu", "kết luận", "tóm tắt", "tổng quan", "phụ lục",
  "tuy nhiên", "do đó", "ngoài ra", "mặc dù", "bởi vì",
  "trong khi", "trước khi", "sau khi", "giữa", "qua",
  "đầu tiên", "thứ hai", "cuối cùng", "tiếp theo",
  "mới", "cũ", "tốt", "xấu", "lớn", "nhỏ", "dài", "ngắn",
  "nhiều", "ít", "tất cả", "mỗi", "một số",
]);

// ── Regex Patterns ─────────────────────────────────────────────────────────

/** Match capitalized multi-word names (2-4 words) — likely person/place names */
const PROPER_NOUN_PATTERN = /\b([A-ZĐÀ-Ỹ][a-zđà-ỹ]+(?:\s+[A-ZĐÀ-Ỹ][a-zđà-ỹ]+){1,3})\b/g;

/** Match single capitalized words that appear mid-sentence (not after period) */
const SINGLE_PROPER_NOUN = /(?<=[a-zđà-ỹ,;:]\s)([A-ZĐÀ-Ỹ][a-zđà-ỹ]{2,})\b/g;

/** Match quoted terms (likely concepts or titles) */
const QUOTED_TERM = /[""]([^""]{3,50})[""]|"([^"]{3,50})"/g;

/** Match organization-like patterns */
const ORG_PATTERN = /\b((?:University|Institute|Company|Corporation|Ministry|Department|Committee|Council|Board|Agency|Foundation|Association|Society|Academy|School|College|Hospital|Museum|Library|Bank|Court|Church|Temple|Đại học|Viện|Công ty|Bộ|Sở|Ủy ban|Hội đồng|Cơ quan|Quỹ|Hiệp hội|Hội|Học viện|Trường|Bệnh viện|Bảo tàng|Thư viện|Ngân hàng|Tòa|Nhà thờ|Chùa)\s+[A-ZĐÀ-Ỹ][^\s,.;:!?]{2,}(?:\s+[A-ZĐÀ-Ỹ][^\s,.;:!?]{2,}){0,3})\b/g;

/** Match place indicators */
const PLACE_INDICATORS = /\b((?:City|Town|Village|Province|District|Country|River|Mountain|Lake|Island|Ocean|Sea|Street|Road|Avenue|Boulevard|Park|Forest|Valley|Desert|Bay|Cape|Peninsula|Thành phố|Thị xã|Làng|Tỉnh|Huyện|Quận|Quốc gia|Sông|Núi|Hồ|Đảo|Biển|Đường|Phố|Công viên|Rừng|Thung lũng|Sa mạc|Vịnh|Mũi|Bán đảo)\s+[A-ZĐÀ-Ỹ][^\s,.;:!?]{1,}(?:\s+[A-ZĐÀ-Ỹ][^\s,.;:!?]{1,}){0,3})\b/g;

// ── Core: Extract entities from chunks ─────────────────────────────────────

function extractRawMentions(chunks: BookChunk[]): RawMention[] {
  const mentions: RawMention[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const text = chunk.text;
    const chapterNumber = chunk.metadata.chapterNumber;
    const positionInBook = chunk.metadata.positionInBook;

    // Skip summary chunks — they repeat content from detail chunks
    if (chunk.metadata.chunkType !== "detail") continue;

    // Extract proper nouns (multi-word)
    for (const match of text.matchAll(PROPER_NOUN_PATTERN)) {
      const name = match[1].trim();
      if (!isStopEntity(name)) {
        mentions.push({ text: name, chunkIndex: i, chapterNumber, positionInBook });
      }
    }

    // Extract single proper nouns mid-sentence
    for (const match of text.matchAll(SINGLE_PROPER_NOUN)) {
      const name = match[1].trim();
      if (!isStopEntity(name) && name.length > 2) {
        mentions.push({ text: name, chunkIndex: i, chapterNumber, positionInBook });
      }
    }

    // Extract quoted terms
    for (const match of text.matchAll(QUOTED_TERM)) {
      const name = (match[1] ?? match[2])?.trim();
      if (name && !isStopEntity(name)) {
        mentions.push({ text: name, chunkIndex: i, chapterNumber, positionInBook });
      }
    }
  }

  return mentions;
}

function isStopEntity(name: string): boolean {
  const lower = name.toLowerCase();
  if (STOP_ENTITIES.has(lower)) return true;
  // Single word that's too short
  if (!name.includes(" ") && name.length < 3) return true;
  // All numbers
  if (/^\d+$/.test(name)) return true;
  return false;
}

function classifyEntityType(name: string, mentions: RawMention[]): ExtractedEntity["type"] {
  const lower = name.toLowerCase();

  // Check for organization indicators
  if (ORG_PATTERN.test(name)) return "organization";

  // Check for place indicators
  if (PLACE_INDICATORS.test(name)) return "place";

  // Heuristic: if it's a 2-3 word name with common name patterns, likely a person
  const words = name.split(/\s+/);
  if (words.length >= 2 && words.length <= 4 && words.every((w) => /^[A-ZĐÀ-Ỹ]/.test(w))) {
    // Check for title prefixes that indicate person
    if (/^(Mr|Mrs|Ms|Dr|Prof|Sir|Lord|Lady|King|Queen|Prince|Princess|General|Captain|Ông|Bà|Anh|Chị|Thầy|Cô|Giáo sư|Tiến sĩ|Bác sĩ|Đại tướng|Thiếu tướng)\b/i.test(name)) {
      return "person";
    }
    return "person"; // Multi-word capitalized names are usually people
  }

  // Quoted terms are usually concepts
  if (mentions.some((m) => m.text === name && /[""\u201C\u201D]/.test(name))) {
    return "concept";
  }

  return "other";
}

function normalizeEntityName(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

// ── Core: Aggregate and deduplicate ────────────────────────────────────────

function aggregateEntities(mentions: RawMention[]): ExtractedEntity[] {
  // Group by normalized name
  const groups = new Map<string, RawMention[]>();
  for (const mention of mentions) {
    const key = normalizeEntityName(mention.text).toLowerCase();
    const group = groups.get(key) ?? [];
    group.push(mention);
    groups.set(key, group);
  }

  // Convert to entities
  const entities: ExtractedEntity[] = [];
  for (const [, group] of groups) {
    if (group.length < MIN_MENTIONS) continue;

    const canonicalName = normalizeEntityName(group[0].text);
    const chapterNumbers = Array.from(new Set(group.map((m) => m.chapterNumber).filter((n): n is number => n != null)));
    const firstAppearance = Math.min(...group.map((m) => m.positionInBook));

    entities.push({
      name: canonicalName,
      type: classifyEntityType(canonicalName, group),
      aliases: [],
      chunkIds: [], // Will be filled when we have actual chunk IDs from DB
      chapterNumbers,
      mentionCount: group.length,
      firstAppearance,
    });
  }

  // Merge aliases: if "Smith" and "Dr. Smith" both exist, merge them
  const merged = mergeAliases(entities);

  // Sort by mention count (most mentioned first) and limit
  return merged
    .sort((a, b) => b.mentionCount - a.mentionCount)
    .slice(0, MAX_ENTITIES);
}

function mergeAliases(entities: ExtractedEntity[]): ExtractedEntity[] {
  const result: ExtractedEntity[] = [];
  const consumed = new Set<string>();

  // Sort by name length descending (longer names are more specific)
  const sorted = [...entities].sort((a, b) => b.name.length - a.name.length);

  for (const entity of sorted) {
    if (consumed.has(entity.name.toLowerCase())) continue;

    // Find shorter entities that are substrings of this one
    const aliases: string[] = [];
    for (const other of sorted) {
      if (other === entity) continue;
      if (consumed.has(other.name.toLowerCase())) continue;

      const entityLower = entity.name.toLowerCase();
      const otherLower = other.name.toLowerCase();

      // "Dr. Smith" contains "Smith"
      if (entityLower.includes(otherLower) || otherLower.includes(entityLower)) {
        aliases.push(other.name);
        entity.mentionCount += other.mentionCount;
        entity.chapterNumbers = Array.from(new Set([...entity.chapterNumbers, ...other.chapterNumbers]));
        entity.firstAppearance = Math.min(entity.firstAppearance, other.firstAppearance);
        consumed.add(otherLower);
      }
    }

    entity.aliases = aliases;
    consumed.add(entity.name.toLowerCase());
    result.push(entity);
  }

  return result;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Extract entities from book chunks (zero-cost, regex-based).
 * Returns a list of entities with their types, mention counts, and chapter locations.
 */
export function extractBookEntities(chunks: BookChunk[]): ExtractedEntity[] {
  const mentions = extractRawMentions(chunks);
  return aggregateEntities(mentions);
}

/**
 * Persist extracted entities to the book_entities table.
 * Maps chunk indices to actual chunk IDs from the DB.
 */
export async function persistBookEntities(input: {
  supabase: SupabaseClient;
  userId: string;
  documentId: string;
  entities: ExtractedEntity[];
  chunkIdMap: Map<number, string>; // chunkIndex → chunk UUID
}): Promise<number> {
  const { supabase, userId, documentId, entities, chunkIdMap } = input;

  if (entities.length === 0) return 0;

  const rows = entities.map((entity) => ({
    user_id: userId,
    document_id: documentId,
    entity_name: entity.name,
    entity_type: entity.type,
    aliases: entity.aliases,
    chunk_ids: entity.chunkIds.length > 0
      ? entity.chunkIds
      : Array.from(chunkIdMap.values()).slice(0, 10), // fallback: first 10 chunks
    chapter_numbers: entity.chapterNumbers,
    mention_count: entity.mentionCount,
    first_appearance: entity.firstAppearance,
    metadata: {},
  }));

  const { error } = await supabase.from("book_entities").insert(rows);
  if (error) {
    console.warn(`[Book RAG] Failed to persist entities (non-fatal): ${error.message}`);
    return 0;
  }

  return entities.length;
}
