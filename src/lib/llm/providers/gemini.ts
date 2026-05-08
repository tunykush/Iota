import type { LlmGenerateRequest, LlmGenerateResult, LlmProvider } from "../types";

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";
const GEMINI_BASE_URL = process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta";

function toGeminiContents(messages: LlmGenerateRequest["messages"]) {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  return messages
    .filter((m) => m.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: system && message.role === "user" ? `${system}\n\n${message.content}` : message.content }],
    }));
}

export function createGeminiProvider(): LlmProvider {
  return {
    id: "gemini",
    model: GEMINI_MODEL,
    isConfigured: () => Boolean(process.env.GEMINI_API_KEY),
    async generate(request: LlmGenerateRequest): Promise<LlmGenerateResult> {
      const started = Date.now();
      const url = `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: toGeminiContents(request.messages),
          generationConfig: {
            temperature: request.temperature ?? 0.2,
            maxOutputTokens: request.maxTokens ?? 900,
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

      return { content: content.trim(), provider: "gemini", model: GEMINI_MODEL, latencyMs: Date.now() - started };
    },
  };
}