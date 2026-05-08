// ─── useChat hooks ─────────────────────────────────────────────
// Chat state management: send messages, load history, manage conversations.

"use client";

import { useState, useEffect, useCallback } from "react";
import { chatApi } from "@/lib/api/client";
import type {
  ChatRequest,
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

  const sendMessage = useCallback(
    async (text: string, opts?: Partial<Omit<ChatRequest, "message" | "conversationId">>) => {
      if (!text.trim() || sending) return;

      setError(null);
      setSending(true);

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
        const response = await chatApi.send({
          message: text.trim(),
          conversationId,
          ...opts,
        });

        // Replace streaming placeholder with real response
        setMessages((prev) =>
          prev
            .filter((m) => m.id !== streamingId)
            .concat({
              id: response.message.id,
              role: "assistant",
              content: response.message.content,
              createdAt: response.message.createdAt,
              sources: response.sources,
              provider: response.message.provider,
              model: response.message.model,
            }),
        );

        if (!conversationId) {
          setConversationId(response.conversationId);
        }

        return response;
      } catch (err) {
        // Remove streaming placeholder on error
        setMessages((prev) => prev.filter((m) => m.id !== streamingId));
        const msg = err instanceof Error ? err.message : "Failed to send message";
        setError(msg);
        throw err;
      } finally {
        setSending(false);
      }
    },
    [conversationId, sending],
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
      setError(err instanceof Error ? err.message : "Failed to delete conversation");
      throw err;
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

  const fetch = useCallback(async () => {
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
    fetch();
  }, [fetch]);

  return { conversations, loading, error, refetch: fetch };
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
