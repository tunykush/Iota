import type { LlmGenerateRequest, LlmGenerateResult, LlmProvider } from "../types";

const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash-lite";
const DEFAULT_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_GEMINI_TOKENS = 2000;

function toGeminiContents(messages: LlmGenerateRequest["messages"]) {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  let systemPrepended = false;
  return messages
    .filter((m) => m.role !== "system")
    .map((message) => {
      let text = message.content;
      if (system && message.role === "user" && !systemPrepended) {
        text = `${system}\n\n${message.content}`;
        systemPrepended = true;
      }
      return {
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text }],
      };
    });
}

export function createGeminiProvider(model?: string): LlmProvider {
  const resolvedModel = model ?? process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
  const baseUrl = process.env.GEMINI_BASE_URL ?? DEFAULT_GEMINI_BASE_URL;
  const defaultTokens = Number(process.env.GEMINI_MAX_TOKENS ?? DEFAULT_GEMINI_TOKENS);

  return {
    id: "gemini",
    model: resolvedModel,
    isConfigured: () => Boolean(process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY),
    async generate(request: LlmGenerateRequest): Promise<LlmGenerateResult> {
      const started = Date.now();
      const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      const url = `${baseUrl}/models/${resolvedModel}:generateContent`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey ?? "" },
        body: JSON.stringify({
          contents: toGeminiContents(request.messages),
          generationConfig: {
            temperature: request.temperature ?? 0.2,
            maxOutputTokens: request.maxTokens ?? defaultTokens,
          },
        }),
        signal: request.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Gemini failed (${res.status}): ${text.slice(0, 240)}`);
      }

      const data = await res.json();
      const content = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
      if (typeof content !== "string" || !content.trim()) {
        throw new Error("Gemini returned an empty response");
      }

      return { content: content.trim(), provider: "gemini", model: resolvedModel, latencyMs: Date.now() - started };
    },
  };
}