"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { Message, ChatState } from "@/types";

const CITATION_PATTERN = /\[(\d+)\]/g;
const BOLD_PATTERN = /\*\*(.+?)\*\*/g;

function citationKey(messageId: string, index: number, title: string, detail: string) {
  return `${messageId}-${index}-${title}-${detail}`;
}

function renderInlineText(text: string) {
  const parts: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(CITATION_PATTERN)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      parts.push(renderBoldText(text.slice(lastIndex, start), `text-${lastIndex}`));
    }
    parts.push(
      <span key={`cite-${start}-${match[1]}`} className="cite">
        [{match[1]}]
      </span>,
    );
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(renderBoldText(text.slice(lastIndex), `text-${lastIndex}`));
  }

  return parts;
}

function renderBoldText(text: string, keyPrefix: string) {
  const parts: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(BOLD_PATTERN)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }
    parts.push(<strong key={`${keyPrefix}-bold-${start}`}>{match[1]}</strong>);
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function MessageContent({ content }: { content: string }) {
  const paragraphs = content.split(/\n{2,}/);

  return (
    <div className="message-content">
      {paragraphs.map((paragraph, paragraphIndex) => {
        const lines = paragraph.split("\n");
        return (
          <p key={`${paragraphIndex}-${paragraph.slice(0, 16)}`}>
            {lines.map((line, lineIndex) => (
              <span key={`${paragraphIndex}-${lineIndex}`}>
                {lineIndex > 0 && <br />}
                {renderInlineText(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  const isLocalAnswer = msg.provider === "extractive";
  const answerBadge = isUser || !msg.provider ? null : isLocalAnswer ? "LOCAL" : `LLM · ${msg.provider}`;
  const diagnosticLabel = msg.diagnostics
    ? `${msg.diagnostics.returnedChunks}/${msg.diagnostics.requestedTopK} chunks · ${msg.diagnostics.scopedDocumentIds.length ? "scoped" : "all sources"}`
    : null;

  return (
    <div className={`msg ${isUser ? "msg-user" : "msg-bot"}`}>
      <div className="avatar" aria-hidden="true">{isUser ? "U" : "ι"}</div>
      <div className="bubble">
        {answerBadge && (
          <div className="mb-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-wider text-muted">
            <span className="dash-badge">{answerBadge}</span>
            {msg.model && <span className="opacity-60">{msg.model}</span>}
            {diagnosticLabel && <span className="opacity-60">{diagnosticLabel}</span>}
          </div>
        )}
        {msg.isStreaming && !msg.content ? (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
            <span className="w-1.5 h-1.5 bg-accent/60 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 bg-accent/30 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
            <span className="text-[11px] text-muted ml-2 font-mono tracking-wider">STREAMING…</span>
          </div>
        ) : (
          <MessageContent content={msg.content} />
        )}
        {msg.citations && msg.citations.length > 0 && (
          <details className="sources" aria-label="Referenced sources">
            <summary className="cursor-pointer select-none font-mono text-[10px] uppercase tracking-wider text-muted">
              {msg.citations.length} source{msg.citations.length > 1 ? "s" : ""} referenced
            </summary>
            {msg.citations.slice(0, 4).map((c) => (
              <div key={citationKey(msg.id, c.index, c.title, c.detail)} className="source">
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
          </details>
        )}
        {msg.isStreaming && msg.content && <span className="cur" />}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="msg msg-bot" aria-live="polite" aria-label="Retrieving answer">
      <div className="avatar" aria-hidden="true">ι</div>
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
      <div className="avatar" aria-hidden="true">ι</div>
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

function ErrorState({ error, onRetry }: { error?: string | null; onRetry?: () => void }) {
  return (
    <div className="msg msg-bot" role="alert">
      <div className="avatar" style={{ background: "var(--accent-hover)" }} aria-hidden="true">!</div>
      <div className="bubble">
        <div className="flex items-start gap-2">
          <div>
            <p className="text-sm font-medium mb-1">Đã xảy ra lỗi</p>
            <p className="text-[12.5px] text-muted leading-relaxed mb-2">
              {error ?? "Không thể kết nối đến hệ thống retrieval. Vui lòng thử lại."}
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
  error?: string | null;
  onRetry?: () => void;
};

export default function MessageList({ messages, chatState, error, onRetry }: Props) {
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
      {chatState === "error" && <ErrorState error={error} onRetry={onRetry} />}
      <div ref={bottomRef} />
    </div>
  );
}