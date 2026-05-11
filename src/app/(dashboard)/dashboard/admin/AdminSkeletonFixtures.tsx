"use client";

/**
 * Boneyard skeleton fixture components for each admin sub-page.
 * These render the same UI structure with fixture data so Boneyard
 * can auto-generate accurate skeleton shapes during loading.
 */

import { ADMIN_TELEMETRY_FIXTURE } from "./adminTelemetryFixture";
import {
  AdminGridBackground,
  AdminPageHeader,
  BlueprintLabel,
  BreakdownPanel,
  EmptyLine,
  WrapText,
  formatDate,
  shortId,
  stringifyMeta,
} from "./AdminShared";

const FIX = ADMIN_TELEMETRY_FIXTURE;

/* ─── Overview page fixture ─── */
export function AdminOverviewFixture() {
  const stats = [
    ["Users", FIX.stats.userCount, "registered accounts"],
    ["Admins", FIX.stats.adminCount, "elevated profiles"],
    ["Documents", FIX.stats.documentCount, `${FIX.stats.documentsLast7d} new / 7d`],
    ["Chunks", FIX.stats.chunkCount, `${FIX.stats.sampledChunkCount} sampled`],
    ["Jobs", FIX.stats.jobCount, `${FIX.stats.failedJobCount} failed`],
    ["Threads", FIX.stats.conversationCount, "conversations"],
    ["Messages", FIX.stats.recentMessageCount, `${FIX.stats.messagesLast24h} / 24h`],
    ["Citations", FIX.stats.sourceCitationCount, "retrieval sources"],
  ];

  return (
    <AdminGridBackground>
      <AdminPageHeader
        label="Admin deep access surface"
        title="Full-system telemetry map"
        description="Service-role backed view across profiles, documents, storage metadata, ingestion jobs, chunks, citations, conversations, messages, and recent system timeline."
      />
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
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <BreakdownPanel title="Doc status" rows={FIX.breakdowns.documentsByStatus} />
        <BreakdownPanel title="Sources" rows={FIX.breakdowns.documentsBySourceType} />
        <BreakdownPanel title="Jobs" rows={FIX.breakdowns.jobsByStatus} />
        <BreakdownPanel title="Messages" rows={FIX.breakdowns.messagesByRole} />
        <BreakdownPanel title="Chunks" rows={FIX.breakdowns.chunksBySourceType} />
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="border border-black/15 bg-background/80 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg">Recent Documents</h3>
            <BlueprintLabel>{FIX.recentDocuments.length} latest</BlueprintLabel>
          </div>
          <div className="space-y-2">
            {FIX.recentDocuments.slice(0, 5).map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-3 py-2 border-b border-black/5 last:border-b-0">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{doc.title}</div>
                  <div className="text-[11px] font-mono text-muted">{doc.sourceType} / {doc.chunkCount} chunks</div>
                </div>
                <span className="flex-shrink-0 border border-black/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted">{doc.status}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="border border-black/15 bg-background/80 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg">System Timeline</h3>
            <BlueprintLabel>{FIX.timeline.length} events</BlueprintLabel>
          </div>
          <div className="space-y-2">
            {FIX.timeline.slice(0, 5).map((event, index) => (
              <div key={`${event.type}-${event.createdAt}-${index}`} className="flex items-center gap-3 py-2 border-b border-black/5 last:border-b-0">
                <span className="flex-shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted w-16">{event.type}</span>
                <span className="min-w-0 text-sm truncate text-foreground/80">{event.title}</span>
                <span className="flex-shrink-0 ml-auto font-mono text-[10px] uppercase tracking-wider text-muted">{event.status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AdminGridBackground>
  );
}

/* ─── Users page fixture ─── */
export function AdminUsersFixture() {
  return (
    <AdminGridBackground>
      <AdminPageHeader
        label="User management"
        title="Users / access ledger"
        description="Complete user roster with activity metrics, document counts, and role assignments."
      >
        <div className="text-right">
          <div className="font-mono text-2xl">{FIX.users.length}</div>
          <BlueprintLabel>total accounts</BlueprintLabel>
        </div>
      </AdminPageHeader>
      <section className="border border-black/15 bg-background/80">
        <div className="flex items-center justify-between border-b border-black/15 px-4 py-3">
          <h2 className="font-display text-xl">All Users</h2>
          <BlueprintLabel>{FIX.users.length} rows</BlueprintLabel>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-sm">
            <thead className="text-left text-[10px] font-mono uppercase tracking-[0.2em] text-muted">
              <tr className="border-b border-black/15">
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Docs</th>
                <th className="px-4 py-3 font-medium">Chunks</th>
                <th className="px-4 py-3 font-medium">Processing</th>
                <th className="px-4 py-3 font-medium">Failed</th>
                <th className="px-4 py-3 font-medium">Threads</th>
                <th className="px-4 py-3 font-medium">Msgs</th>
                <th className="px-4 py-3 font-medium">Cites</th>
                <th className="px-4 py-3 font-medium">Last active</th>
              </tr>
            </thead>
            <tbody>
              {FIX.users.map((user) => (
                <tr key={user.id} className="border-b border-black/10 last:border-b-0">
                  <td className="px-4 py-4">
                    <div className="font-medium">{user.name || user.email}</div>
                    <div className="mt-1 font-mono text-[11px] text-muted">{user.email || user.id}</div>
                  </td>
                  <td className="px-4 py-4"><span className="border border-black/15 px-2 py-1 text-[11px] uppercase tracking-wider">{user.role}</span></td>
                  <td className="px-4 py-4 font-mono">{user.documentCount}</td>
                  <td className="px-4 py-4 font-mono">{user.chunkCount}</td>
                  <td className="px-4 py-4 font-mono">{user.processingCount}</td>
                  <td className="px-4 py-4 font-mono">{user.failedJobCount}</td>
                  <td className="px-4 py-4 font-mono">{user.conversationCount}</td>
                  <td className="px-4 py-4 font-mono">{user.recentMessageCount}</td>
                  <td className="px-4 py-4 font-mono">{user.sourceCitationCount}</td>
                  <td className="px-4 py-4 font-mono text-[11px] text-muted">{formatDate(user.lastActivityAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminGridBackground>
  );
}

/* ─── Documents page fixture ─── */
export function AdminDocumentsFixture() {
  return (
    <AdminGridBackground>
      <AdminPageHeader
        label="Document registry"
        title="Documents / storage / metadata"
        description="Full document inventory with storage paths, content hashes, chunk counts, and processing status."
      >
        <div className="text-right">
          <div className="font-mono text-2xl">{FIX.recentDocuments.length}</div>
          <BlueprintLabel>documents</BlueprintLabel>
        </div>
      </AdminPageHeader>
      <section className="border border-black/15 bg-background/80">
        <div className="flex items-center justify-between border-b border-black/15 px-4 py-3">
          <h2 className="font-display text-xl">All Documents</h2>
          <BlueprintLabel>{FIX.recentDocuments.length} entries</BlueprintLabel>
        </div>
        {FIX.recentDocuments.map((document) => (
          <div key={document.id} className="min-w-0 border-b border-black/10 px-4 py-4 text-sm last:border-b-0">
            <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
              <div className="min-w-0">
                <div className="break-words font-medium [overflow-wrap:anywhere]">{document.title}</div>
                <div className="mt-1 break-words font-mono text-[11px] text-muted [overflow-wrap:anywhere]">
                  {document.sourceType} / {document.chunkCount} chunks / {shortId(document.userId)}
                </div>
              </div>
              <div className="font-mono text-[11px] uppercase tracking-wider text-muted">
                <span className="border border-black/15 px-2 py-1">{document.status}</span>
              </div>
            </div>
            <div className="mt-3 grid min-w-0 gap-2 font-mono text-[11px] text-muted md:grid-cols-2">
              <WrapText>file: {document.originalFilename || document.url || "--"}</WrapText>
              <WrapText>storage: {document.storageBucket || "--"}/{document.storagePath || "--"}</WrapText>
              <WrapText>hash: {shortId(document.contentHash)}</WrapText>
              <WrapText>updated: {formatDate(document.updatedAt)}</WrapText>
            </div>
            {document.metadata && (
              <div className="mt-3 min-w-0 break-words border-l border-black/15 pl-3 font-mono text-[11px] text-muted [overflow-wrap:anywhere]">
                {stringifyMeta(document.metadata)}
              </div>
            )}
          </div>
        ))}
      </section>
    </AdminGridBackground>
  );
}

/* ─── Jobs page fixture ─── */
export function AdminJobsFixture() {
  return (
    <AdminGridBackground>
      <AdminPageHeader
        label="Pipeline operations"
        title="Ingestion jobs & chunk samples"
        description="Track ingestion pipeline stages, job statuses, and inspect sampled chunk data across all users."
      >
        <div className="flex gap-6">
          <div className="text-right">
            <div className="font-mono text-2xl">{FIX.recentJobs.length}</div>
            <BlueprintLabel>jobs</BlueprintLabel>
          </div>
          <div className="text-right">
            <div className="font-mono text-2xl">{FIX.sampledChunks.length}</div>
            <BlueprintLabel>chunks</BlueprintLabel>
          </div>
        </div>
      </AdminPageHeader>
      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <section className="min-w-0 overflow-hidden border border-black/15 bg-background/80">
          <div className="flex items-center justify-between border-b border-black/15 px-4 py-3">
            <h2 className="font-display text-xl">Ingestion Jobs</h2>
            <BlueprintLabel>{FIX.recentJobs.length} entries</BlueprintLabel>
          </div>
          {FIX.recentJobs.map((job) => (
            <div key={job.id} className="min-w-0 border-b border-black/10 px-4 py-4 text-sm last:border-b-0">
              <div className="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,1fr)_auto]">
                <span className="break-words font-medium [overflow-wrap:anywhere]">{job.jobType} / {job.stage || "queued"}</span>
                <span className="font-mono text-[11px] uppercase tracking-wider border border-black/15 px-2 py-0.5 text-muted">{job.status}</span>
              </div>
              <div className="mt-2 break-words font-mono text-[11px] text-muted [overflow-wrap:anywhere]">
                doc {shortId(job.documentId)} / {formatDate(job.createdAt)}
              </div>
              {job.metadata && (
                <div className="mt-2 break-words text-xs text-muted [overflow-wrap:anywhere] sm:line-clamp-2">{stringifyMeta(job.metadata)}</div>
              )}
            </div>
          ))}
        </section>
        <section className="min-w-0 overflow-hidden border border-black/15 bg-background/80">
          <div className="flex items-center justify-between border-b border-black/15 px-4 py-3">
            <h2 className="font-display text-xl">Chunk Samples</h2>
            <BlueprintLabel>{FIX.sampledChunks.length} entries</BlueprintLabel>
          </div>
          {FIX.sampledChunks.map((chunk) => (
            <div key={chunk.id} className="min-w-0 border-b border-black/10 px-4 py-4 text-sm last:border-b-0">
              <div className="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,1fr)_auto]">
                <span className="break-words font-medium [overflow-wrap:anywhere]">#{chunk.chunkIndex} / {chunk.sourceType}</span>
                <span className="font-mono text-[11px] text-muted">{chunk.tokenCount ?? 0} tok</span>
              </div>
              <div className="mt-2 break-words font-mono text-[11px] text-muted [overflow-wrap:anywhere]">
                doc {shortId(chunk.documentId)} / page {chunk.pageNumber ?? "--"}
              </div>
              <div className="mt-2 break-words text-xs text-muted [overflow-wrap:anywhere] sm:line-clamp-1">
                {chunk.url || stringifyMeta(chunk.metadata)}
              </div>
            </div>
          ))}
        </section>
      </div>
    </AdminGridBackground>
  );
}

/* ─── Messages page fixture ─── */
export function AdminMessagesFixture() {
  return (
    <AdminGridBackground>
      <AdminPageHeader
        label="Communication log"
        title="Message traces & citations"
        description="Full message archive with model attribution, metadata, and retrieval source citations."
      >
        <div className="flex gap-6">
          <div className="text-right">
            <div className="font-mono text-2xl">{FIX.recentMessages.length}</div>
            <BlueprintLabel>messages</BlueprintLabel>
          </div>
          <div className="text-right">
            <div className="font-mono text-2xl">{FIX.recentSources.length}</div>
            <BlueprintLabel>citations</BlueprintLabel>
          </div>
        </div>
      </AdminPageHeader>
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className="border border-black/15 bg-background/80">
          <div className="flex items-center justify-between border-b border-black/15 px-4 py-3">
            <h2 className="font-display text-xl">Message Trace Archive</h2>
            <BlueprintLabel>{FIX.recentMessages.length} entries</BlueprintLabel>
          </div>
          {FIX.recentMessages.map((message) => (
            <div key={message.id} className="border-b border-black/10 px-4 py-4 text-sm last:border-b-0">
              <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-wider text-muted">
                <span className="border border-black/15 px-2 py-0.5">{message.role}</span>
                <span className="h-px w-6 bg-black/20" />
                <span>{formatDate(message.createdAt)}</span>
                <span>{message.model || "no-model"}</span>
                <span>{shortId(message.userId)}</span>
              </div>
              <p className="mt-2 line-clamp-3 text-foreground/75">{message.content}</p>
              <div className="mt-2 font-mono text-[11px] text-muted">{stringifyMeta(message.metadata)}</div>
            </div>
          ))}
        </section>
        <section className="border border-black/15 bg-background/80">
          <div className="flex items-center justify-between border-b border-black/15 px-4 py-3">
            <h2 className="font-display text-xl">Citations / Sources</h2>
            <BlueprintLabel>{FIX.recentSources.length} entries</BlueprintLabel>
          </div>
          {FIX.recentSources.map((source) => (
            <div key={source.id} className="min-w-0 border-b border-black/10 px-4 py-4 text-sm last:border-b-0">
              <div className="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,1fr)_auto]">
                <span className="font-mono text-[11px] text-muted">score {source.score?.toFixed(3) ?? "--"}</span>
                <span className="font-mono text-[11px] text-muted">{formatDate(source.createdAt)}</span>
              </div>
              <p className="mt-2 break-words text-foreground/75 [overflow-wrap:anywhere] sm:line-clamp-3">
                {source.snippet || stringifyMeta(source.metadata)}
              </p>
              <div className="mt-2 break-words font-mono text-[11px] text-muted [overflow-wrap:anywhere]">
                chunk {shortId(source.chunkId)} / msg {shortId(source.messageId)}
              </div>
            </div>
          ))}
        </section>
      </div>
    </AdminGridBackground>
  );
}

/* ─── Timeline page fixture ─── */
export function AdminTimelineFixture() {
  return (
    <AdminGridBackground>
      <AdminPageHeader
        label="Activity feed"
        title="System timeline"
        description="Chronological feed of all system events — documents, jobs, conversations, and messages."
      >
        <div className="text-right">
          <div className="font-mono text-2xl">{FIX.timeline.length}</div>
          <BlueprintLabel>events</BlueprintLabel>
        </div>
      </AdminPageHeader>
      <section className="border border-black/15 bg-background/80">
        <div className="flex items-center justify-between border-b border-black/15 px-4 py-3">
          <h2 className="font-display text-xl">Event Stream</h2>
          <BlueprintLabel>{FIX.timeline.length} events</BlueprintLabel>
        </div>
        <div className="divide-y divide-black/10">
          {FIX.timeline.map((event, index) => (
            <div key={`${event.type}-${event.createdAt}-${index}`} className="flex items-start gap-4 px-4 py-4">
              <div className="flex flex-col items-center pt-1">
                <div className="w-2.5 h-2.5 rounded-full border-2 border-blue-400 bg-blue-100" />
                {index < FIX.timeline.length - 1 && <div className="w-px h-8 bg-black/10 mt-1" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="border border-black/15 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider">{event.type}</span>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-muted">{event.status}</span>
                  <span className="text-[11px] font-mono text-muted ml-auto">{formatDate(event.createdAt)}</span>
                </div>
                <p className="mt-1.5 text-sm text-foreground/80 truncate">{event.title}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AdminGridBackground>
  );
}

/* ─── Analytics page fixture ─── */
export function AdminAnalyticsFixture() {
  const totalDocs = FIX.users.reduce((sum, u) => sum + u.documentCount, 0);
  const totalChunks = FIX.users.reduce((sum, u) => sum + u.chunkCount, 0);
  const totalMessages = FIX.users.reduce((sum, u) => sum + u.recentMessageCount, 0);
  const totalThreads = FIX.users.reduce((sum, u) => sum + u.conversationCount, 0);
  const totalCitations = FIX.users.reduce((sum, u) => sum + u.sourceCitationCount, 0);

  const userActivity: Record<string, number> = {};
  const userDocuments: Record<string, number> = {};
  const userChunks: Record<string, number> = {};
  for (const user of FIX.users) {
    const label = user.name || user.email || user.id.slice(0, 8);
    userActivity[label] = user.recentMessageCount;
    userDocuments[label] = user.documentCount;
    userChunks[label] = user.chunkCount;
  }

  return (
    <AdminGridBackground>
      <AdminPageHeader
        label="System analytics"
        title="Breakdowns & distributions"
        description="Visual breakdown of system data across documents, jobs, messages, chunks, and user activity."
      />
      <section className="grid border border-black/15 bg-background/75 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Total Docs", totalDocs],
          ["Total Chunks", totalChunks],
          ["Total Messages", totalMessages],
          ["Total Threads", totalThreads],
          ["Total Citations", totalCitations],
        ].map(([label, value]) => (
          <div key={label} className="relative border-b border-r border-black/10 p-4 last:border-r-0">
            <BlueprintLabel>{label}</BlueprintLabel>
            <div className="mt-3 font-display text-3xl leading-none">{value}</div>
            <span className="absolute right-3 top-3 h-2 w-2 border border-black/25" />
          </div>
        ))}
      </section>
      <div>
        <div className="mb-4">
          <BlueprintLabel>System breakdowns</BlueprintLabel>
          <h2 className="mt-1 font-display text-xl">Data Distribution</h2>
        </div>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <BreakdownPanel title="Doc Status" rows={FIX.breakdowns.documentsByStatus} />
          <BreakdownPanel title="Doc Sources" rows={FIX.breakdowns.documentsBySourceType} />
          <BreakdownPanel title="Job Status" rows={FIX.breakdowns.jobsByStatus} />
          <BreakdownPanel title="Msg Roles" rows={FIX.breakdowns.messagesByRole} />
          <BreakdownPanel title="Chunk Types" rows={FIX.breakdowns.chunksBySourceType} />
        </section>
      </div>
      <div>
        <div className="mb-4">
          <BlueprintLabel>Per-user analytics</BlueprintLabel>
          <h2 className="mt-1 font-display text-xl">User Activity Distribution</h2>
        </div>
        <section className="grid gap-4 md:grid-cols-3">
          <BreakdownPanel title="Messages by User" rows={userActivity} />
          <BreakdownPanel title="Documents by User" rows={userDocuments} />
          <BreakdownPanel title="Chunks by User" rows={userChunks} />
        </section>
      </div>
    </AdminGridBackground>
  );
}

/* ─── Traffic & Quota page fixture ─── */
export function AdminTrafficFixture() {
  const fixtureModels = [
    { provider: "groq", model: "llama-3.1-8b-instant", last24h: 42, last7d: 186, total: 520, avgMs: 340, p95Ms: 890, users: 8, quota: { limit: 14400, used: 42, remaining: 14358, percent: 0, note: "Free tier: 14.4k req/day" } },
    { provider: "gemini", model: "gemini-2.5-flash-lite", last24h: 28, last7d: 124, total: 380, avgMs: 1200, p95Ms: 2800, users: 6, quota: { limit: 1500, used: 28, remaining: 1472, percent: 2, note: "Free tier: 1500 RPD" } },
    { provider: "openrouter", model: "openai/gpt-oss-20b:free", last24h: 12, last7d: 68, total: 210, avgMs: 2400, p95Ms: 5200, users: 4, quota: { limit: 200, used: 12, remaining: 188, percent: 6, note: "Free model, ~200 req/day" } },
    { provider: "zai", model: "glm-4.5-flash", last24h: 5, last7d: 32, total: 98, avgMs: 3100, p95Ms: 6400, users: 3, quota: { limit: 1000, used: 5, remaining: 995, percent: 1, note: "Free tier: ~1000 req/day" } },
    { provider: "deepseek", model: "deepseek-chat", last24h: 2, last7d: 14, total: 45, avgMs: 1800, p95Ms: 4200, users: 2, quota: null },
  ];

  const fixtureProviders = [
    { name: "groq", requests24h: 42, requests7d: 186, total: 520, models: 1, errors: 0 },
    { name: "gemini", requests24h: 28, requests7d: 124, total: 380, models: 3, errors: 2 },
    { name: "openrouter", requests24h: 12, requests7d: 68, total: 210, models: 4, errors: 1 },
    { name: "zai", requests24h: 5, requests7d: 32, total: 98, models: 4, errors: 0 },
    { name: "deepseek", requests24h: 2, requests7d: 14, total: 45, models: 1, errors: 0 },
  ];

  const providerColors: Record<string, string> = {
    groq: "#2563eb", gemini: "#059669", openrouter: "#7c3aed", zai: "#d97706", deepseek: "#0891b2",
  };

  return (
    <AdminGridBackground>
      <AdminPageHeader
        label="Model traffic & quotas"
        title="LLM Provider Dashboard"
        description="Real-time traffic monitoring, quota usage, and performance metrics across all configured LLM providers."
      >
        <div className="flex gap-6">
          <div className="text-right">
            <div className="font-mono text-2xl">5</div>
            <BlueprintLabel>providers</BlueprintLabel>
          </div>
          <div className="text-right">
            <div className="font-mono text-2xl">13</div>
            <BlueprintLabel>models</BlueprintLabel>
          </div>
        </div>
      </AdminPageHeader>

      {/* KPI Cards */}
      <section className="grid border border-black/15 bg-background/75 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Total Requests", "1253", "all time", "↗"],
          ["Last 24h", "89", "requests", "⚡"],
          ["Last 7d", "424", "requests", "📊"],
          ["Providers", "5", "active", "🔌"],
          ["Models", "13", "in use", "🤖"],
        ].map(([label, value, note, icon]) => (
          <div key={label} className="relative border-b border-r border-black/10 p-5 last:border-r-0 group">
            <div className="flex items-center justify-between">
              <BlueprintLabel>{label}</BlueprintLabel>
              <span className="text-lg opacity-40">{icon}</span>
            </div>
            <div className="mt-3 font-display text-4xl leading-none tracking-tight">{value}</div>
            <div className="mt-2 text-[11px] uppercase tracking-wider text-muted">{note}</div>
          </div>
        ))}
      </section>

      {/* Area Chart + Donut placeholder */}
      <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Area chart placeholder */}
        <div className="border border-black/15 bg-background/80 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <BlueprintLabel>Traffic pattern</BlueprintLabel>
              <h2 className="mt-1 font-display text-xl">Hourly Requests (24h)</h2>
            </div>
            <div className="text-right">
              <div className="font-mono text-2xl">89</div>
              <BlueprintLabel>total / 24h</BlueprintLabel>
            </div>
          </div>
          {/* Simulated area chart shape */}
          <div className="h-[220px] relative overflow-hidden">
            <svg viewBox="0 0 400 120" className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="fixGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <path d="M0,100 L20,85 L40,90 L60,70 L80,75 L100,55 L120,60 L140,40 L160,45 L180,30 L200,35 L220,25 L240,30 L260,20 L280,35 L300,25 L320,40 L340,30 L360,45 L380,35 L400,50 L400,120 L0,120 Z" fill="url(#fixGrad)" />
              <path d="M0,100 L20,85 L40,90 L60,70 L80,75 L100,55 L120,60 L140,40 L160,45 L180,30 L200,35 L220,25 L240,30 L260,20 L280,35 L300,25 L320,40 L340,30 L360,45 L380,35 L400,50" fill="none" stroke="#2563eb" strokeWidth="2" />
            </svg>
            {/* X-axis labels */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
              {["00", "04", "08", "12", "16", "20"].map((h) => (
                <span key={h} className="text-[8px] font-mono text-muted">{h}:00</span>
              ))}
            </div>
          </div>
        </div>

        {/* Donut chart placeholder */}
        <div className="border border-black/15 bg-background/80 p-5">
          <div className="mb-4">
            <BlueprintLabel>Distribution</BlueprintLabel>
            <h2 className="mt-1 font-display text-xl">By Provider (24h)</h2>
          </div>
          <div className="h-[180px] flex items-center justify-center">
            <svg viewBox="0 0 120 120" className="w-36 h-36">
              <circle cx="60" cy="60" r="40" fill="none" stroke="#2563eb" strokeWidth="16" strokeDasharray="110 141" strokeDashoffset="0" />
              <circle cx="60" cy="60" r="40" fill="none" stroke="#059669" strokeWidth="16" strokeDasharray="70 181" strokeDashoffset="-110" />
              <circle cx="60" cy="60" r="40" fill="none" stroke="#7c3aed" strokeWidth="16" strokeDasharray="40 211" strokeDashoffset="-180" />
              <circle cx="60" cy="60" r="40" fill="none" stroke="#d97706" strokeWidth="16" strokeDasharray="20 231" strokeDashoffset="-220" />
              <circle cx="60" cy="60" r="40" fill="none" stroke="#0891b2" strokeWidth="16" strokeDasharray="10 241" strokeDashoffset="-240" />
            </svg>
          </div>
          <div className="mt-2 space-y-1.5">
            {fixtureProviders.map((p) => (
              <div key={p.name} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: providerColors[p.name] ?? "#6b7280" }} />
                <span className="capitalize flex-1">{p.name}</span>
                <span className="font-mono text-muted">{p.requests24h}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bar chart placeholder */}
      <section className="border border-black/15 bg-background/80 p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <BlueprintLabel>Model comparison</BlueprintLabel>
            <h2 className="mt-1 font-display text-xl">Requests by Model</h2>
          </div>
          <div className="flex gap-4 text-[10px] font-mono text-muted">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-600" /> 24h</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-violet-600" /> 7d</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-600/40" /> total</span>
          </div>
        </div>
        <div className="h-[260px] flex items-end gap-3 px-4">
          {fixtureModels.map((m) => (
            <div key={m.model} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex gap-[2px] items-end justify-center" style={{ height: 200 }}>
                <div className="flex-1 bg-blue-600 rounded-t-sm" style={{ height: `${(m.last24h / 50) * 100}%` }} />
                <div className="flex-1 bg-violet-600 rounded-t-sm" style={{ height: `${(m.last7d / 200) * 100}%` }} />
                <div className="flex-1 bg-emerald-600/40 rounded-t-sm" style={{ height: `${(m.total / 600) * 100}%` }} />
              </div>
              <span className="text-[8px] font-mono text-muted text-center truncate w-full">{m.model.split("/").pop()?.slice(0, 12)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Provider Cards */}
      <section>
        <div className="mb-4">
          <BlueprintLabel>Provider overview</BlueprintLabel>
          <h2 className="mt-1 font-display text-xl">Provider Traffic Summary</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {fixtureProviders.map((provider) => (
            <div key={provider.name} className="border border-black/15 bg-background/80 p-5 hover:border-black/25 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: providerColors[provider.name] ?? "#6b7280" }} />
                  <h3 className="font-display text-lg capitalize">{provider.name}</h3>
                </div>
                <span className="text-[10px] font-mono text-muted border border-black/15 px-2 py-0.5 rounded-sm">{provider.models} models</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><div className="font-mono text-2xl tracking-tight">{provider.requests24h}</div><div className="text-[10px] font-mono text-muted uppercase tracking-wider mt-1">24h</div></div>
                <div><div className="font-mono text-2xl tracking-tight">{provider.requests7d}</div><div className="text-[10px] font-mono text-muted uppercase tracking-wider mt-1">7d</div></div>
                <div><div className="font-mono text-2xl tracking-tight">{provider.total}</div><div className="text-[10px] font-mono text-muted uppercase tracking-wider mt-1">total</div></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Model Detail Cards */}
      <section>
        <div className="mb-4">
          <BlueprintLabel>Model-level metrics</BlueprintLabel>
          <h2 className="mt-1 font-display text-xl">Model Traffic & Quota Status</h2>
        </div>
        <div className="space-y-3">
          {fixtureModels.map((m) => (
            <div key={`${m.provider}/${m.model}`} className="border border-black/15 bg-background/80 p-5">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="flex items-center gap-1.5 border border-black/15 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded-sm">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: providerColors[m.provider] ?? "#6b7280" }} />
                      {m.provider}
                    </span>
                    <h3 className="font-medium text-sm">{m.model}</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    <div className="border border-black/8 p-2 rounded-sm">
                      <div className="font-mono text-lg leading-none">{m.last24h}</div>
                      <div className="text-[9px] font-mono text-muted uppercase tracking-wider mt-1">24h</div>
                    </div>
                    <div className="border border-black/8 p-2 rounded-sm">
                      <div className="font-mono text-lg leading-none">{m.last7d}</div>
                      <div className="text-[9px] font-mono text-muted uppercase tracking-wider mt-1">7d</div>
                    </div>
                    <div className="border border-black/8 p-2 rounded-sm">
                      <div className="font-mono text-lg leading-none">{m.avgMs}<span className="text-[10px] text-muted">ms</span></div>
                      <div className="text-[9px] font-mono text-muted uppercase tracking-wider mt-1">avg latency</div>
                    </div>
                    <div className="border border-black/8 p-2 rounded-sm">
                      <div className="font-mono text-lg leading-none">{m.users}</div>
                      <div className="text-[9px] font-mono text-muted uppercase tracking-wider mt-1">users</div>
                    </div>
                  </div>
                  {m.quota && (
                    <div className="mt-2">
                      <div className="text-[10px] font-mono text-muted mb-1.5">{m.quota.note}</div>
                      <div className="h-2.5 rounded-full border border-black/10 bg-black/[0.03] overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(2, m.quota.percent)}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-muted mt-1">
                        <span>{m.quota.percent}% used ({m.quota.limit.toLocaleString()} limit)</span>
                        <span>{m.quota.remaining.toLocaleString()} remaining</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end justify-center gap-1 min-w-[130px]">
                  <div className="font-mono text-3xl tracking-tight">{m.quota ? m.quota.remaining.toLocaleString() : m.total}</div>
                  <BlueprintLabel>{m.quota ? "remaining / day" : "total requests"}</BlueprintLabel>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AdminGridBackground>
  );
}

/* ─── Scope filter bar fixture ─── */
export function AdminScopeFilterFixture() {
  return (
    <div className="sticky top-[53px] z-10 bg-background/95 backdrop-blur-sm border-b border-black/10 px-4 lg:px-6 py-2 flex items-center gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="text-[9px] font-mono text-muted tracking-widest uppercase flex-shrink-0">Scope</div>
        <div className="h-7 w-40 border border-black/15 bg-background px-2 font-mono text-[11px] uppercase tracking-wider flex items-center">
          All users
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-4 text-[10px] font-mono text-muted tracking-wider">
        <span>{FIX.stats.userCount} users</span>
        <span>{FIX.stats.documentCount} docs</span>
        <span>{FIX.stats.jobCount} jobs</span>
        <span>{FIX.stats.recentMessageCount} msgs</span>
      </div>
    </div>
  );
}
