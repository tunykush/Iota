import type { LlmGenerateRequest, LlmProvider, LlmRouterResult, LlmStreamChunk } from "./types";
import { createDeepSeekProvider } from "./providers/deepseek";
import { createGeminiProvider } from "./providers/gemini";
import { createGroqProvider } from "./providers/groq";
import { createOpenRouterProvider } from "./providers/openrouter";
import { createZaiProvider } from "./providers/zai";

/**
 * Provider order optimized for free-tier speed:
 * 1. Groq (fastest inference, free tier generous)
 * 2. Gemini flash-lite variants (fast, free tier)
 * 3. OpenRouter free models (decent speed, free)
 * 4. ZAI models (free but higher latency from China servers)
 * 5. DeepSeek (paid, last resort)
 */
function defaultProviders(): LlmProvider[] {
  return [
    createGroqProvider("llama-3.1-8b-instant"),
    createGeminiProvider("gemini-2.0-flash-lite"),
    createGeminiProvider("gemini-2.5-flash-lite"),
    createGeminiProvider(),
    createGeminiProvider("gemini-2.0-flash"),
    createOpenRouterProvider(),
    createOpenRouterProvider("nvidia/nemotron-nano-9b-v2:free"),
    createOpenRouterProvider("qwen/qwen3-next-80b-a3b-instruct:free"),
    createOpenRouterProvider("z-ai/glm-4.5-air:free"),
    createZaiProvider("glm-4.5-flash"),
    createZaiProvider("glm-4.7"),
    createZaiProvider("glm-4.6"),
    createZaiProvider("glm-4.5"),
    createDeepSeekProvider(),
  ];
}

function withTimeout(ms: number): { controller: AbortController; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { controller, clear: () => clearTimeout(timer) };
}

export async function generateWithFallback(
  request: Omit<LlmGenerateRequest, "signal">,
  providers = defaultProviders(),
): Promise<LlmRouterResult> {
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS ?? 15000);
  const attempts: LlmRouterResult["attempts"] = [];

  for (const provider of providers) {
    if (!provider.isConfigured()) {
      attempts.push({
        provider: provider.id,
        model: provider.model,
        ok: false,
        error: "Provider is not configured",
        latencyMs: 0,
      });
      continue;
    }

    const timeout = withTimeout(timeoutMs);
    const started = Date.now();
    try {
      const result = await provider.generate({ ...request, signal: timeout.controller.signal });
      timeout.clear();
      attempts.push({ provider: provider.id, model: provider.model, ok: true, latencyMs: Date.now() - started });
      return { ...result, attempts };
    } catch (error) {
      timeout.clear();
      attempts.push({
        provider: provider.id,
        model: provider.model,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown provider error",
        latencyMs: Date.now() - started,
      });
    }
  }

  throw new Error(`No LLM provider succeeded. Attempts: ${attempts.map((a) => `${a.model}: ${a.error}`).join(" | ")}`);
}

/**
 * Stream generation with fallback — tries providers until one streams successfully.
 * Yields text deltas. All providers now support native streaming.
 *
 * Optimization: uses a "first chunk" timeout — if a provider connects but sends
 * no data within FIRST_CHUNK_TIMEOUT_MS, we skip to the next provider.
 * This prevents slow providers from blocking the user experience.
 */
export async function* streamWithFallback(
  request: Omit<LlmGenerateRequest, "signal">,
  providers = defaultProviders(),
): AsyncGenerator<LlmStreamChunk & { provider: string; model: string }, void, unknown> {
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS ?? 30000);
  const firstChunkTimeoutMs = Number(process.env.LLM_FIRST_CHUNK_TIMEOUT_MS ?? 8000);

  for (const provider of providers) {
    if (!provider.isConfigured()) continue;

    const timeout = withTimeout(timeoutMs);
    try {
      if (provider.generateStream) {
        const stream = provider.generateStream({ ...request, signal: timeout.controller.signal });
        let receivedFirstChunk = false;

        // Set up a first-chunk deadline: if no data arrives within firstChunkTimeoutMs, abort
        let firstChunkTimer: ReturnType<typeof setTimeout> | undefined;
        const firstChunkPromise = new Promise<never>((_, reject) => {
          firstChunkTimer = setTimeout(() => {
            if (!receivedFirstChunk) {
              reject(new Error(`${provider.id}/${provider.model}: no data within ${firstChunkTimeoutMs}ms`));
            }
          }, firstChunkTimeoutMs);
        });

        try {
          const iterator = stream[Symbol.asyncIterator]();
          // Race the first chunk against the first-chunk timeout
          const first = await Promise.race([iterator.next(), firstChunkPromise]) as IteratorResult<LlmStreamChunk, void>;
          if (firstChunkTimer) clearTimeout(firstChunkTimer);
          receivedFirstChunk = true;

          if (!first.done && first.value) {
            const chunk = first.value;
            yield { delta: chunk.delta, done: chunk.done, provider: provider.id, model: provider.model };
            if (chunk.done) { timeout.clear(); return; }
          }

          // Continue reading remaining chunks (no first-chunk timeout needed)
          while (true) {
            const next = await iterator.next();
            if (next.done || !next.value) break;
            const val = next.value;
            yield { delta: val.delta, done: val.done, provider: provider.id, model: provider.model };
            if (val.done) { timeout.clear(); return; }
          }
        } catch (e) {
          if (firstChunkTimer) clearTimeout(firstChunkTimer);
          throw e;
        }

        timeout.clear();
        return;
      }
      // Fallback: non-streaming generate, emit as single chunk
      const result = await provider.generate({ ...request, signal: timeout.controller.signal });
      timeout.clear();
      yield { delta: result.content, done: true, provider: provider.id, model: provider.model };
      return;
    } catch {
      timeout.clear();
      // Try next provider
    }
  }

  throw new Error("No LLM provider succeeded for streaming");
}
