"use client";

import { useRef, useState, useCallback } from "react";
import type { ChatState } from "@/types";

type Props = {
  onSend: (text: string) => void;
  chatState: ChatState;
  placeholder?: string;
};

export default function ChatComposer({
  onSend,
  chatState,
  placeholder = "Ask anything from your private knowledge base",
}: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDisabled = chatState === "loading" || chatState === "streaming";

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isDisabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, isDisabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  return (
    <div className="chat-composer">
      <div className="chat-composer-inner">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isDisabled}
          rows={1}
          className="chat-composer-input"
          aria-label="Chat message input"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isDisabled || !value.trim()}
          className="chat-composer-send"
          aria-label="Send message"
        >
          {isDisabled ? (
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </div>
      <div className="chat-composer-meta">
        <span>Shift+Enter for new line</span>
        <span>·</span>
        <span>TOP 5 retrieval</span>
        {isDisabled && (
          <>
            <span>·</span>
            <span className="text-accent">Processing…</span>
          </>
        )}
      </div>
    </div>
  );
}