"use client";

import { useEffect, useMemo, useState } from "react";
import { adminApi } from "@/lib/api/client";
import type { AdminBreakdowns, AdminOverviewResponse } from "@/lib/api/types";

function formatDate(value?: string) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function shortId(value?: string) {
  if (!value) return "--";
  return value.length > 13 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}

function stringifyMeta(value?: Record<string, unknown>) {
  if (!value || Object.keys(value).length === 0) return "{}";
  return JSON.stringify(value).slice(0, 180);
}

function WrapText({ children }: { children: React.ReactNode }) {
  return <span className="min-w-0 break-words [overflow-wrap:anywhere]">{children}</span>;
}

function BlueprintLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted">{children}</div>;
}

function EmptyLine({ label }: { label: string }) {
  return <div className="border-t border-black/10 px-4 py-6 text-xs text-muted">{label}</div>;
}

function BreakdownPanel({ title, rows }: { title: string; rows: Record<string, number> }) {
  const entries = Object.entries(rows).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, value]) => value), 1);

  return (
    <div className="border border-black/15 bg-background/80 p-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-display text-lg">{title}</h3>
        <BlueprintLabel>{entries.length} keys</BlueprintLabel>
      </div>
      <div className="mt-5 space-y-3">
        {entries.length === 0 ? <div className="text-xs text-muted">No signal yet.</div> : entries.map(([key, value]) => (
          <div key={key}>
            <div className="mb-1 flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted">
              <span>{key}</span><span>{value}</span>
            </div>
            <div className="h-2 border border-black/10 bg-black/[0.025]">
              <div className="h-full bg-foreground" style={{ width: `${Math.max(8, (value / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Breakdowns({ breakdowns }: { breakdowns: AdminBreakdowns }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <BreakdownPanel title="Doc status" rows={breakdowns.documentsByStatus} />
      <BreakdownPanel title="Sources" rows={breakdowns.documentsBySourceType} />
      <BreakdownPanel title="Jobs" rows={breakdowns.jobsByStatus} />
      <BreakdownPanel title="Messages" rows={breakdowns.messagesByRole} />
      <BreakdownPanel title="Chunks" rows={breakdowns.chunksBySourceType} />
    </section>
  );
}

export default function AdminTelemetryClient() {
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>("all");

  useEffect(() => {
    adminApi
      .overview()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load admin data"))
      .finally(() => setLoading(false));
  }, []);

  const selectedUser = useMemo(() => data?.users.find((user) => user.id === selectedUserId), [data, selectedUserId]);
  const scoped = selectedUserId === "all" ? data : data ? {
    ...data,
    recentDocuments: data.recentDocuments.filter((item) => item.userId === selectedUserId),
    recentJobs: data.recentJobs.filter((item) => item.userId === selectedUserId),
    recentMessages: data.recentMessages.filter((item) => item.userId === selectedUserId),
    sampledChunks: data.sampledChunks.filter((item) => item.userId === selectedUserId),
    recentSources: data.recentSources.filter((item) => item.userId === selectedUserId),
    timeline: data.timeline.filter((item) => item.userId === selectedUserId),
  } : null;

  if (loading) return <div className="p-6 text-sm text-muted">Drafting admin telemetry surface...</div>;

  if (error) {
    return <div className="p-6"><div className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div></div>;
  }

  if (!data || !scoped) return null;

  const stats = [
    ["Users", data.stats.userCount, "registered accounts"],
    ["Admins", data.stats.adminCount, "elevated profiles"],
    ["Documents", data.stats.documentCount, `${data.stats.documentsLast7d} new / 7d`],
    ["Chunks", data.stats.chunkCount, `${data.stats.sampledChunkCount} sampled`],
    ["Jobs", data.stats.jobCount, `${data.stats.failedJobCount} failed`],
    ["Threads", data.stats.conversationCount, "conversations"],
    ["Messages", data.stats.recentMessageCount, `${data.stats.messagesLast24h} / 24h`],
    ["Citations", data.stats.sourceCitationCount, "retrieval sources"],
  ];

  return (
    <div className="min-h-full max-w-full overflow-x-hidden bg-[linear-gradient(to_right,rgba(0,0,0,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.045)_1px,transparent_1px)] bg-[size:48px_48px]">
      <div className="max-w-full space-y-8 overflow-x-hidden p-4 lg:p-8">
        <section className="relative border-y border-black/15 py-8">
          <div className="absolute left-0 top-0 h-5 border-l border-black/30" />
          <div className="absolute right-0 bottom-0 h-5 border-r border-black/30" />
          <div className="grid gap-6 xl:grid-cols-[1fr_520px] xl:items-end">
            <div>
              <div className="flex items-center gap-3"><span className="font-serif italic text-accent text-2xl">A.</span><BlueprintLabel>Admin deep access surface</BlueprintLabel></div>
              <h1 className="mt-4 font-display text-4xl md:text-6xl font-medium tracking-tight">Full-system telemetry map</h1>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <p className="text-sm leading-6 text-foreground/65">Service-role backed view across profiles, documents, storage metadata, ingestion jobs, chunks, citations, conversations, messages, and recent system timeline.</p>
              <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} className="h-11 border border-black/15 bg-background px-3 font-mono text-xs uppercase tracking-wider">
                <option value="all">All users</option>
                {data.users.map((user) => <option key={user.id} value={user.id}>{user.email || user.name || user.id}</option>)}
              </select>
            </div>
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

        <Breakdowns breakdowns={data.breakdowns} />

        {selectedUser && (
          <section className="grid gap-4 border border-black/15 bg-background/80 p-4 lg:grid-cols-[1fr_2fr]">
            <div>
              <BlueprintLabel>Focused account</BlueprintLabel>
              <h2 className="mt-3 font-display text-3xl">{selectedUser.name || selectedUser.email || "Unnamed user"}</h2>
              <div className="mt-2 font-mono text-[11px] text-muted">{selectedUser.id}</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[["docs", selectedUser.documentCount], ["chunks", selectedUser.chunkCount], ["jobs failed", selectedUser.failedJobCount], ["threads", selectedUser.conversationCount], ["messages", selectedUser.recentMessageCount], ["last", formatDate(selectedUser.lastActivityAt)]].map(([label, value]) => (
                <div key={label} className="border-l border-black/15 pl-3"><BlueprintLabel>{label}</BlueprintLabel><div className="mt-2 font-mono text-sm">{value}</div></div>
              ))}
            </div>
          </section>
        )}

        <section className="border border-black/15 bg-background/80">
          <div className="flex items-center justify-between border-b border-black/15 px-4 py-3"><h2 className="font-display text-xl">Users / access ledger</h2><BlueprintLabel>{data.users.length} rows</BlueprintLabel></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-sm">
              <thead className="text-left text-[10px] font-mono uppercase tracking-[0.2em] text-muted"><tr className="border-b border-black/15"><th className="px-4 py-3 font-medium">Account</th><th className="px-4 py-3 font-medium">Role</th><th className="px-4 py-3 font-medium">Docs</th><th className="px-4 py-3 font-medium">Chunks</th><th className="px-4 py-3 font-medium">Processing</th><th className="px-4 py-3 font-medium">Failed</th><th className="px-4 py-3 font-medium">Threads</th><th className="px-4 py-3 font-medium">Msgs</th><th className="px-4 py-3 font-medium">Cites</th><th className="px-4 py-3 font-medium">Last active</th></tr></thead>
              <tbody>{data.users.map((user) => (
                <tr key={user.id} onClick={() => setSelectedUserId(user.id)} className="cursor-pointer border-b border-black/10 last:border-b-0 hover:bg-black/[0.025]">
                  <td className="px-4 py-4"><div className="font-medium">{user.name || user.email || "Unnamed user"}</div><div className="mt-1 font-mono text-[11px] text-muted">{user.email || user.id}</div></td>
                  <td className="px-4 py-4"><span className="border border-black/15 px-2 py-1 text-[11px] uppercase tracking-wider">{user.role}</span></td>
                  <td className="px-4 py-4 font-mono">{user.documentCount}</td><td className="px-4 py-4 font-mono">{user.chunkCount}</td><td className="px-4 py-4 font-mono">{user.processingCount}</td><td className="px-4 py-4 font-mono">{user.failedJobCount}</td><td className="px-4 py-4 font-mono">{user.conversationCount}</td><td className="px-4 py-4 font-mono">{user.recentMessageCount}</td><td className="px-4 py-4 font-mono">{user.sourceCitationCount}</td><td className="px-4 py-4 font-mono text-[11px] text-muted">{formatDate(user.lastActivityAt)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>

        <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="min-w-0 overflow-hidden border border-black/15 bg-background/80">
            <div className="border-b border-black/15 px-4 py-3"><h2 className="font-display text-xl leading-tight">Documents / storage / metadata</h2></div>
            {scoped.recentDocuments.length === 0 ? <EmptyLine label="No document traces yet." /> : scoped.recentDocuments.map((document) => (
              <div key={document.id} className="min-w-0 border-b border-black/10 px-4 py-4 text-sm last:border-b-0">
                <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"><div className="min-w-0"><div className="break-words font-medium [overflow-wrap:anywhere]">{document.title}</div><div className="mt-1 break-words font-mono text-[11px] text-muted [overflow-wrap:anywhere]">{document.sourceType} / {document.chunkCount} chunks / {shortId(document.userId)}</div></div><div className="font-mono text-[11px] uppercase tracking-wider text-muted">{document.status}</div></div>
                <div className="mt-3 grid min-w-0 gap-2 font-mono text-[11px] text-muted md:grid-cols-2"><WrapText>file: {document.originalFilename || document.url || "--"}</WrapText><WrapText>storage: {document.storageBucket || "--"}/{document.storagePath || "--"}</WrapText><WrapText>hash: {shortId(document.contentHash)}</WrapText><WrapText>updated: {formatDate(document.updatedAt)}</WrapText></div>
                {(document.errorMessage || document.metadata) && <div className="mt-3 min-w-0 break-words border-l border-black/15 pl-3 font-mono text-[11px] text-muted [overflow-wrap:anywhere]">{document.errorMessage || stringifyMeta(document.metadata)}</div>}
              </div>
            ))}
          </div>

          <div className="min-w-0 overflow-hidden border border-black/15 bg-background/80">
            <div className="border-b border-black/15 px-4 py-3"><h2 className="font-display text-xl">System timeline</h2></div>
            {scoped.timeline.length === 0 ? <EmptyLine label="No timeline events yet." /> : scoped.timeline.map((event, index) => (
              <div key={`${event.type}-${event.createdAt}-${index}`} className="grid min-w-0 gap-1 border-b border-black/10 px-4 py-3 text-sm last:border-b-0 sm:grid-cols-[90px_minmax(0,1fr)_auto] sm:gap-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted">{event.type}</div><div className="min-w-0 break-words text-foreground/80 [overflow-wrap:anywhere] sm:line-clamp-1">{event.title}</div><div className="font-mono text-[10px] uppercase tracking-wider text-muted">{event.status}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid min-w-0 gap-6 xl:grid-cols-3">
          <div className="min-w-0 overflow-hidden border border-black/15 bg-background/80"><div className="border-b border-black/15 px-4 py-3"><h2 className="font-display text-xl">Ingestion jobs</h2></div>{scoped.recentJobs.length === 0 ? <EmptyLine label="No jobs yet." /> : scoped.recentJobs.map((job) => <div key={job.id} className="min-w-0 border-b border-black/10 px-4 py-4 text-sm last:border-b-0"><div className="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,1fr)_auto]"><span className="break-words font-medium [overflow-wrap:anywhere]">{job.jobType} / {job.stage || "queued"}</span><span className="font-mono text-[11px] uppercase tracking-wider text-muted">{job.status}</span></div><div className="mt-2 break-words font-mono text-[11px] text-muted [overflow-wrap:anywhere]">doc {shortId(job.documentId)} / {formatDate(job.createdAt)}</div>{(job.errorMessage || job.metadata) && <div className="mt-2 break-words text-xs text-muted [overflow-wrap:anywhere] sm:line-clamp-2">{job.errorMessage || stringifyMeta(job.metadata)}</div>}</div>)}</div>
          <div className="min-w-0 overflow-hidden border border-black/15 bg-background/80"><div className="border-b border-black/15 px-4 py-3"><h2 className="font-display text-xl">Chunk samples</h2></div>{scoped.sampledChunks.length === 0 ? <EmptyLine label="No chunks sampled yet." /> : scoped.sampledChunks.map((chunk) => <div key={chunk.id} className="min-w-0 border-b border-black/10 px-4 py-4 text-sm last:border-b-0"><div className="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,1fr)_auto]"><span className="break-words font-medium [overflow-wrap:anywhere]">#{chunk.chunkIndex} / {chunk.sourceType}</span><span className="font-mono text-[11px] text-muted">{chunk.tokenCount ?? 0} tok</span></div><div className="mt-2 break-words font-mono text-[11px] text-muted [overflow-wrap:anywhere]">doc {shortId(chunk.documentId)} / page {chunk.pageNumber ?? "--"}</div><div className="mt-2 break-words text-xs text-muted [overflow-wrap:anywhere] sm:line-clamp-1">{chunk.url || stringifyMeta(chunk.metadata)}</div></div>)}</div>
          <div className="min-w-0 overflow-hidden border border-black/15 bg-background/80"><div className="border-b border-black/15 px-4 py-3"><h2 className="font-display text-xl">Citations / sources</h2></div>{scoped.recentSources.length === 0 ? <EmptyLine label="No citations yet." /> : scoped.recentSources.map((source) => <div key={source.id} className="min-w-0 border-b border-black/10 px-4 py-4 text-sm last:border-b-0"><div className="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,1fr)_auto]"><span className="font-mono text-[11px] text-muted">score {source.score?.toFixed(3) ?? "--"}</span><span className="font-mono text-[11px] text-muted">{formatDate(source.createdAt)}</span></div><p className="mt-2 break-words text-foreground/75 [overflow-wrap:anywhere] sm:line-clamp-3">{source.snippet || stringifyMeta(source.metadata)}</p><div className="mt-2 break-words font-mono text-[11px] text-muted [overflow-wrap:anywhere]">chunk {shortId(source.chunkId)} / msg {shortId(source.messageId)}</div></div>)}</div>
        </section>

        <section className="border border-black/15 bg-background/80">
          <div className="border-b border-black/15 px-4 py-3"><h2 className="font-display text-xl">Message trace archive</h2></div>
          {scoped.recentMessages.length === 0 ? <EmptyLine label="No chat traces yet." /> : scoped.recentMessages.map((message) => (
            <div key={message.id} className="border-b border-black/10 px-4 py-4 text-sm last:border-b-0">
              <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-wider text-muted"><span>{message.role}</span><span className="h-px w-6 bg-black/20" /><span>{formatDate(message.createdAt)}</span><span>{message.model || "no-model"}</span><span>{shortId(message.userId)}</span></div>
              <p className="mt-2 line-clamp-3 text-foreground/75">{message.content}</p>
              <div className="mt-2 font-mono text-[11px] text-muted">{stringifyMeta(message.metadata)}</div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}


