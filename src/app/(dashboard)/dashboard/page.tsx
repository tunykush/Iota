import Link from "next/link";

const STATS = [
  { label: "Documents", value: "14", sub: "3 processing", accent: false },
  { label: "Chunks indexed", value: "18,442", sub: "1536-d vectors", accent: false },
  { label: "Queries today", value: "37", sub: "↑ 12 vs yesterday", accent: false },
  { label: "Avg. answer", value: "2.8s", sub: "top-5 retrieval", accent: true },
];

const RECENT_DOCS = [
  { name: "Q3-board-deck.pdf", type: "PDF", status: "done", chunks: 142, date: "2026-05-06" },
  { name: "onboarding-guide.pdf", type: "PDF", status: "done", chunks: 88, date: "2026-05-05" },
  { name: "docs.example.com", type: "SITE", status: "processing", chunks: 0, date: "2026-05-07" },
  { name: "metrics-q3.csv", type: "DB", status: "done", chunks: 24, date: "2026-05-04" },
  { name: "product-spec-v2.pdf", type: "PDF", status: "failed", chunks: 0, date: "2026-05-03" },
];

const RECENT_CHATS = [
  { q: "What did Q3 customer interviews say about onboarding?", time: "2 min ago", sources: 4 },
  { q: "Summarise the board deck revenue section.", time: "1 hr ago", sources: 2 },
  { q: "What are the API rate limits?", time: "3 hr ago", sources: 3 },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    done: "dash-badge-ok",
    processing: "dash-badge-warn",
    failed: "dash-badge-err",
  };
  return (
    <span className={`dash-badge ${map[status] ?? ""}`}>
      {status === "processing" && (
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse mr-1" />
      )}
      {status}
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

export default function DashboardPage() {
  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8 pb-5 border-b border-black/10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-4 h-px bg-accent" />
            <span className="section-label text-[10px]">Overview</span>
            <span className="text-muted text-[10px] font-mono">· N° 01</span>
          </div>
          <h1 className="text-2xl font-display font-medium tracking-tight">
            Good morning, Ada
            <span className="text-accent">.</span>
          </h1>
          <p className="text-sm text-muted mt-1">Your knowledge base is ready — 14 sources indexed.</p>
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

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {STATS.map((s, index) => (
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

          <div className="border border-black/10 rounded-sm overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_60px_80px_70px_80px] gap-3 px-4 py-2.5 bg-black/[0.03] border-b border-black/10 text-[9px] font-mono text-muted tracking-widest uppercase">
              <span>Name</span>
              <span>Type</span>
              <span>Status</span>
              <span className="text-right">Chunks</span>
              <span className="text-right">Date</span>
            </div>

            {RECENT_DOCS.map((doc, i) => (
              <div
                key={doc.name}
                className={`grid grid-cols-[1fr_60px_80px_70px_80px] gap-3 px-4 py-3 items-center text-sm hover:bg-black/[0.02] transition-colors ${i < RECENT_DOCS.length - 1 ? "border-b border-black/[0.06]" : ""}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <svg className="w-3.5 h-3.5 text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="truncate text-xs">{doc.name}</span>
                </div>
                <TypeBadge type={doc.type} />
                <StatusBadge status={doc.status} />
                <span className="text-right text-xs text-muted font-mono">
                  {doc.chunks > 0 ? doc.chunks.toLocaleString() : "—"}
                </span>
                <span className="text-right text-[10px] text-muted font-mono">{doc.date.slice(5)}</span>
              </div>
            ))}
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
              {RECENT_CHATS.map((chat) => (
                <Link
                  key={chat.q}
                  href="/dashboard/chat"
                  className="block border border-black/10 rounded-sm p-3.5 hover:border-accent/30 hover:bg-black/[0.01] transition-colors group"
                >
                  <p className="text-xs leading-relaxed text-foreground/80 group-hover:text-foreground transition-colors line-clamp-2 mb-2">
                    {chat.q}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted font-mono">{chat.time}</span>
                    <span className="text-[10px] text-muted font-mono">{chat.sources} sources</span>
                  </div>
                </Link>
              ))}
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
      <div className="mt-10 pt-5 border-t border-black/10 flex items-center justify-between text-[9px] font-mono text-muted tracking-widest uppercase">
        <span>iota · dashboard · vol. 01</span>
        <span>10.7626° N · 106.6602° E</span>
        <span>v1.4.0</span>
      </div>
    </div>
  );
}
