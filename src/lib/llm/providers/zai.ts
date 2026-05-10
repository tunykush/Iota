import type { LlmGenerateRequest, LlmGenerateResult, LlmProvider, LlmStreamChunk } from "../types";

const ZAI_BASE_URL = process.env.ZAI_BASE_URL ?? "https://open.bigmodel.cn/api/paas/v4";

type ZaiModelKey = "glm-4.5-flash" | "glm-4.7" | "glm-4.6" | "glm-4.5";

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
    async *generateStream(request: LlmGenerateRequest): AsyncGenerator<LlmStreamChunk, void, unknown> {
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
          stream: true,
        }),
        signal: request.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Z.ai ${model} stream failed (${res.status}): ${text.slice(0, 240)}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Z.ai stream: no body reader");
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
