import type { LlmGenerateRequest, LlmGenerateResult, LlmProvider } from "../types";

const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_OPENROUTER_MODEL = "openai/gpt-oss-20b:free";
const DEFAULT_OPENROUTER_TOKENS = 2000;

export function createOpenRouterProvider(model?: string): LlmProvider {
  const resolvedModel = model ?? process.env.OPENROUTER_MODEL ?? DEFAULT_OPENROUTER_MODEL;
  const baseUrl = process.env.OPENROUTER_BASE_URL ?? DEFAULT_OPENROUTER_BASE_URL;
  const defaultTokens = Number(process.env.OPENROUTER_MAX_TOKENS ?? DEFAULT_OPENROUTER_TOKENS);

  return {
    id: "openrouter",
    model: resolvedModel,
    isConfigured: () => Boolean(process.env.OPENROUTER_API_KEY),
    async generate(request: LlmGenerateRequest): Promise<LlmGenerateResult> {
      const started = Date.now();
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
          "X-Title": process.env.OPENROUTER_APP_NAME ?? "Iota",
        },
        body: JSON.stringify({
          model: resolvedModel,
          messages: request.messages,
          temperature: request.temperature ?? 0.2,
          max_tokens: request.maxTokens ?? defaultTokens,
        }),
        signal: request.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`OpenRouter ${resolvedModel} failed (${res.status}): ${text.slice(0, 240)}`);
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        throw new Error(`OpenRouter ${resolvedModel} returned an empty response`);
      }

      return { content: content.trim(), provider: "openrouter", model: resolvedModel, latencyMs: Date.now() - started };
    },
  };
}