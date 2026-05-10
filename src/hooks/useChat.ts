// ─── useChat hooks ─────────────────────────────────────────────
// Chat state management: send messages, load history, manage conversations.

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { chatApi } from "@/lib/api/client";
import type {
  ChatRequest,
  ChatRetrievalDiagnostics,
  ChatSource,
  Conversation,
  ConversationMessage,
} from "@/lib/api/types";

// ─── Local message shape (includes optimistic user messages) ───
export type LocalMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  sources?: ChatSource[];
  provider?: string;
  model?: string;
  diagnostics?: ChatRetrievalDiagnostics;
  isStreaming?: boolean;
};

// ─── useChat — main chat state ─────────────────────────────────
export function useChat(initialConversationId?: string | null) {
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId ?? null,
  );
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setConversationId(initialConversationId ?? null);
    setError(null);
    if (!initialConversationId) {
      setMessages([]);
    }
  }, [initialConversationId]);

  // Load existing conversation messages on mount / id change
  useEffect(() => {
    if (!conversationId) {
      setLoadingHistory(false);
      return;
    }

    let cancelled = false;
    setLoadingHistory(true);
    setError(null);
    setMessages([]);

    chatApi
      .getConversation(conversationId)
      .then(({ messages: msgs }) => {
        if (cancelled) return;
        setMessages(
          msgs.map((m) => ({
            id: m.id,
            role: m.role as LocalMessage["role"],
            content: m.content,
            createdAt: m.createdAt,
            sources: m.sources,
            provider: m.provider,
            model: m.model,
            diagnostics: m.diagnostics,
          })),
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setMessages([]);
        setError(err instanceof Error ? err.message : "Failed to load conversation");
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  const sendingRef = useRef(false);

  const sendMessage = useCallback(
    async (text: string, opts?: Partial<Omit<ChatRequest, "message" | "conversationId">>) => {
      if (!text.trim() || sendingRef.current) return;

      setError(null);
      setSending(true);
      sendingRef.current = true;

      // Optimistic user message
      const optimisticId = `opt_${Date.now()}`;
      const userMsg: LocalMessage = {
        id: optimisticId,
        role: "user",
        content: text.trim(),
        createdAt: new Date().toISOString(),
      };

      // Placeholder streaming indicator
      const streamingId = `stream_${Date.now()}`;
      const streamingMsg: LocalMessage = {
        id: streamingId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, streamingMsg]);

      try {
        // Use SSE streaming endpoint for real-time token delivery
        const res = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text.trim(),
            conversationId,
            ...opts,
          }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({ error: { message: "Stream request failed" } }));
          throw new Error(errBody?.error?.message ?? `HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";
        let streamedContent = "";
        let streamSources: ChatSource[] | undefined;
        let streamProvider = "";
        let streamModel = "";
        let persistedId: string | undefined;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              switch (parsed.type) {
                case "init":
                  if (!conversationId && parsed.conversationId) {
                    setConversationId(parsed.conversationId);
                  }
                  break;
                case "sources":
                  streamSources = parsed.sources;
                  break;
                case "delta":
                  streamedContent += parsed.delta;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === streamingId
                        ? { ...m, content: streamedContent, sources: streamSources }
                        : m,
                    ),
                  );
                  break;
                case "done":
                  streamProvider = parsed.provider;
                  streamModel = parsed.model;
                  break;
                case "persisted":
                  persistedId = parsed.messageId;
                  break;
                case "error":
                  throw new Error(parsed.error);
              }
            } catch (e) {
              if (e instanceof Error && e.message !== "Stream failed") throw e;
            }
          }
        }

        // Finalize: replace streaming placeholder with completed message
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingId
              ? {
                  ...m,
                  id: persistedId ?? streamingId,
                  content: streamedContent,
                  isStreaming: false,
                  sources: streamSources,
                  provider: streamProvider,
                  model: streamModel,
                }
              : m,
          ),
        );

        return undefined;
      } catch (err) {
        // Remove streaming placeholder on error
        setMessages((prev) => prev.filter((m) => m.id !== streamingId));
        const msg = err instanceof Error ? err.message : "Failed to send message";
        setError(msg);
        throw err;
      } finally {
        setSending(false);
        sendingRef.current = false;
      }
    },
    [conversationId],
  );

  const reset = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setError(null);
    setSending(false);
    setDeleting(false);
  }, []);

  const deleteConversation = useCallback(async () => {
    if (!conversationId || deleting) return false;

    setDeleting(true);
    setError(null);
    try {
      await chatApi.deleteConversation(conversationId);
      setConversationId(null);
      setMessages([]);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete conversation";
      setError(msg);
      return false;
    } finally {
      setDeleting(false);
    }
  }, [conversationId, deleting]);

  return {
    conversationId,
    messages,
    loadingHistory,
    sending,
    deleting,
    error,
    sendMessage,
    deleteConversation,
    reset,
  };
}

export function useDeleteConversation() {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deleteConversation = useCallback(async (conversationId: string) => {
    setDeleting(conversationId);
    setError(null);
    try {
      await chatApi.deleteConversation(conversationId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete conversation";
      setError(msg);
      throw err;
    } finally {
      setDeleting(null);
    }
  }, []);

  return { deleteConversation, deleting, error };
}

// ─── useConversations — list ───────────────────────────────────
export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await chatApi.listConversations();
      setConversations(data.conversations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return { conversations, loading, error, refetch: loadConversations };
}

// ─── useConversationDetail ─────────────────────────────────────
export function useConversationDetail(conversationId: string | null) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId) return;
    setLoading(true);
    setError(null);
    chatApi
      .getConversation(conversationId)
      .then(({ conversation: conv, messages: msgs }) => {
        setConversation(conv);
        setMessages(msgs);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load conversation"),
      )
      .finally(() => setLoading(false));
  }, [conversationId]);

  return { conversation, messages, loading, error };
}
