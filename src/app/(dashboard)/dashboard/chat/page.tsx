"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageList, ChatComposer, CitationPanel } from "@/components/chat";
import { useChat } from "@/hooks/useChat";
import { useDocuments } from "@/hooks/useDocuments";
import type { Message, Citation, ChatState } from "@/types";
import type { LocalMessage } from "@/hooks/useChat";
import type { ChatGenerationMode } from "@/lib/api/types";

type CompactDropdownOption = {
  value: string;
  label: string;
};

function CompactDropdown({
  label,
  value,
  options,
  onChange,
  disabled,
  title,
  className = "",
}: {
  label: string;
  value: string;
  options: CompactDropdownOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  title?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`} title={title}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-6 w-full items-center gap-1.5 border border-black/10 bg-background/35 px-2 font-mono text-[9px] uppercase tracking-[0.08em] transition hover:border-black/20 hover:bg-white/45 disabled:cursor-not-allowed disabled:opacity-60"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-muted">{label}</span>
        <span className="max-w-[96px] truncate text-foreground">{selected?.label}</span>
        <svg
          className={`h-3 w-3 text-muted transition ${open ? "rotate-180 text-accent" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 min-w-full overflow-hidden border border-black/10 bg-card-bg shadow-[0_10px_30px_rgba(26,26,26,0.10)]">
          <div className="h-px bg-accent/50" />
          <ul role="listbox" className="py-1 font-mono text-[9px] uppercase tracking-[0.08em]">
            {options.map((option) => {
              const active = option.value === value;
              return (
                <li key={option.value} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-4 whitespace-nowrap px-3 py-2 text-left transition ${
                      active
                        ? "bg-accent/10 text-accent-hover"
                        : "text-foreground hover:bg-background/70 hover:text-accent-hover"
                    }`}
                  >
                    <span>{option.label}</span>
                    {active ? <span className="h-1.5 w-1.5 rounded-full bg-accent" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function DeleteChatConfirm({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1a1a]/45 px-4 backdrop-blur-[3px]">
      <div className="iota-wrap w-full max-w-[560px]">
        <div className="grid-pattern relative overflow-hidden border border-black/15 bg-card-bg">
          <div className="pointer-events-none absolute inset-0 iota-grain opacity-40" />
          <div className="relative grid grid-cols-[64px_1fr] border-b border-black/10">
            <div className="flex items-center justify-center border-r border-black/10 bg-background/45">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-accent shadow-[0_0_18px_rgba(217,108,78,0.9)]" />
              </span>
            </div>
            <div className="px-5 py-5">
              <div className="mb-3 flex items-center justify-between gap-4 font-mono text-[9px] uppercase tracking-[0.24em] text-muted">
                <span>Deletion blueprint</span>
                <span>Ref: chat-db-erase</span>
              </div>
              <h3 className="font-display text-3xl font-medium leading-none tracking-tight text-foreground">
                Delete this chat<span className="text-accent">.</span>
              </h3>
            </div>
          </div>

          <div className="relative grid grid-cols-[64px_1fr]">
            <div className="border-r border-black/10 bg-background/25 px-2 py-5 text-center font-mono text-[9px] uppercase tracking-[0.2em] text-muted [writing-mode:vertical-rl]">
              irreversible
            </div>
            <div className="px-5 py-5">
              <div className="mb-4 grid grid-cols-[1fr_auto] gap-4 border border-black/10 bg-white/35 p-4">
                <p className="text-sm leading-6 text-foreground/75">
                  This operation removes the conversation, messages, and saved source references from
                  the database.
                </p>
                <span className="font-serif text-4xl italic leading-none text-accent/70">02</span>
              </div>
              <div className="flex items-center gap-3 border-l border-accent bg-background/55 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-accent-hover">
                <span className="h-px w-8 bg-accent" />
                <span>This action cannot be undone</span>
              </div>
            </div>
          </div>

          <div className="relative flex justify-between gap-3 border-t border-black/10 bg-background/55 px-5 py-4">
            <div className="hidden items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-muted sm:flex">
              <span className="h-px w-8 bg-black/20" />
              Confirm operation
            </div>
            <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="dash-btn bg-white/55 hover:bg-white/80"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="dash-btn border-foreground bg-foreground text-background hover:border-accent hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Deleting..." : "Delete chat"}
          </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
    provider: m.provider,
    model: m.model,
    diagnostics: m.diagnostics,
    timestamp: new Date(m.createdAt).getTime(),
    isStreaming: m.isStreaming,
  };
}

function ChatWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedConversationId = searchParams.get("conversationId");
  const {
    conversationId,
    messages: rawMessages,
    loadingHistory,
    sending,
    deleting,
    error,
    sendMessage,
    deleteConversation,
    reset,
  } = useChat(selectedConversationId);
  const { documents, loading: loadingDocuments } = useDocuments({ status: "ready" });
  const [generationMode, setGenerationMode] = useState<ChatGenerationMode>("auto");
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Map to legacy Message type
  const messages = useMemo(() => rawMessages.map(toMessage), [rawMessages]);

  // Derive ChatState from hook state
  const chatState: ChatState = sending
    ? "loading"
    : loadingHistory
      ? "loading"
      : error
        ? "error"
        : "idle";

  // Collect all unique citations from assistant messages across the full chat history.
  const allCitations = useMemo(() => {
    const seen = new Set<string>();
    const cites: Citation[] = [];
    for (const m of messages) {
      if (m.role === "assistant" && m.citations) {
        for (const c of m.citations) {
          const key = `${c.title}-${c.detail}-${c.index}`;
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
    sendMessage(text, {
      mode: generationMode,
      documentIds: selectedDocumentId ? [selectedDocumentId] : undefined,
    }).catch(() => {
      // error is already set in hook state
    });
  };

  // When a new conversation is created via streaming, update the URL
  useEffect(() => {
    if (conversationId && !selectedConversationId) {
      router.replace(`/dashboard/chat?conversationId=${conversationId}`);
    }
  }, [conversationId, selectedConversationId, router]);

  const handleRetry = () => {
    reset();
  };

  const handleDeleteConversation = () => {
    if (!selectedConversationId || deleting) return;

    deleteConversation()
      .then((deleted) => {
        if (deleted) {
          setShowDeleteConfirm(false);
          window.dispatchEvent(new Event("iota:chats-changed"));
          router.replace("/dashboard/chat");
        }
      })
      .catch(() => {
        // error is already set in hook state
      });
  };

  const sourceCount = allCitations.length;
  const docCount = new Set(allCitations.map((c) => c.title)).size;
  const selectedDocument = documents.find((document) => document.id === selectedDocumentId);
  const scopeLabel = selectedDocument ? selectedDocument.title : "All sources";

  useEffect(() => {
    if (!selectedDocumentId || loadingDocuments) return;
    if (!documents.some((document) => document.id === selectedDocumentId)) {
      setSelectedDocumentId("");
    }
  }, [documents, loadingDocuments, selectedDocumentId]);

  const scopeOptions = useMemo(
    () => [
      { value: "", label: "All sources" },
      ...documents.map((document) => ({
        value: document.id,
        label: `${document.sourceType} · ${document.title}`,
      })),
    ],
    [documents],
  );
  const modeOptions = useMemo(
    () => [
      { value: "auto", label: "Auto" },
      { value: "llm", label: "LLM" },
      { value: "local", label: "Local" },
    ],
    [],
  );

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
            {selectedConversationId ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={sending || loadingHistory || deleting}
                className="dash-badge text-red-700 transition hover:border-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                title="Permanently delete this chat from the database"
              >
                {deleting ? "DELETING" : "DELETE CHAT"}
              </button>
            ) : null}
            <CompactDropdown
              label="Scope"
              value={selectedDocumentId}
              options={scopeOptions}
              onChange={setSelectedDocumentId}
              disabled={sending || loadingHistory || loadingDocuments}
              title={scopeLabel}
              className="max-w-[158px]"
            />
            <CompactDropdown
              label="Mode"
              value={generationMode}
              options={modeOptions}
              onChange={(value) => setGenerationMode(value as ChatGenerationMode)}
              disabled={sending || loadingHistory}
              className="max-w-[112px]"
            />
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
              <span title={scopeLabel}>{selectedDocument ? "1 DOC SCOPE" : "ALL DOCS"}</span>
              <span>TOP 5</span>
              <span>{sourceCount} SRC</span>
            </span>
          </div>
          <MessageList
            messages={messages}
            chatState={chatState}
            error={error}
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

      {showDeleteConfirm ? (
        <DeleteChatConfirm
          onConfirm={handleDeleteConversation}
          onCancel={() => setShowDeleteConfirm(false)}
          loading={deleting}
        />
      ) : null}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted">Loading chat workspace...</div>}>
      <ChatWorkspace />
    </Suspense>
  );
}





