// ─── Mock In-Memory Database ───────────────────────────────────
// Simulates a production database with realistic data.
// Replace with real DB calls when FastAPI backend is ready.
// All data is scoped to MOCK_USER_ID to simulate user isolation (FR-002, FR-003).

import type {
  Document,
  IngestionJob,
  Conversation,
  ConversationMessage,
  DashboardStats,
} from "./types";

export const MOCK_USER_ID = "usr_ada_lovelace_001";

// ─── Documents ────────────────────────────────────────────────
export const mockDocuments: Document[] = [
  {
    id: "doc_001",
    sourceType: "pdf",
    title: "Q3-board-deck.pdf",
    originalFilename: "Q3-board-deck.pdf",
    status: "ready",
    chunkCount: 142,
    createdAt: "2026-05-06T09:00:00Z",
    updatedAt: "2026-05-06T09:04:12Z",
  },
  {
    id: "doc_002",
    sourceType: "pdf",
    title: "onboarding-guide.pdf",
    originalFilename: "onboarding-guide.pdf",
    status: "ready",
    chunkCount: 88,
    createdAt: "2026-05-05T14:30:00Z",
    updatedAt: "2026-05-05T14:32:45Z",
  },
  {
    id: "doc_003",
    sourceType: "website",
    title: "docs.example.com",
    url: "https://docs.example.com",
    status: "processing",
    chunkCount: 0,
    createdAt: "2026-05-07T08:00:00Z",
    updatedAt: "2026-05-07T08:00:00Z",
  },
  {
    id: "doc_004",
    sourceType: "database",
    title: "metrics-q3.csv",
    status: "ready",
    chunkCount: 24,
    createdAt: "2026-05-04T11:00:00Z",
    updatedAt: "2026-05-04T11:01:30Z",
  },
  {
    id: "doc_005",
    sourceType: "pdf",
    title: "product-spec-v2.pdf",
    originalFilename: "product-spec-v2.pdf",
    status: "failed",
    chunkCount: 0,
    createdAt: "2026-05-03T16:00:00Z",
    updatedAt: "2026-05-03T16:00:45Z",
  },
  {
    id: "doc_006",
    sourceType: "pdf",
    title: "legal-terms-2026.pdf",
    originalFilename: "legal-terms-2026.pdf",
    status: "ready",
    chunkCount: 210,
    createdAt: "2026-05-02T10:00:00Z",
    updatedAt: "2026-05-02T10:06:00Z",
  },
  {
    id: "doc_007",
    sourceType: "website",
    title: "company-blog.example.com",
    url: "https://blog.example.com",
    status: "ready",
    chunkCount: 56,
    createdAt: "2026-05-01T09:00:00Z",
    updatedAt: "2026-05-01T09:03:20Z",
  },
  {
    id: "doc_008",
    sourceType: "pdf",
    title: "research-paper-rag.pdf",
    originalFilename: "research-paper-rag.pdf",
    status: "ready",
    chunkCount: 320,
    createdAt: "2026-04-30T15:00:00Z",
    updatedAt: "2026-04-30T15:08:00Z",
  },
  {
    id: "doc_009",
    sourceType: "database",
    title: "customer-feedback-db",
    status: "ready",
    chunkCount: 180,
    createdAt: "2026-04-29T12:00:00Z",
    updatedAt: "2026-04-29T12:05:00Z",
  },
];

// ─── Ingestion Jobs ────────────────────────────────────────────
export const mockJobs: IngestionJob[] = [
  {
    id: "job_001",
    documentId: "doc_001",
    status: "succeeded",
    stage: "storing",
    createdAt: "2026-05-06T09:00:00Z",
    completedAt: "2026-05-06T09:04:12Z",
  },
  {
    id: "job_002",
    documentId: "doc_002",
    status: "succeeded",
    stage: "storing",
    createdAt: "2026-05-05T14:30:00Z",
    completedAt: "2026-05-05T14:32:45Z",
  },
  {
    id: "job_003",
    documentId: "doc_003",
    status: "running",
    stage: "chunking",
    createdAt: "2026-05-07T08:00:00Z",
  },
  {
    id: "job_004",
    documentId: "doc_004",
    status: "succeeded",
    stage: "storing",
    createdAt: "2026-05-04T11:00:00Z",
    completedAt: "2026-05-04T11:01:30Z",
  },
  {
    id: "job_005",
    documentId: "doc_005",
    status: "failed",
    stage: "extracting",
    errorMessage: "PDF is password-protected or corrupted. Please check the file and try again.",
    createdAt: "2026-05-03T16:00:00Z",
    completedAt: "2026-05-03T16:00:45Z",
  },
];

// ─── Conversations ─────────────────────────────────────────────
export const mockConversations: Conversation[] = [
  {
    id: "conv_001",
    title: "Q3 customer interviews — onboarding",
    createdAt: "2026-05-07T21:00:00Z",
    updatedAt: "2026-05-07T21:02:00Z",
    messageCount: 4,
  },
  {
    id: "conv_002",
    title: "Board deck revenue section summary",
    createdAt: "2026-05-07T20:00:00Z",
    updatedAt: "2026-05-07T20:01:30Z",
    messageCount: 2,
  },
  {
    id: "conv_003",
    title: "API rate limits — docs",
    createdAt: "2026-05-07T18:00:00Z",
    updatedAt: "2026-05-07T18:01:00Z",
    messageCount: 3,
  },
];

// ─── Chat Messages ─────────────────────────────────────────────
export const mockMessages: Record<string, ConversationMessage[]> = {
  conv_001: [
    {
      id: "msg_001_1",
      role: "user",
      content: "What did Q3 customer interviews say about onboarding?",
      createdAt: "2026-05-07T21:00:00Z",
    },
    {
      id: "msg_001_2",
      role: "assistant",
      content:
        "Theo tài liệu đã cung cấp, các cuộc phỏng vấn khách hàng Q3 cho thấy onboarding là điểm đau chính [1]. Khách hàng mới mất trung bình 3-4 ngày để hoàn thành setup ban đầu [2].\n\nCác vấn đề chính được đề cập:\n• **Thiếu hướng dẫn step-by-step** — 68% người dùng mới cảm thấy bị overwhelmed\n• **Documentation không đồng bộ** với UI thực tế [1]\n• **Không có in-app guidance** trong lần đầu sử dụng [2]",
      createdAt: "2026-05-07T21:00:30Z",
      sources: [
        {
          documentId: "doc_001",
          chunkId: "chunk_q3_01",
          title: "Q3-board-deck.pdf",
          sourceType: "pdf",
          pageNumber: 12,
          score: 0.94,
          snippet: "Customer interviews revealed onboarding as the primary pain point with 68% of new users feeling overwhelmed.",
        },
        {
          documentId: "doc_002",
          chunkId: "chunk_onb_01",
          title: "onboarding-guide.pdf",
          sourceType: "pdf",
          pageNumber: 3,
          score: 0.87,
          snippet: "Average time to complete initial setup: 3-4 days for new customers.",
        },
      ],
    },
  ],
  conv_002: [
    {
      id: "msg_002_1",
      role: "user",
      content: "Summarise the board deck revenue section.",
      createdAt: "2026-05-07T20:00:00Z",
    },
    {
      id: "msg_002_2",
      role: "assistant",
      content:
        "Revenue grew 18% QoQ to $4.2M [1]. Churn dropped to 2.1% [2] after the onboarding revamp.",
      createdAt: "2026-05-07T20:00:45Z",
      sources: [
        {
          documentId: "doc_001",
          chunkId: "chunk_q3_rev",
          title: "Q3-board-deck.pdf",
          sourceType: "pdf",
          pageNumber: 7,
          score: 0.96,
          snippet: "Revenue grew 18% QoQ to $4.2M driven by enterprise expansion.",
        },
        {
          documentId: "doc_004",
          chunkId: "chunk_metrics_01",
          title: "metrics-q3.csv",
          sourceType: "database",
          score: 0.82,
          snippet: "Churn rate: 2.1% — row 42",
        },
      ],
    },
  ],
};

// ─── Dashboard Stats ───────────────────────────────────────────
export const mockDashboardStats: DashboardStats = {
  documentCount: 14,
  processingCount: 1,
  chunkCount: 18442,
  queryCountToday: 37,
  queryCountYesterday: 25,
  avgAnswerMs: 2800,
};

// ─── RAG Mock Responses ────────────────────────────────────────
// Rotated round-robin to simulate varied answers during development.
export const mockRagResponses = [
  {
    content:
      "Theo tài liệu đã cung cấp, Private RAG Chatbot sử dụng kiến trúc retrieval-augmented generation [1]. Hệ thống ingest PDF, website, và structured database records, chuyển đổi thành vector embeddings, sau đó retrieve relevant chunks để LLM trả lời có citation [2].\n\nChunk size mặc định là 500-1000 tokens với overlap 100-200 tokens [1].",
    sources: [
      {
        documentId: "doc_001",
        chunkId: "chunk_prd_01",
        title: "Q3-board-deck.pdf",
        sourceType: "pdf" as const,
        pageNumber: 1,
        score: 0.94,
        snippet: "Private RAG Chatbot is an AI assistant that answers questions using private knowledge supplied by the user.",
      },
      {
        documentId: "doc_002",
        chunkId: "chunk_claude_01",
        title: "onboarding-guide.pdf",
        sourceType: "pdf" as const,
        pageNumber: 5,
        score: 0.87,
        snippet: "Chunk size target: 500-1000 tokens. Chunk overlap target: 100-200 tokens.",
      },
    ],
  },
  {
    content:
      "Hệ thống hỗ trợ 3 loại nguồn dữ liệu chính [1]:\n\n• **PDF files** — upload qua web UI, extract text với page numbers cho citations\n• **Website URLs** — crawl, clean HTML, lưu source URL\n• **Structured database** — convert records thành text passages\n\nMỗi loại đều được chunk, embed, và lưu với metadata để truy xuất [2].",
    sources: [
      {
        documentId: "doc_001",
        chunkId: "chunk_prd_02",
        title: "Q3-board-deck.pdf",
        sourceType: "pdf" as const,
        pageNumber: 8,
        score: 0.91,
        snippet: "Users must be able to upload PDF files through the web UI.",
      },
      {
        documentId: "doc_007",
        chunkId: "chunk_arch_01",
        title: "company-blog.example.com",
        sourceType: "website" as const,
        url: "https://blog.example.com/architecture",
        score: 0.82,
        snippet: "Each source type is chunked, embedded, and stored with metadata.",
      },
    ],
  },
  {
    content:
      "Authentication sử dụng user-scoped isolation [1]. Mọi document, chunk, embedding, crawl job, và chat conversation đều được gắn với `user_id`. Users chỉ có thể truy cập dữ liệu của chính mình [2].\n\nPhương thức auth cụ thể (JWT, session cookies, hay managed provider) vẫn đang là open question.",
    sources: [
      {
        documentId: "doc_001",
        chunkId: "chunk_prd_auth",
        title: "Q3-board-deck.pdf",
        sourceType: "pdf" as const,
        pageNumber: 15,
        score: 0.96,
        snippet: "Every document, chunk, embedding, crawl job, and chat conversation must be scoped to a user_id.",
      },
      {
        documentId: "doc_004",
        chunkId: "chunk_db_01",
        title: "metrics-q3.csv",
        sourceType: "database" as const,
        score: 0.79,
        snippet: "User isolation columns and indexes are present on private resources.",
      },
    ],
  },
  {
    content:
      "Tôi chưa tìm thấy thông tin này trong dữ liệu đã được cung cấp. Hãy thử upload thêm tài liệu liên quan hoặc đặt câu hỏi theo cách khác.",
    sources: [],
  },
];

// ─── Helpers ───────────────────────────────────────────────────
let ragResponseIndex = 0;

export function getNextRagResponse() {
  const response = mockRagResponses[ragResponseIndex % mockRagResponses.length];
  ragResponseIndex++;
  return response;
}

export function generateId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function simulateDelay(ms = 800): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
