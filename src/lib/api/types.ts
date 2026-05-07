// ─── API Types ────────────────────────────────────────────────
// Mirrors the contracts defined in docs/technical/API.md
// These are the canonical request/response shapes for all API calls.

// ─── Standard error ───────────────────────────────────────────
export type ApiErrorDetail = {
  field?: string;
  message: string;
};

export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
};

// ─── Health ───────────────────────────────────────────────────
export type HealthResponse = {
  status: "ok" | "degraded" | "error";
  version: string;
};

// ─── Documents ────────────────────────────────────────────────
export type DocumentSourceType = "pdf" | "website" | "database";
export type DocumentStatus = "processing" | "ready" | "failed";

export type Document = {
  id: string;
  sourceType: DocumentSourceType;
  title: string;
  originalFilename?: string;
  url?: string;
  status: DocumentStatus;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
};

export type DocumentListResponse = {
  documents: Document[];
  total: number;
};

export type DocumentListParams = {
  sourceType?: DocumentSourceType;
  status?: DocumentStatus;
};

export type UploadPdfResponse = {
  document: Pick<Document, "id" | "sourceType" | "title" | "status" | "createdAt">;
  job: {
    id: string;
    status: "queued";
  };
};

export type CrawlUrlRequest = {
  url: string;
  title?: string;
  crawlDepth?: number;
};

export type CrawlUrlResponse = {
  document: Pick<Document, "id" | "sourceType" | "title" | "status"> & { url: string };
  job: {
    id: string;
    status: "queued";
  };
};

// ─── Ingestion Jobs ───────────────────────────────────────────
export type JobStatus = "queued" | "running" | "succeeded" | "failed";
export type JobStage = "extracting" | "chunking" | "embedding" | "storing";

export type IngestionJob = {
  id: string;
  documentId: string;
  status: JobStatus;
  stage?: JobStage;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
};

// ─── Chat ─────────────────────────────────────────────────────
export type ChatSource = {
  documentId: string;
  chunkId: string;
  title: string;
  sourceType: DocumentSourceType;
  pageNumber?: number;
  url?: string;
  score: number;
  snippet: string;
};

export type ChatMessageResponse = {
  id: string;
  role: "assistant";
  content: string;
  createdAt: string;
};

export type ChatRequest = {
  message: string;
  conversationId?: string | null;
  documentIds?: string[];
  topK?: number;
  language?: string;
};

export type ChatResponse = {
  conversationId: string;
  message: ChatMessageResponse;
  sources: ChatSource[];
};

export type Conversation = {
  id: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
};

export type ConversationListResponse = {
  conversations: Conversation[];
};

export type ConversationMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  sources?: ChatSource[];
};

export type ConversationDetailResponse = {
  conversation: Conversation;
  messages: ConversationMessage[];
};

// ─── Dashboard stats ──────────────────────────────────────────
export type DashboardStats = {
  documentCount: number;
  processingCount: number;
  chunkCount: number;
  queryCountToday: number;
  queryCountYesterday: number;
  avgAnswerMs: number;
};

export type DashboardResponse = {
  stats: DashboardStats;
  recentDocuments: Document[];
  recentConversations: Conversation[];
};

// ─── Admin ─────────────────────────────────────────────────────
export type AdminUserSummary = {
  id: string;
  email?: string;
  name?: string;
  role: "admin" | "user";
  createdAt: string;
  documentCount: number;
  processingCount: number;
  failedJobCount: number;
  conversationCount: number;
  recentMessageCount: number;
};

export type AdminOverviewResponse = {
  stats: {
    userCount: number;
    adminCount: number;
    documentCount: number;
    processingCount: number;
    jobCount: number;
    failedJobCount: number;
    conversationCount: number;
    recentMessageCount: number;
  };
  users: AdminUserSummary[];
  recentDocuments: Array<Pick<Document, "id" | "sourceType" | "title" | "status" | "chunkCount" | "createdAt"> & { userId: string }>;
  recentJobs: Array<{
    id: string;
    userId: string;
    documentId: string;
    jobType: DocumentSourceType;
    status: JobStatus;
    stage?: JobStage;
    errorMessage?: string;
    createdAt: string;
    completedAt?: string;
  }>;
  recentMessages: Array<{
    id: string;
    userId: string;
    conversationId: string;
    role: "user" | "assistant" | "system";
    content: string;
    createdAt: string;
  }>;
};
