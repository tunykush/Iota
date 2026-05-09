import type { LlmGenerateRequest, LlmGenerateResult, LlmProvider } from "../types";

const GROQ_BASE_URL = process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1";
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";
const GROQ_DEFAULT_TOKENS = Number(process.env.GROQ_MAX_TOKENS ?? 2000);

export function createGroqProvider(model = GROQ_MODEL): LlmProvider {
  return {
    id: "groq",
    model,
    isConfigured: () => Boolean(process.env.GROQ_API_KEY),
    async generate(request: LlmGenerateRequest): Promise<LlmGenerateResult> {
      const started = Date.now();
      const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: request.messages,
          temperature: request.temperature ?? 0.2,
          max_tokens: request.maxTokens ?? GROQ_DEFAULT_TOKENS,
        }),
        signal: request.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Groq failed (${res.status}): ${text.slice(0, 240)}`);
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        throw new Error("Groq returned an empty response");
      }

      return { content: content.trim(), provider: "groq", model, latencyMs: Date.now() - started };
    },
  };
}