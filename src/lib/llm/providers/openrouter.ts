import type { LlmGenerateRequest, LlmGenerateResult, LlmProvider, LlmStreamChunk } from "../types";

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
    async *generateStream(request: LlmGenerateRequest): AsyncGenerator<LlmStreamChunk, void, unknown> {
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
          stream: true,
        }),
        signal: request.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`OpenRouter ${resolvedModel} stream failed (${res.status}): ${text.slice(0, 240)}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("OpenRouter stream: no body reader");
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const payload = trimmed.slice(6);
          if (payload === "[DONE]") { yield { delta: "", done: true }; return; }
          try {
            const parsed = JSON.parse(payload);
            const delta = parsed?.choices?.[0]?.delta?.content ?? "";
            if (delta) yield { delta, done: false };
          } catch { /* skip malformed */ }
        }
      }
      yield { delta: "", done: true };
    },
  };
}
