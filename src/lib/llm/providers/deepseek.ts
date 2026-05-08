import type { LlmGenerateRequest, LlmGenerateResult, LlmProvider } from "../types";

const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";

export function createDeepSeekProvider(): LlmProvider {
  return {
    id: "deepseek",
    model: DEEPSEEK_MODEL,
    isConfigured: () => Boolean(process.env.DEEPSEEK_API_KEY),
    async generate(request: LlmGenerateRequest): Promise<LlmGenerateResult> {
      const started = Date.now();
      const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: DEEPSEEK_MODEL,
          messages: request.messages,
          temperature: request.temperature ?? 0.2,
          max_tokens: request.maxTokens ?? 900,
        }),
        signal: request.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`DeepSeek ${DEEPSEEK_MODEL} failed (${res.status}): ${text.slice(0, 240)}`);
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        throw new Error(`DeepSeek ${DEEPSEEK_MODEL} returned an empty response`);
      }

      return { content: content.trim(), provider: "deepseek", model: DEEPSEEK_MODEL, latencyMs: Date.now() - started };
    },
  };
}