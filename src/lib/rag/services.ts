import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatGenerationMode } from "@/lib/api/types";
import { embedTexts, getEmbeddingModelMetadata, type EmbeddingModelMetadata } from "@/lib/embeddings";
import { generateWithFallback } from "@/lib/llm/router";
import type { LlmGenerateRequest, LlmRouterResult } from "@/lib/llm/types";
import { ingestDocumentChunks, type IngestDocumentChunksInput, type IngestDocumentInput, ingestDocumentText, markIngestionFailed, type MarkIngestionFailedInput } from "./ingestion";
import { retrieveRelevantChunks, type RetrievedChunk, type RetrieveRelevantChunksInput } from "./retrieval";
import { runHybridRagChat, type RagChatResult } from "./chat";

export type EmbeddingGateway = {
  embedTexts: typeof embedTexts;
  getMetadata: () => EmbeddingModelMetadata;
};

export type LlmGateway = {
  generate: (input: LlmGenerateRequest) => Promise<LlmRouterResult>;
};

export type RetrievalService = {
  retrieveRelevantChunks(input: RetrieveRelevantChunksInput): Promise<RetrievedChunk[]>;
};

export type IngestionService = {
  ingestDocumentChunks(input: IngestDocumentChunksInput): Promise<number>;
  ingestDocumentText(input: IngestDocumentInput): Promise<number>;
  markFailed(input: MarkIngestionFailedInput): Promise<void>;
};

export type TaskService = {
  markFailed(input: MarkIngestionFailedInput): Promise<void>;
};

export type ModelService = {
  embeddings: EmbeddingGateway;
  llm: LlmGateway;
};

export type RagChatService = {
  run(input: {
    supabase: SupabaseClient;
    userId: string;
    message: string;
    topK?: number;
    documentIds?: string[];
    mode?: ChatGenerationMode;
  }): Promise<RagChatResult>;
};

export type RagServices = {
  embeddings: EmbeddingGateway;
  llm: LlmGateway;
  retrieval: RetrievalService;
  ingestion: IngestionService;
  chat: RagChatService;
  tasks: TaskService;
  models: ModelService;
};

export class IotaModelService implements ModelService {
  embeddings = { embedTexts, getMetadata: getEmbeddingModelMetadata };
  llm = { generate: generateWithFallback };
}

export class IotaRetrievalService implements RetrievalService {
  retrieveRelevantChunks(input: RetrieveRelevantChunksInput) {
    return retrieveRelevantChunks(input);
  }
}

export class IotaDocumentIngestionService implements IngestionService {
  ingestDocumentChunks(input: IngestDocumentChunksInput) {
    return ingestDocumentChunks(input);
  }

  ingestDocumentText(input: IngestDocumentInput) {
    return ingestDocumentText(input);
  }

  markFailed(input: MarkIngestionFailedInput) {
    return markIngestionFailed(input);
  }
}

export class IotaTaskService implements TaskService {
  markFailed(input: MarkIngestionFailedInput) {
    return markIngestionFailed(input);
  }
}

export class IotaChatOrchestrationService implements RagChatService {
  run(input: Parameters<RagChatService["run"]>[0]) {
    return runHybridRagChat(input);
  }
}

export function createRagServices(): RagServices {
  const models = new IotaModelService();
  const retrieval = new IotaRetrievalService();
  const ingestion = new IotaDocumentIngestionService();
  const tasks = new IotaTaskService();
  const chat = new IotaChatOrchestrationService();

  return {
    embeddings: models.embeddings,
    llm: models.llm,
    retrieval,
    ingestion,
    chat,
    tasks,
    models,
  };
}

export const ragServices = createRagServices();