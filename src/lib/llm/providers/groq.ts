import type { LlmGenerateRequest, LlmGenerateResult, LlmProvider } from "../types";

const DEFAULT_GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";
const DEFAULT_GROQ_TOKENS = 2000;

export function createGroqProvider(model?: string): LlmProvider {
  const resolvedModel = model ?? process.env.GROQ_MODEL ?? DEFAULT_GROQ_MODEL;
  const baseUrl = process.env.GROQ_BASE_URL ?? DEFAULT_GROQ_BASE_URL;
  const defaultTokens = Number(process.env.GROQ_MAX_TOKENS ?? DEFAULT_GROQ_TOKENS);

  return {
    id: "groq",
    model: resolvedModel,
    isConfigured: () => Boolean(process.env.GROQ_API_KEY),
    async generate(request: LlmGenerateRequest): Promise<LlmGenerateResult> {
      const started = Date.now();
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
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
        throw new Error(`Groq failed (${res.status}): ${text.slice(0, 240)}`);
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        throw new Error("Groq returned an empty response");
      }

      return { content: content.trim(), provider: "groq", model: resolvedModel, latencyMs: Date.now() - started };
    },
  };
}