// ─── API Client ────────────────────────────────────────────────
// Typed fetch wrappers for every API endpoint.
// BASE_URL defaults to "" (same-origin Next.js routes).
// To proxy to FastAPI: set NEXT_PUBLIC_API_URL=http://localhost:8000/api

import type {
  HealthResponse,
  DocumentListResponse,
  DocumentListParams,
  Document,
  UploadPdfResponse,
  CrawlUrlRequest,
  CrawlUrlResponse,
  IngestionJob,
  ChatRequest,
  ChatResponse,
  ConversationListResponse,
  ConversationDetailResponse,
  DashboardResponse,
  AdminOverviewResponse,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

// ─── Core fetch helper ─────────────────────────────────────────
async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json();

  if (!res.ok) {
    const message =
      data?.error?.message ?? `API error ${res.status}`;
    const err = new Error(message) as Error & { code?: string; status?: number; details?: unknown };
    err.code = data?.error?.code;
    err.status = res.status;
    err.details = data?.error?.details;
    throw err;
  }

  return data as T;
}

// ─── Health ────────────────────────────────────────────────────
export const healthApi = {
  get: () => apiFetch<HealthResponse>("/health"),
};

// ─── Documents ────────────────────────────────────────────────
export const documentsApi = {
  list: (params?: DocumentListParams) => {
    const qs = new URLSearchParams();
    if (params?.sourceType) qs.set("sourceType", params.sourceType);
    if (params?.status) qs.set("status", params.status);
    const query = qs.toString() ? `?${qs}` : "";
    return apiFetch<DocumentListResponse>(`/documents${query}`);
  },

  get: (documentId: string) =>
    apiFetch<{ document: Document; job: IngestionJob | null }>(`/documents/${documentId}`),

  uploadPdf: (file: File, title?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (title) form.append("title", title);
    return apiFetch<UploadPdfResponse>("/documents/upload-pdf", {
      method: "POST",
      // Let browser set multipart boundary — remove Content-Type override
      headers: {},
      body: form,
    });
  },

  crawlUrl: (body: CrawlUrlRequest) =>
    apiFetch<CrawlUrlResponse>("/documents/crawl-url", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  delete: (documentId: string) =>
    apiFetch<void>(`/documents/${documentId}`, { method: "DELETE" }),
};

// ─── Ingestion Jobs ────────────────────────────────────────────
export const ingestionJobsApi = {
  get: (jobId: string) => apiFetch<IngestionJob>(`/ingestion-jobs/${jobId}`),
};

// ─── Chat ──────────────────────────────────────────────────────
export const chatApi = {
  send: (body: ChatRequest) =>
    apiFetch<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listConversations: () =>
    apiFetch<ConversationListResponse>("/chat/history"),

  getConversation: (conversationId: string) =>
    apiFetch<ConversationDetailResponse>(`/chat/history/${conversationId}`),

  deleteConversation: (conversationId: string) =>
    apiFetch<void>(`/chat/history/${conversationId}`, { method: "DELETE" }),
};

// ─── Dashboard ─────────────────────────────────────────────────
export const dashboardApi = {
  get: () => apiFetch<DashboardResponse>("/dashboard"),
};

// ─── Admin ──────────────────────────────────────────────────────
export const adminApi = {
  overview: () => apiFetch<AdminOverviewResponse>("/admin/overview"),
};
