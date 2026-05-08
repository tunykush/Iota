import type { LlmGenerateRequest, LlmGenerateResult, LlmProvider } from "../types";

const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? "openai/gpt-oss-20b:free";
const OPENROUTER_MAX_TOKENS = Number(process.env.OPENROUTER_MAX_TOKENS ?? 450);

export function createOpenRouterProvider(model = OPENROUTER_MODEL): LlmProvider {
  return {
    id: "openrouter",
    model,
    isConfigured: () => Boolean(process.env.OPENROUTER_API_KEY),
    async generate(request: LlmGenerateRequest): Promise<LlmGenerateResult> {
      const started = Date.now();
      const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
          "X-Title": process.env.OPENROUTER_APP_NAME ?? "Iota",
        },
        body: JSON.stringify({
          model,
          messages: request.messages,
          temperature: request.temperature ?? 0.2,
          max_tokens: Math.min(request.maxTokens ?? OPENROUTER_MAX_TOKENS, OPENROUTER_MAX_TOKENS),
        }),
        signal: request.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`OpenRouter ${model} failed (${res.status}): ${text.slice(0, 240)}`);
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        throw new Error(`OpenRouter ${model} returned an empty response`);
      }

      return { content: content.trim(), provider: "openrouter", model, latencyMs: Date.now() - started };
    },
  };
}