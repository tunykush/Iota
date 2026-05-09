import type { LlmGenerateRequest, LlmGenerateResult, LlmProvider } from "../types";

const DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEFAULT_DEEPSEEK_MODEL = "deepseek-chat";

export function createDeepSeekProvider(): LlmProvider {
  const resolvedModel = process.env.DEEPSEEK_MODEL ?? DEFAULT_DEEPSEEK_MODEL;
  const baseUrl = process.env.DEEPSEEK_BASE_URL ?? DEFAULT_DEEPSEEK_BASE_URL;

  return {
    id: "deepseek",
    model: resolvedModel,
    isConfigured: () => Boolean(process.env.DEEPSEEK_API_KEY),
    async generate(request: LlmGenerateRequest): Promise<LlmGenerateResult> {
      const started = Date.now();
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: resolvedModel,
          messages: request.messages,
          temperature: request.temperature ?? 0.2,
          max_tokens: request.maxTokens ?? 900,
        }),
        signal: request.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`DeepSeek ${resolvedModel} failed (${res.status}): ${text.slice(0, 240)}`);
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        throw new Error(`DeepSeek ${resolvedModel} returned an empty response`);
      }

      return { content: content.trim(), provider: "deepseek", model: resolvedModel, latencyMs: Date.now() - started };
    },
  };
}