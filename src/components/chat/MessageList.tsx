"use client";

import { useEffect, useRef } from "react";
import type { Message, ChatState } from "@/types";

function citeText(s: string) {
  return s.replace(/\[(\d+)\]/g, '<span class="cite">[$1]</span>');
}

function formatContent(content: string) {
  return citeText(content)
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n• /g, "<br/>• ")
    .replace(/\n/g, "<br/>");
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";

  return (
    <div className={`msg ${isUser ? "msg-user" : "msg-bot"}`}>
      <div className="avatar">{isUser ? "U" : "ι"}</div>
      <div className="bubble">
        <div
          dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
        />
        {msg.citations && msg.citations.length > 0 && (
          <div className="sources">
            {msg.citations.map((c) => (
              <div key={c.index} className="source">
                <span className="ix">[{c.index}]</span>
                <div>
                  <span className="nm">{c.title}</span>
                  <br />
                  <span>{c.detail}</span>
                  {c.snippet && (
                    <>
                      <br />
                      <span className="text-[9px] opacity-60 italic">"{c.snippet}"</span>
                    </>
                  )}
                </div>
                {c.sourceType && (
                  <span className="ml-auto text-[9px] uppercase tracking-wider opacity-50">
                    {c.sourceType}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        {msg.isStreaming && <span className="cur" />}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="msg msg-bot">
      <div className="avatar">ι</div>
      <div className="bubble">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
          <span className="w-1.5 h-1.5 bg-accent/60 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
          <span className="w-1.5 h-1.5 bg-accent/30 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
          <span className="text-[11px] text-muted ml-2 font-mono tracking-wider">RETRIEVING…</span>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12">
      <div className="w-14 h-14 rounded-full border border-black/10 flex items-center justify-center mb-4">
        <span className="font-serif italic text-2xl text-accent">ι</span>
      </div>
      <h3 className="font-display font-medium text-lg mb-1.5">
        Your knowledge, one question away<span className="text-accent">.</span>
      </h3>
      <p className="text-sm text-muted max-w-sm">
        Upload documents or select existing sources, then ask a question.
        Answers include inline citations like <span className="cite">[1]</span> with source cards.
      </p>
      <div className="flex gap-3 mt-5 text-[10px] font-mono tracking-wider text-muted uppercase">
        <span className="dash-badge">PDF</span>
        <span className="dash-badge">URL</span>
        <span className="dash-badge">DATABASE</span>
      </div>
    </div>
  );
}

function RefusalState() {
  return (
    <div className="msg msg-bot">
      <div className="avatar">ι</div>
      <div className="bubble">
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <p className="text-sm font-medium mb-1">Không tìm thấy thông tin</p>
            <p className="text-[12.5px] text-muted leading-relaxed">
              Tôi chưa tìm thấy thông tin này trong dữ liệu đã được cung cấp.
              Hãy thử upload thêm tài liệu hoặc đặt câu hỏi khác.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="msg msg-bot">
      <div className="avatar" style={{ background: "var(--accent-hover)" }}>!</div>
      <div className="bubble">
        <div className="flex items-start gap-2">
          <div>
            <p className="text-sm font-medium mb-1">Đã xảy ra lỗi</p>
            <p className="text-[12.5px] text-muted leading-relaxed mb-2">
              Không thể kết nối đến hệ thống retrieval. Vui lòng thử lại.
            </p>
            {onRetry && (
              <button type="button" onClick={onRetry} className="dash-btn text-[11px]">
                ↻ Thử lại
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type Props = {
  messages: Message[];
  chatState: ChatState;
  onRetry?: () => void;
};

export default function MessageList({ messages, chatState, onRetry }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatState]);

  if (messages.length === 0 && chatState === "idle") {
    return (
      <div className="chat-body">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="chat-body">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} msg={msg} />
      ))}
      {chatState === "loading" && <TypingIndicator />}
      {chatState === "refusal" && <RefusalState />}
      {chatState === "error" && <ErrorState onRetry={onRetry} />}
      <div ref={bottomRef} />
    </div>
  );
}