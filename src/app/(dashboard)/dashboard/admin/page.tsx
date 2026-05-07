"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api/client";
import type { AdminOverviewResponse } from "@/lib/api/types";

function formatDate(value?: string) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function BlueprintLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted">{children}</div>;
}

function EmptyLine({ label }: { label: string }) {
  return <div className="border-t border-black/10 px-4 py-6 text-xs text-muted">{label}</div>;
}

export default function AdminPage() {
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .overview()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load admin data"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-6 text-sm text-muted">Drafting admin blueprint...</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    ["Users", data.stats.userCount, "registered accounts"],
    ["Admins", data.stats.adminCount, "elevated profiles"],
    ["Documents", data.stats.documentCount, "indexed objects"],
    ["Processing", data.stats.processingCount, "active ingestion"],
    ["Jobs", data.stats.jobCount, "total runs"],
    ["Failed", data.stats.failedJobCount, "needs inspection"],
    ["Threads", data.stats.conversationCount, "conversations"],
    ["Messages", data.stats.recentMessageCount, "recent traces"],
  ];

  return (
    <div className="min-h-full bg-[linear-gradient(to_right,rgba(0,0,0,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.045)_1px,transparent_1px)] bg-[size:48px_48px]">
      <div className="p-4 lg:p-8 space-y-8">
        <section className="relative border-y border-black/15 py-8">
          <div className="absolute left-0 top-0 h-5 border-l border-black/30" />
          <div className="absolute right-0 bottom-0 h-5 border-r border-black/30" />
          <div className="grid gap-6 lg:grid-cols-[1fr_420px] lg:items-end">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-serif italic text-accent text-2xl">A.</span>
                <BlueprintLabel>Admin command surface</BlueprintLabel>
              </div>
              <h1 className="mt-4 font-display text-4xl md:text-6xl font-medium tracking-tight">Cross-user activity map</h1>
            </div>
            <p className="text-sm leading-6 text-foreground/65">
              Thin-line overview for profiles, documents, ingestion jobs, and chat traces. Admin accounts land here first; regular users remain scoped to their own workspace.
            </p>
          </div>
        </section>

        <section className="grid border border-black/15 bg-background/75 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(([label, value, note]) => (
            <div key={label} className="relative min-h-32 border-b border-r border-black/10 p-4 last:border-r-0">
              <BlueprintLabel>{label}</BlueprintLabel>
              <div className="mt-5 font-display text-5xl leading-none">{value}</div>
              <div className="mt-3 text-[11px] uppercase tracking-wider text-muted">{note}</div>
              <span className="absolute right-3 top-3 h-2 w-2 border border-black/25" />
            </div>
          ))}
        </section>

        <section className="border border-black/15 bg-background/80">
          <div className="flex items-center justify-between border-b border-black/15 px-4 py-3">
            <h2 className="font-display text-xl">Users / access ledger</h2>
            <BlueprintLabel>{data.users.length} rows</BlueprintLabel>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="text-left text-[10px] font-mono uppercase tracking-[0.2em] text-muted">
                <tr className="border-b border-black/15">
                  <th className="px-4 py-3 font-medium">Account</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Docs</th>
                  <th className="px-4 py-3 font-medium">Processing</th>
                  <th className="px-4 py-3 font-medium">Failed</th>
                  <th className="px-4 py-3 font-medium">Threads</th>
                  <th className="px-4 py-3 font-medium">Msgs</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((user) => (
                  <tr key={user.id} className="border-b border-black/10 last:border-b-0 hover:bg-black/[0.025]">
                    <td className="px-4 py-4">
                      <div className="font-medium">{user.name || user.email || "Unnamed user"}</div>
                      <div className="mt-1 font-mono text-[11px] text-muted">{user.email}</div>
                    </td>
                    <td className="px-4 py-4"><span className="border border-black/15 px-2 py-1 text-[11px] uppercase tracking-wider">{user.role}</span></td>
                    <td className="px-4 py-4 font-mono">{user.documentCount}</td>
                    <td className="px-4 py-4 font-mono">{user.processingCount}</td>
                    <td className="px-4 py-4 font-mono">{user.failedJobCount}</td>
                    <td className="px-4 py-4 font-mono">{user.conversationCount}</td>
                    <td className="px-4 py-4 font-mono">{user.recentMessageCount}</td>
                    <td className="px-4 py-4 font-mono text-[11px] text-muted">{formatDate(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="border border-black/15 bg-background/80">
            <div className="border-b border-black/15 px-4 py-3"><h2 className="font-display text-xl">Recent documents</h2></div>
            {data.recentDocuments.length === 0 ? <EmptyLine label="No document traces yet." /> : data.recentDocuments.map((document) => (
              <div key={document.id} className="grid grid-cols-[1fr_auto] gap-4 border-b border-black/10 px-4 py-4 text-sm last:border-b-0">
                <div>
                  <div className="font-medium">{document.title}</div>
                  <div className="mt-1 font-mono text-[11px] text-muted">{document.sourceType} / {document.chunkCount} chunks / {document.userId}</div>
                </div>
                <div className="font-mono text-[11px] uppercase tracking-wider text-muted">{document.status}</div>
              </div>
            ))}
          </div>

          <div className="border border-black/15 bg-background/80">
            <div className="border-b border-black/15 px-4 py-3"><h2 className="font-display text-xl">Recent messages</h2></div>
            {data.recentMessages.length === 0 ? <EmptyLine label="No chat traces yet." /> : data.recentMessages.map((message) => (
              <div key={message.id} className="border-b border-black/10 px-4 py-4 text-sm last:border-b-0">
                <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-wider text-muted">
                  <span>{message.role}</span><span className="h-px w-6 bg-black/20" /><span>{formatDate(message.createdAt)}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-foreground/75">{message.content}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
