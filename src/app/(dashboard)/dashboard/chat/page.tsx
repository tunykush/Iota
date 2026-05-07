"use client";

import { useMemo } from "react";
import { MessageList, ChatComposer, CitationPanel } from "@/components/chat";
import { useChat } from "@/hooks/useChat";
import type { Message, Citation, ChatState } from "@/types";
import type { LocalMessage } from "@/hooks/useChat";

// ─── Map API LocalMessage → legacy Message type used by MessageList ───
function toMessage(m: LocalMessage): Message {
  const citations: Citation[] = (m.sources ?? []).map((s, i) => ({
    index: i + 1,
    sourceType: s.sourceType === "website" ? "url" : s.sourceType === "database" ? "db" : "pdf",
    title: s.title,
    detail: s.pageNumber ? `p. ${s.pageNumber}` : s.url ?? s.sourceType,
    snippet: s.snippet,
    score: s.score,
  }));

  return {
    id: m.id,
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
    citations: citations.length > 0 ? citations : undefined,
    timestamp: new Date(m.createdAt).getTime(),
    isStreaming: m.isStreaming,
  };
}

export default function ChatPage() {
  const { messages: rawMessages, sending, error, sendMessage, reset } = useChat();

  // Map to legacy Message type
  const messages = useMemo(() => rawMessages.map(toMessage), [rawMessages]);

  // Derive ChatState from hook state
  const chatState: ChatState = sending
    ? "loading"
    : error
      ? "error"
      : "idle";

  // Collect all unique citations from assistant messages
  const allCitations = useMemo(() => {
    const seen = new Set<string>();
    const cites: Citation[] = [];
    for (const m of messages) {
      if (m.role === "assistant" && m.citations) {
        for (const c of m.citations) {
          const key = `${c.title}-${c.index}`;
          if (!seen.has(key)) {
            seen.add(key);
            cites.push(c);
          }
        }
      }
    }
    return cites;
  }, [messages]);

  const handleSend = (text: string) => {
    sendMessage(text).catch(() => {
      // error is already set in hook state
    });
  };

  const handleRetry = () => {
    reset();
  };

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
            <span className="dash-badge">TOP 5</span>
            <span className="dash-badge">{sourceCount} SRC</span>
            <span className="dash-badge">{docCount} DOC</span>
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
