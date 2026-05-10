/**
 * Embedding Cache — In-memory LRU cache for embedding vectors.
 *
 * Avoids redundant API calls for identical text inputs. Uses a content-hash
 * as the cache key and stores the resulting embedding vector.
 *
 * Configuration via env:
 *   EMBEDDING_CACHE_ENABLED=true  (default: true)
 *   EMBEDDING_CACHE_MAX_SIZE=2000 (max entries, default: 2000)
 *   EMBEDDING_CACHE_TTL_MS=3600000 (1 hour default)
 */

import { createHash } from "node:crypto";

// ── Configuration ──────────────────────────────────────────────────────────

function isCacheEnabled(): boolean {
  const flag = (process.env.EMBEDDING_CACHE_ENABLED ?? "true").toLowerCase();
  return flag === "true" || flag === "1";
}

function getMaxCacheSize(): number {
  return Math.max(100, Number(process.env.EMBEDDING_CACHE_MAX_SIZE ?? 2000));
}

function getCacheTtlMs(): number {
  return Math.max(60_000, Number(process.env.EMBEDDING_CACHE_TTL_MS ?? 3_600_000));
}

// ── Types ──────────────────────────────────────────────────────────────────

type CacheEntry = {
  embedding: number[];
  createdAt: number;
};

export type EmbeddingCacheStats = {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRate: number;
  enabled: boolean;
};

// ── LRU Cache Implementation ──────────────────────────────────────────────

class EmbeddingLRUCache {
  private cache = new Map<string, CacheEntry>();
  private hits = 0;
  private misses = 0;

  private hashText(text: string): string {
    return createHash("sha256").update(text.trim().toLowerCase()).digest("hex").slice(0, 32);
  }

  /**
   * Look up a cached embedding for the given text.
   * Returns the embedding vector if found and not expired, otherwise null.
   */
  get(text: string): number[] | null {
    if (!isCacheEnabled()) return null;

    const key = this.hashText(text);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check TTL
    if (Date.now() - entry.createdAt > getCacheTtlMs()) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Move to end (most recently used) by re-inserting
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;
    return entry.embedding;
  }

  /**
   * Store an embedding in the cache.
   */
  set(text: string, embedding: number[]): void {
    if (!isCacheEnabled()) return;

    const key = this.hashText(text);
    const maxSize = getMaxCacheSize();

    // Evict oldest entries if at capacity
    if (this.cache.size >= maxSize) {
      const evictCount = Math.max(1, Math.floor(maxSize * 0.1));
      const keys = this.cache.keys();
      for (let i = 0; i < evictCount; i++) {
        const oldest = keys.next();
        if (oldest.done) break;
        this.cache.delete(oldest.value);
      }
    }

    this.cache.set(key, { embedding, createdAt: Date.now() });
  }

  /**
   * Batch lookup: returns an array where each element is either the cached
   * embedding or null (cache miss). Also returns the indices of misses.
   */
  getBatch(texts: string[]): { results: (number[] | null)[]; missIndices: number[] } {
    const results: (number[] | null)[] = [];
    const missIndices: number[] = [];

    for (let i = 0; i < texts.length; i++) {
      const cached = this.get(texts[i]);
      results.push(cached);
      if (!cached) missIndices.push(i);
    }

    return { results, missIndices };
  }

  /**
   * Batch store: caches embeddings for the given texts.
   */
  setBatch(texts: string[], embeddings: number[][]): void {
    for (let i = 0; i < texts.length; i++) {
      if (embeddings[i]) {
        this.set(texts[i], embeddings[i]);
      }
    }
  }

  /**
   * Get cache statistics.
   */
  getStats(): EmbeddingCacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: getMaxCacheSize(),
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? Number((this.hits / total).toFixed(3)) : 0,
      enabled: isCacheEnabled(),
    };
  }

  /**
   * Clear all cached entries and reset stats.
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Prune expired entries.
   */
  prune(): number {
    const ttl = getCacheTtlMs();
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache) {
      if (now - entry.createdAt > ttl) {
        this.cache.delete(key);
        pruned++;
      }
    }

    return pruned;
  }
}

// ── Singleton ──────────────────────────────────────────────────────────────

let _instance: EmbeddingLRUCache | null = null;

export function getEmbeddingCache(): EmbeddingLRUCache {
  if (!_instance) {
    _instance = new EmbeddingLRUCache();
  }
  return _instance;
}

export function resetEmbeddingCache(): void {
  _instance?.clear();
  _instance = null;
}