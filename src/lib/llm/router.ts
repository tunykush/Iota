import type { LlmGenerateRequest, LlmProvider, LlmRouterResult, LlmStreamChunk } from "./types";
import { createDeepSeekProvider } from "./providers/deepseek";
import { createGeminiProvider } from "./providers/gemini";
import { createGroqProvider } from "./providers/groq";
import { createOpenRouterProvider } from "./providers/openrouter";
import { createZaiProvider } from "./providers/zai";

function defaultProviders(): LlmProvider[] {
  return [
    createZaiProvider("glm-4.7"),
    createZaiProvider("glm-4.6"),
    createZaiProvider("glm-4.5"),
    createGroqProvider("llama-3.1-8b-instant"),
    createOpenRouterProvider(),
    createOpenRouterProvider("z-ai/glm-4.5-air:free"),
    createOpenRouterProvider("qwen/qwen3-next-80b-a3b-instruct:free"),
    createOpenRouterProvider("nvidia/nemotron-nano-9b-v2:free"),
    createGeminiProvider(),
    createGeminiProvider("gemini-2.0-flash-lite"),
    createGeminiProvider("gemini-2.0-flash"),
    createGeminiProvider("gemini-2.5-flash-lite"),
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
 * Yields text deltas. Falls back to non-streaming generate() if provider lacks streaming.
 */
export async function* streamWithFallback(
  request: Omit<LlmGenerateRequest, "signal">,
  providers = defaultProviders(),
): AsyncGenerator<LlmStreamChunk & { provider: string; model: string }, void, unknown> {
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS ?? 30000);

  for (const provider of providers) {
    if (!provider.isConfigured()) continue;

    const timeout = withTimeout(timeoutMs);
    try {
      if (provider.generateStream) {
        const stream = provider.generateStream({ ...request, signal: timeout.controller.signal });
        for await (const chunk of stream) {
          yield { ...chunk, provider: provider.id, model: provider.model };
          if (chunk.done) { timeout.clear(); return; }
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
