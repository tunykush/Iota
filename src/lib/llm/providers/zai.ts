import type { LlmGenerateRequest, LlmGenerateResult, LlmProvider } from "../types";

const ZAI_BASE_URL = process.env.ZAI_BASE_URL ?? "https://open.bigmodel.cn/api/paas/v4";

type ZaiModelKey = "glm-4.7" | "glm-4.6" | "glm-4.5";

export function createZaiProvider(model: ZaiModelKey): LlmProvider {
  return {
    id: "zai",
    model,
    isConfigured: () => Boolean(process.env.ZAI_API_KEY),
    async generate(request: LlmGenerateRequest): Promise<LlmGenerateResult> {
      const started = Date.now();
      const res = await fetch(`${ZAI_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.ZAI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: request.messages,
          temperature: request.temperature ?? 0.2,
          max_tokens: request.maxTokens ?? 900,
        }),
        signal: request.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Z.ai ${model} failed (${res.status}): ${text.slice(0, 240)}`);
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        throw new Error(`Z.ai ${model} returned an empty response`);
      }

      return { content: content.trim(), provider: "zai", model, latencyMs: Date.now() - started };
    },
  };
}