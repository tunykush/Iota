import Link from "next/link";
import type {
  Conversation,
  DashboardStats,
  Document,
  DocumentSourceType,
  DocumentStatus,
} from "@/lib/api/types";

export const DASHBOARD_OVERVIEW_EMPTY_STATS: DashboardStats = {
  documentCount: 0,
  processingCount: 0,
  chunkCount: 0,
  queryCountToday: 0,
  queryCountYesterday: 0,
  avgAnswerMs: 0,
};

export const DASHBOARD_OVERVIEW_FIXTURE_STATS: DashboardStats = {
  documentCount: 18,
  processingCount: 2,
  chunkCount: 12684,
  queryCountToday: 42,
  queryCountYesterday: 31,
  avgAnswerMs: 1240,
};

export const DASHBOARD_OVERVIEW_FIXTURE_DOCUMENTS: Document[] = [
  {
    id: "fixture-doc-1",
    sourceType: "pdf",
    title: "Machine Learning Systems Handbook.pdf",
    originalFilename: "machine-learning-systems-handbook.pdf",
    status: "ready",
    chunkCount: 1420,
    createdAt: "2026-05-09T08:20:00.000Z",
    updatedAt: "2026-05-09T08:20:00.000Z",
  },
  {
    id: "fixture-doc-2",
    sourceType: "website",
    title: "Internal onboarding knowledge base",
    url: "https://docs.example.com/onboarding",
    status: "processing",
    chunkCount: 386,
    createdAt: "2026-05-10T06:45:00.000Z",
    updatedAt: "2026-05-10T06:45:00.000Z",
  },
  {
    id: "fixture-doc-3",
    sourceType: "database",
    title: "Customer support playbooks",
    status: "ready",
    chunkCount: 2348,
    createdAt: "2026-05-08T13:10:00.000Z",
    updatedAt: "2026-05-08T13:10:00.000Z",
  },
  {
    id: "fixture-doc-4",
    sourceType: "pdf",
    title: "Quarterly compliance register",
    originalFilename: "quarterly-compliance-register.pdf",
    status: "failed",
    chunkCount: 0,
    createdAt: "2026-05-07T11:00:00.000Z",
    updatedAt: "2026-05-07T11:00:00.000Z",
  },
  {
    id: "fixture-doc-5",
    sourceType: "website",
    title: "API reference mirror",
    url: "https://docs.example.com/api",
    status: "ready",
    chunkCount: 912,
    createdAt: "2026-05-06T10:30:00.000Z",
    updatedAt: "2026-05-06T10:30:00.000Z",
  },
];

export const DASHBOARD_OVERVIEW_FIXTURE_CONVERSATIONS: Conversation[] = [
  {
    id: "fixture-chat-1",
    title: "Summarize retrieval failure modes for the ingestion pipeline",
    createdAt: "2026-05-10T07:10:00.000Z",
    updatedAt: "2026-05-10T07:10:00.000Z",
    messageCount: 8,
  },
  {
    id: "fixture-chat-2",
    title: "Find citations for the new database sync policy",
    createdAt: "2026-05-10T05:20:00.000Z",
    updatedAt: "2026-05-10T05:20:00.000Z",
    messageCount: 6,
  },
  {
    id: "fixture-chat-3",
    title: "Compare onboarding docs against the support playbook",
    createdAt: "2026-05-09T22:00:00.000Z",
    updatedAt: "2026-05-09T22:00:00.000Z",
    messageCount: 10,
  },
];

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
        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
      )}
      {label[status]}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="rounded-sm border border-black/10 px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-muted">
      {type}
    </span>
  );
}

type DashboardOverviewSurfaceProps = {
  displayName: string;
  stats: DashboardStats;
  recentDocuments: Document[];
  recentConversations: Conversation[];
  error?: string | null;
  onRetry?: () => void;
};

export function DashboardOverviewSurface({
  displayName,
  stats,
  recentDocuments,
  recentConversations,
  error,
  onRetry,
}: DashboardOverviewSurfaceProps) {
  const queryDelta = stats.queryCountToday - stats.queryCountYesterday;
  const statCards = [
    {
      label: "Documents",
      value: stats.documentCount.toString(),
      sub: `${stats.processingCount} processing`,
      accent: false,
    },
    {
      label: "Chunks indexed",
      value: stats.chunkCount.toLocaleString(),
      sub: "1536-d vectors",
      accent: false,
    },
    {
      label: "Queries today",
      value: stats.queryCountToday.toString(),
      sub: `${queryDelta >= 0 ? "up" : "down"} ${Math.abs(queryDelta)} vs yesterday`,
      accent: false,
    },
    {
      label: "Avg. answer",
      value: `${(stats.avgAnswerMs / 1000).toFixed(1)}s`,
      sub: "top-5 retrieval",
      accent: true,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl overflow-x-hidden p-4 lg:p-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-black/10 pb-5">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-px w-4 bg-accent" />
            <span className="section-label text-[10px]">Overview</span>
            <span className="font-mono text-[10px] text-muted">No. 01</span>
          </div>
          <h1 className="font-display text-2xl font-medium tracking-tight">
            Good morning, {displayName}
            <span className="text-accent">.</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            {stats.documentCount > 0
              ? `Your knowledge base is ready - ${stats.documentCount} sources indexed.`
              : "Your knowledge base is empty. Upload a source to begin."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/upload" className="dash-btn">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload
          </Link>
          <Link href="/dashboard/chat" className="dash-btn-primary">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            New chat
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}{" "}
          {onRetry && (
            <button type="button" onClick={onRetry} className="underline">
              retry
            </button>
          )}
        </div>
      )}

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="dash-stat-card">
            <div className="mb-2 font-mono text-[9px] uppercase tracking-widest text-muted">{s.label}</div>
            <div className={`mb-1 font-display text-2xl font-medium leading-none ${s.accent ? "text-accent" : ""}`}>
              {s.value}
            </div>
            <div className="text-[10px] text-muted">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-serif italic text-accent">I.</span>
              <span className="text-sm font-medium">Recent documents</span>
            </div>
            <Link href="/dashboard/documents" className="font-mono text-[11px] uppercase tracking-wider text-muted transition-colors hover:text-accent">
              View all {"->"}
            </Link>
          </div>

          <div className="hidden overflow-hidden rounded-sm border border-black/10 md:block">
            <div className="grid grid-cols-[1fr_60px_80px_70px_80px] gap-3 border-b border-black/10 bg-black/[0.03] px-4 py-2.5 font-mono text-[9px] uppercase tracking-widest text-muted">
              <span>Name</span>
              <span>Type</span>
              <span>Status</span>
              <span className="text-right">Chunks</span>
              <span className="text-right">Date</span>
            </div>

            {recentDocuments.length > 0 ? (
              recentDocuments.map((doc, i) => (
                <div
                  key={doc.id}
                  className={`grid grid-cols-[1fr_60px_80px_70px_80px] items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-black/[0.02] ${
                    i < recentDocuments.length - 1 ? "border-b border-black/[0.06]" : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <svg className="h-3.5 w-3.5 flex-shrink-0 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="truncate text-xs">{doc.title}</span>
                  </div>
                  <TypeBadge type={sourceTypeLabel(doc.sourceType)} />
                  <StatusBadge status={doc.status} />
                  <span className="text-right font-mono text-xs text-muted">
                    {doc.chunkCount > 0 ? doc.chunkCount.toLocaleString() : "-"}
                  </span>
                  <span className="text-right font-mono text-[10px] text-muted">{formatDate(doc.createdAt)}</span>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-muted">
                No documents yet. Upload your first source to populate this table.
              </div>
            )}
          </div>

          <div className="space-y-2 md:hidden">
            {recentDocuments.length > 0 ? (
              recentDocuments.map((doc) => (
                <div key={doc.id} className="rounded-sm border border-black/10 bg-white/20 p-3">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <span className="min-w-0 break-words text-xs font-medium leading-relaxed">{doc.title}</span>
                    <StatusBadge status={doc.status} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 font-mono text-[10px] text-muted">
                    <div>
                      <div className="mb-1 uppercase tracking-widest">Type</div>
                      <TypeBadge type={sourceTypeLabel(doc.sourceType)} />
                    </div>
                    <div>
                      <div className="mb-1 uppercase tracking-widest">Chunks</div>
                      <div>{doc.chunkCount > 0 ? doc.chunkCount.toLocaleString() : "-"}</div>
                    </div>
                    <div>
                      <div className="mb-1 uppercase tracking-widest">Date</div>
                      <div>{formatDate(doc.createdAt)}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-sm border border-black/10 bg-white/20 p-4 text-sm text-muted">No documents yet.</div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-serif italic text-accent">II.</span>
                <span className="text-sm font-medium">Recent chats</span>
              </div>
              <Link href="/dashboard/chat" className="font-mono text-[11px] uppercase tracking-wider text-muted transition-colors hover:text-accent">
                Open {"->"}
              </Link>
            </div>

            <div className="space-y-2">
              {recentConversations.length > 0 ? (
                recentConversations.map((conv) => (
                  <Link
                    key={conv.id}
                    href={`/dashboard/chat?conversationId=${conv.id}`}
                    className="group block rounded-sm border border-black/10 p-3.5 transition-colors hover:border-accent/30 hover:bg-black/[0.01]"
                  >
                    <p className="mb-2 line-clamp-2 text-xs leading-relaxed text-foreground/80 transition-colors group-hover:text-foreground">
                      {conv.title ?? "Untitled conversation"}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-muted">{timeAgo(conv.updatedAt)}</span>
                      <span className="font-mono text-[10px] text-muted">
                        {conv.messageCount ? `${conv.messageCount} messages / ${Math.ceil(conv.messageCount / 2)} turns` : ""}
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-sm border border-black/10 p-3.5 text-sm text-muted">
                  No chats yet. Start a new grounded chat when you are ready.
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-center gap-2">
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
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  ),
                },
                {
                  href: "/dashboard/upload",
                  label: "Crawl a website",
                  sub: "Ingest a URL into your knowledge base",
                  icon: (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  ),
                },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="group flex items-center gap-3 rounded-sm border border-black/10 p-3 transition-colors hover:border-accent/30 hover:bg-black/[0.01]"
                >
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-sm border border-black/10 text-muted transition-colors group-hover:border-accent/30 group-hover:text-accent">
                    {action.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium">{action.label}</div>
                    <div className="text-[10px] text-muted">{action.sub}</div>
                  </div>
                  <svg className="ml-auto h-3.5 w-3.5 flex-shrink-0 text-muted transition-colors group-hover:text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-2 border-t border-black/10 pt-5 font-mono text-[9px] uppercase tracking-widest text-muted sm:flex-row sm:items-center sm:justify-between">
        <span>iota / dashboard / vol. 01</span>
        <span>10.7626 N / 106.6602 E</span>
        <span>live data</span>
      </div>
    </div>
  );
}
