"use client";

import { ChatComposer, CitationPanel, MessageList } from "@/components/chat";
import type { Citation, Message } from "@/types";

type CompactDropdownOption = {
  value: string;
  label: string;
};

const CHAT_SCOPE_FIXTURE_OPTIONS: CompactDropdownOption[] = [
  { value: "", label: "All sources" },
  { value: "fixture-ml", label: "pdf · Machine Learning Systems Handbook.pdf" },
  { value: "fixture-api", label: "website · API reference mirror" },
];

const CHAT_MODE_OPTIONS: CompactDropdownOption[] = [
  { value: "auto", label: "Auto" },
  { value: "llm", label: "LLM" },
  { value: "local", label: "Local" },
];

const CHAT_FIXTURE_CITATIONS: Citation[] = [
  {
    index: 1,
    sourceType: "pdf",
    title: "Machine Learning Systems Handbook.pdf",
    detail: "p. 42",
    snippet: "The retrieval stage should constrain context before generation and keep citations attached to the answer.",
    score: 0.91,
  },
  {
    index: 2,
    sourceType: "url",
    title: "Internal onboarding knowledge base",
    detail: "https://docs.example.com/onboarding",
    snippet: "Workspace defaults define how source scope, answer style, and review checkpoints are presented.",
    score: 0.84,
  },
];

const CHAT_FIXTURE_MESSAGES: Message[] = [
  {
    id: "fixture-user-message",
    role: "user",
    content: "Summarize the ingestion flow and cite the source documents.",
    timestamp: Date.now() - 60000,
  },
  {
    id: "fixture-assistant-message",
    role: "assistant",
    content: "The ingestion flow extracts source content, chunks it, embeds each chunk, then stores vectors for retrieval. The UI should keep source scope visible while answers cite the matching documents.",
    citations: CHAT_FIXTURE_CITATIONS,
    provider: "fixture",
    model: "boneyard-preview",
    timestamp: Date.now(),
  },
];

function CompactFixtureDropdown({
  label,
  value,
  options,
  title,
  className = "",
}: {
  label: string;
  value: string;
  options: CompactDropdownOption[];
  title?: string;
  className?: string;
}) {
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className={`relative ${className}`} title={title}>
      <button
        type="button"
        className="inline-flex h-6 w-full items-center gap-1.5 border border-black/10 bg-background/35 px-2 font-mono text-[9px] uppercase tracking-[0.08em]"
      >
        <span className="text-muted">{label}</span>
        <span className="max-w-[96px] truncate text-foreground">{selected?.label}</span>
        <svg className="h-3 w-3 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
    </div>
  );
}

export function ChatWorkspaceFixture() {
  return (
    <div className="chat-workspace">
      <div className="border-b border-black/10 p-4 lg:px-6">
        <div className="mb-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-px w-4 bg-accent" />
            <span className="section-label text-[10px]">Chat workspace</span>
            <span className="font-mono text-[10px] text-muted">No. 02</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="font-display text-xl font-medium tracking-tight">
            Ask your knowledge base<span className="text-accent">.</span>
          </h1>
          <div className="flex gap-2">
            <CompactFixtureDropdown
              label="Scope"
              value=""
              options={CHAT_SCOPE_FIXTURE_OPTIONS}
              title="All sources"
              className="max-w-[158px]"
            />
            <CompactFixtureDropdown
              label="Mode"
              value="auto"
              options={CHAT_MODE_OPTIONS}
              className="max-w-[112px]"
            />
            <span className="dash-badge">TOP 5</span>
            <span className="dash-badge">2 SRC</span>
            <span className="dash-badge">2 DOC</span>
          </div>
        </div>
      </div>

      <div className="chat-layout min-h-0 flex-1 p-4 lg:px-6">
        <div className="chat-card flex min-h-0 flex-col">
          <div className="chat-head">
            <span className="dot" />
            <span>iota · retrieval session</span>
            <span className="src">
              <span>ALL DOCS</span>
              <span>TOP 5</span>
              <span>2 SRC</span>
            </span>
          </div>
          <MessageList
            messages={CHAT_FIXTURE_MESSAGES}
            chatState="idle"
            error={null}
            onRetry={() => undefined}
          />
          <ChatComposer onSend={() => undefined} chatState="idle" />
        </div>

        <div className="hidden lg:block">
          <CitationPanel citations={CHAT_FIXTURE_CITATIONS} />
        </div>
      </div>
    </div>
  );
}
