"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { MessageList, ChatComposer, CitationPanel } from "@/components/chat";
import type { Message, Citation, ChatState } from "@/types";

/* ── Mock: simulate RAG response (replace with real API later) ── */
const MOCK_DELAY = 1800;

const mockResponses: { content: string; citations: Citation[] }[] = [
  {
    content:
      "Theo tài liệu đã cung cấp, Private RAG Chatbot sử dụng kiến trúc retrieval-augmented generation [1]. Hệ thống ingest PDF, website, và structured database records, chuyển đổi thành vector embeddings, sau đó retrieve relevant chunks để LLM trả lời có citation [2].\n\nChunk size mặc định là 500-1000 tokens với overlap 100-200 tokens [1].",
    citations: [
      {
        index: 1,
        sourceType: "pdf",
        title: "PRD.md",
        detail: "§1 Executive Summary",
        snippet:
          "Private RAG Chatbot is an AI assistant that answers questions using private knowledge supplied by the user.",
        score: 0.94,
      },
      {
        index: 2,
        sourceType: "pdf",
        title: "CLAUDE.md",
        detail: "RAG Implementation Rules",
        snippet:
          "Chunk size target: 500-1000 tokens. Chunk overlap target: 100-200 tokens.",
        score: 0.87,
      },
    ],
  },
  {
    content:
      "Hệ thống hỗ trợ 3 loại nguồn dữ liệu chính [1]:\n\n• **PDF files** — upload qua web UI, extract text với page numbers cho citations\n• **Website URLs** — crawl, clean HTML, lưu source URL\n• **Structured database** — convert records thành text passages\n\nMỗi loại đều được chunk, embed, và lưu với metadata để truy xuất [2].",
    citations: [
      {
        index: 1,
        sourceType: "pdf",
        title: "PRD.md",
        detail: "§5.2–5.4 Ingestion Requirements",
        snippet:
          "Users must be able to upload PDF files through the web UI.",
        score: 0.91,
      },
      {
        index: 2,
        sourceType: "url",
        title: "Architecture Overview",
        detail: "docs/technical/ARCHITECTURE.md",
        snippet:
          "Each source type is chunked, embedded, and stored with metadata.",
        score: 0.82,
      },
    ],
  },
  {
    content:
      "Authentication sử dụng user-scoped isolation [1]. Mọi document, chunk, embedding, crawl job, và chat conversation đều được gắn với `user_id`. Users chỉ có thể truy cập dữ liệu của chính mình [2].\n\nPhương thức auth cụ thể (JWT, session cookies, hay managed provider) vẫn đang là open question.",
    citations: [
      {
        index: 1,
        sourceType: "pdf",
        title: "PRD.md",
        detail: "§5.1 FR-001 to FR-003",
        snippet:
          "Every document, chunk, embedding, crawl job, and chat conversation must be scoped to a user_id.",
        score: 0.96,
      },
      {
        index: 2,
        sourceType: "db",
        title: "Database Schema",
        detail: "users table → user_id FK",
        snippet:
          "User isolation columns and indexes are present on private resources.",
        score: 0.79,
      },
    ],
  },
];

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatState, setChatState] = useState<ChatState>("idle");
  const [responseIdx, setResponseIdx] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Collect all citations from assistant messages
  const allCitations = useMemo(() => {
    const cites: Citation[] = [];
    for (const m of messages) {
      if (m.role === "assistant" && m.citations) {
        for (const c of m.citations) {
          if (!cites.find((x) => x.index === c.index && x.title === c.title)) {
            cites.push(c);
          }
        }
      }
    }
    return cites;
  }, [messages]);

  const handleSend = useCallback(
    (text: string) => {
      // Add user message
      const userMsg: Message = {
        id: generateId(),
        role: "user",
        content: text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setChatState("loading");

      // Simulate RAG retrieval + LLM response
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        const mock = mockResponses[responseIdx % mockResponses.length];
        const botMsg: Message = {
          id: generateId(),
          role: "assistant",
          content: mock.content,
          citations: mock.citations,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, botMsg]);
        setChatState("idle");
        setResponseIdx((i) => i + 1);
        timeoutRef.current = null;
      }, MOCK_DELAY);
    },
    [responseIdx],
  );

  const handleRetry = useCallback(() => {
    setChatState("idle");
  }, []);

  const sourceCount = allCitations.length;
  const docCount = new Set(allCitations.map((c) => c.title)).size;

  return (
    <div className="chat-workspace">
      {/* Header */}
      <div className="p-4 lg:px-6 border-b border-black/10">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2">
            <span className="w-4 h-px bg-accent" />
            <span className="section-label text-[10px]">Chat workspace</span>
            <span className="text-muted text-[10px] font-mono">· N° 02</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-display font-medium tracking-tight">
            Ask your knowledge base<span className="text-accent">.</span>
          </h1>
          <div className="flex gap-2">
            <span className="dash-badge">
              TOP 5
            </span>
            <span className="dash-badge">
              {sourceCount} SRC
            </span>
            <span className="dash-badge">
              {docCount} DOC
            </span>
          </div>
        </div>
      </div>

      {/* Main content: chat + citation sidebar */}
      <div className="chat-layout flex-1 min-h-0 p-4 lg:px-6">
        {/* Chat column */}
        <div className="chat-card min-h-0 flex flex-col">
          <div className="chat-head">
            <span className="dot" />
            <span>iota · retrieval session</span>
            <span className="src">
              <span>TOP 5</span>
              <span>{sourceCount} SRC</span>
            </span>
          </div>
          <MessageList
            messages={messages}
            chatState={chatState}
            onRetry={handleRetry}
          />
          <ChatComposer onSend={handleSend} chatState={chatState} />
        </div>

        {/* Citation sidebar (desktop) */}
        <div className="hidden lg:block">
          {allCitations.length > 0 ? (
            <CitationPanel citations={allCitations} />
          ) : (
            <div className="citation-panel">
              <div className="citation-panel-head">
                <span className="dot" />
                <span>Sources</span>
                <span className="ml-auto font-mono text-[9px] tracking-wider opacity-60">
                  0 SRC
                </span>
              </div>
              <div className="p-6 text-center">
                <p className="text-[11px] text-muted font-mono tracking-wider uppercase">
                  No sources yet
                </p>
                <p className="text-[11px] text-muted mt-1">
                  Ask a question to see referenced sources here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
