"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDashboard } from "@/hooks/useDashboard";
import { createClient } from "@/lib/supabase/client";
import type { Document, DocumentSourceType, DocumentStatus } from "@/lib/api/types";

// ─── Helpers ───────────────────────────────────────────────────
function sourceTypeLabel(t: DocumentSourceType): string {
  return t === "pdf" ? "PDF" : t === "website" ? "SITE" : "DB";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} d ago`;
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  const map: Record<DocumentStatus, string> = {
    ready: "dash-badge-ok",
    processing: "dash-badge-warn",
    failed: "dash-badge-err",
  };
  const label: Record<DocumentStatus, string> = {
    ready: "done",
    processing: "processing",
    failed: "failed",
  };
  return (
    <span className={`dash-badge ${map[status]}`}>
      {status === "processing" && (
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse mr-1" />
      )}
      {label[status]}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="text-[9px] font-mono tracking-wider text-muted border border-black/10 px-1.5 py-0.5 rounded-sm">
      {type}
    </span>
  );
}

// ─── Skeleton loader ───────────────────────────────────────────
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-black/[0.06] rounded-sm ${className}`} />;
}

// ─── Page ──────────────────────────────────────────────────────
export default function DashboardPage() {
  const { stats, recentDocuments, recentConversations, loading, error, refetch } = useDashboard();
  const [displayName, setDisplayName] = useState("there");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const currentUser = data.user;
      const firstName = currentUser?.user_metadata?.first_name as string | undefined;
      const fullName = currentUser?.user_metadata?.full_name as string | undefined;
      const emailName = currentUser?.email?.split("@")[0];

      setDisplayName(firstName?.trim() || fullName?.trim() || emailName || "there");
    });
  }, []);

  const queryDelta = stats
    ? stats.queryCountToday - stats.queryCountYesterday
    : 0;

  const STATS = stats
    ? [
        { label: "Documents", value: stats.documentCount.toString(), sub: `${stats.processingCount} processing`, accent: false },
        { label: "Chunks indexed", value: stats.chunkCount.toLocaleString(), sub: "1536-d vectors", accent: false },
        { label: "Queries today", value: stats.queryCountToday.toString(), sub: `${queryDelta >= 0 ? "↑" : "↓"} ${Math.abs(queryDelta)} vs yesterday`, accent: false },
        { label: "Avg. answer", value: `${(stats.avgAnswerMs / 1000).toFixed(1)}s`, sub: "top-5 retrieval", accent: true },
      ]
    : null;

  return (
    <div className="w-full max-w-6xl mx-auto overflow-x-hidden p-4 lg:p-8">

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8 pb-5 border-b border-black/10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-4 h-px bg-accent" />
            <span className="section-label text-[10px]">Overview</span>
            <span className="text-muted text-[10px] font-mono">· N° 01</span>
          </div>
          <h1 className="text-2xl font-display font-medium tracking-tight">
            Good morning, {displayName}<span className="text-accent">.</span>
          </h1>
          <p className="text-sm text-muted mt-1">
            {loading
              ? "Loading your knowledge base…"
              : stats
                ? stats.documentCount > 0
                  ? `Your knowledge base is ready — ${stats.documentCount} sources indexed.`
                  : "Your knowledge base is empty. Upload a source to begin."
                : "Your knowledge base is empty."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/upload" className="dash-btn">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload
          </Link>
          <Link href="/dashboard/chat" className="dash-btn-primary">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            New chat
          </Link>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="mb-6 p-3 border border-red-200 bg-red-50 rounded-sm text-sm text-red-700">
          {error} —{" "}
          <button type="button" onClick={refetch} className="underline">
            retry
          </button>
        </div>
      )}

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {loading || !STATS
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="dash-stat-card">
                <Skeleton className="h-2 w-16 mb-3" />
                <Skeleton className="h-7 w-12 mb-2" />
                <Skeleton className="h-2 w-20" />
              </div>
            ))
          : STATS.map((s) => (
              <div key={s.label} className="dash-stat-card">
                <div className="text-[9px] font-mono text-muted tracking-widest uppercase mb-2">{s.label}</div>
                <div className={`text-2xl font-display font-medium leading-none mb-1 ${s.accent ? "text-accent" : ""}`}>
                  {s.value}
                </div>
                <div className="text-[10px] text-muted">{s.sub}</div>
              </div>
            ))}
      </div>

      {/* ── Two-column grid ── */}
      <div className="grid lg:grid-cols-[1fr_360px] gap-6">

        {/* Recent documents */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="font-serif italic text-accent">I.</span>
              <span className="text-sm font-medium">Recent documents</span>
            </div>
            <Link href="/dashboard/documents" className="text-[11px] text-muted hover:text-accent transition-colors font-mono tracking-wider uppercase">
              View all →
            </Link>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block border border-black/10 rounded-sm overflow-hidden">
            <div className="grid grid-cols-[1fr_60px_80px_70px_80px] gap-3 px-4 py-2.5 bg-black/[0.03] border-b border-black/10 text-[9px] font-mono text-muted tracking-widest uppercase">
              <span>Name</span>
              <span>Type</span>
              <span>Status</span>
              <span className="text-right">Chunks</span>
              <span className="text-right">Date</span>
            </div>

            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-[1fr_60px_80px_70px_80px] gap-3 px-4 py-3 items-center border-b border-black/[0.06] last:border-b-0">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-4 w-10" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-8 ml-auto" />
                    <Skeleton className="h-3 w-10 ml-auto" />
                  </div>
                ))
              : recentDocuments.length > 0 ? recentDocuments.map((doc: Document, i: number) => (
                  <div
                    key={doc.id}
                    className={`grid grid-cols-[1fr_60px_80px_70px_80px] gap-3 px-4 py-3 items-center text-sm hover:bg-black/[0.02] transition-colors ${i < recentDocuments.length - 1 ? "border-b border-black/[0.06]" : ""}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <svg className="w-3.5 h-3.5 text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="truncate text-xs">{doc.title}</span>
                    </div>
                    <TypeBadge type={sourceTypeLabel(doc.sourceType)} />
                    <StatusBadge status={doc.status} />
                    <span className="text-right text-xs text-muted font-mono">
                      {doc.chunkCount > 0 ? doc.chunkCount.toLocaleString() : "—"}
                    </span>
                    <span className="text-right text-[10px] text-muted font-mono">
                      {formatDate(doc.createdAt)}
                    </span>
                  </div>
                )) : (
                  <div className="px-4 py-8 text-center text-sm text-muted">
                    No documents yet. Upload your first source to populate this table.
                  </div>
                )}
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="border border-black/10 rounded-sm p-3 bg-white/20">
                    <Skeleton className="h-3 w-40 mb-3" />
                    <div className="grid grid-cols-3 gap-2">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))
              : recentDocuments.length > 0 ? recentDocuments.map((doc: Document) => (
                  <div key={doc.id} className="border border-black/10 rounded-sm p-3 bg-white/20">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span className="min-w-0 break-words text-xs leading-relaxed font-medium">{doc.title}</span>
                      <StatusBadge status={doc.status} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-muted">
                      <div>
                        <div className="tracking-widest uppercase mb-1">Type</div>
                        <TypeBadge type={sourceTypeLabel(doc.sourceType)} />
                      </div>
                      <div>
                        <div className="tracking-widest uppercase mb-1">Chunks</div>
                        <div>{doc.chunkCount > 0 ? doc.chunkCount.toLocaleString() : "—"}</div>
                      </div>
                      <div>
                        <div className="tracking-widest uppercase mb-1">Date</div>
                        <div>{formatDate(doc.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="border border-black/10 rounded-sm p-4 bg-white/20 text-sm text-muted">
                    No documents yet.
                  </div>
                )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">

          {/* Recent chats */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="font-serif italic text-accent">II.</span>
                <span className="text-sm font-medium">Recent chats</span>
              </div>
              <Link href="/dashboard/chat" className="text-[11px] text-muted hover:text-accent transition-colors font-mono tracking-wider uppercase">
                Open →
              </Link>
            </div>

            <div className="space-y-2">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="border border-black/10 rounded-sm p-3.5">
                      <Skeleton className="h-3 w-full mb-2" />
                      <Skeleton className="h-3 w-3/4 mb-3" />
                      <div className="flex justify-between">
                        <Skeleton className="h-2 w-16" />
                        <Skeleton className="h-2 w-16" />
                      </div>
                    </div>
                  ))
                : recentConversations.length > 0 ? recentConversations.map((conv) => (
                    <Link
                      key={conv.id}
                      href={`/dashboard/chat?conversationId=${conv.id}`}
                      className="block border border-black/10 rounded-sm p-3.5 hover:border-accent/30 hover:bg-black/[0.01] transition-colors group"
                    >
                      <p className="text-xs leading-relaxed text-foreground/80 group-hover:text-foreground transition-colors line-clamp-2 mb-2">
                        {conv.title ?? "Untitled conversation"}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted font-mono">{timeAgo(conv.updatedAt)}</span>
                        <span className="text-[10px] text-muted font-mono">
                          {conv.messageCount ? `${Math.floor(conv.messageCount / 2)} turns` : ""}
                        </span>
                      </div>
                    </Link>
                  )) : (
                    <div className="border border-black/10 rounded-sm p-3.5 text-sm text-muted">
                      No chats yet. Start a new grounded chat when you are ready.
                    </div>
                  )}
            </div>
          </div>

          {/* Quick actions */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="font-serif italic text-accent">III.</span>
              <span className="text-sm font-medium">Quick actions</span>
            </div>

            <div className="space-y-2">
              {[
                {
                  href: "/dashboard/upload",
                  label: "Upload a PDF",
                  sub: "Add a new document to your index",
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  ),
                },
                {
                  href: "/dashboard/upload",
                  label: "Crawl a website",
                  sub: "Ingest a URL into your knowledge base",
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx={12} cy={12} r={9} strokeWidth={1.5} />
                      <path strokeWidth={1.5} d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
                    </svg>
                  ),
                },
                {
                  href: "/dashboard/chat",
                  label: "Ask a question",
                  sub: "Start a new grounded chat session",
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  ),
                },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-3 border border-black/10 rounded-sm p-3 hover:border-accent/30 hover:bg-black/[0.01] transition-colors group"
                >
                  <div className="w-7 h-7 rounded-sm border border-black/10 flex items-center justify-center text-muted group-hover:text-accent group-hover:border-accent/30 transition-colors flex-shrink-0">
                    {action.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium">{action.label}</div>
                    <div className="text-[10px] text-muted">{action.sub}</div>
                  </div>
                  <svg className="w-3.5 h-3.5 text-muted ml-auto flex-shrink-0 group-hover:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── Footer meta ── */}
      <div className="mt-10 pt-5 border-t border-black/10 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-[9px] font-mono text-muted tracking-widest uppercase">
        <span>iota · dashboard · vol. 01</span>
        <span>10.7626° N · 106.6602° E</span>
        <span>live data</span>
      </div>
    </div>
  );
}
