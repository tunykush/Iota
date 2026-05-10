export type LlmRole = "system" | "user" | "assistant";

export type LlmMessage = {
  role: LlmRole;
  content: string;
};

export type LlmProviderId = "zai" | "deepseek" | "groq" | "gemini" | "openrouter" | "extractive";

export type LlmGenerateRequest = {
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
};

export type LlmGenerateResult = {
  content: string;
  provider: LlmProviderId;
  model: string;
  latencyMs: number;
};

export type LlmStreamChunk = {
  delta: string;
  done: boolean;
};

export interface LlmProvider {
  id: LlmProviderId;
  model: string;
  isConfigured(): boolean;
  generate(request: LlmGenerateRequest): Promise<LlmGenerateResult>;
  /** Optional streaming support — yields text deltas */
  generateStream?(request: LlmGenerateRequest): AsyncGenerator<LlmStreamChunk, void, unknown>;
}

export type LlmRouterResult = LlmGenerateResult & {
  attempts: Array<{
    provider: LlmProviderId;
    model: string;
    ok: boolean;
    error?: string;
    latencyMs: number;
  }>;
};