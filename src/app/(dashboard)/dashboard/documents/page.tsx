const DOCUMENTS = [
  { name: "Q3-board-deck.pdf", type: "PDF", status: "indexed", chunks: 142, updated: "May 06" },
  { name: "onboarding-guide.pdf", type: "PDF", status: "indexed", chunks: 88, updated: "May 05" },
  { name: "docs.example.com", type: "SITE", status: "processing", chunks: 0, updated: "May 07" },
  { name: "metrics-q3.csv", type: "DB", status: "indexed", chunks: 24, updated: "May 04" },
];

export default function DocumentsPage() {
  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-4 h-px bg-accent" />
        <span className="section-label text-[10px]">Documents</span>
        <span className="text-muted text-[10px] font-mono">· N° 03</span>
      </div>
      <h1 className="text-2xl font-display font-medium tracking-tight mb-1">
        Manage sources<span className="text-accent">.</span>
      </h1>
      <p className="text-sm text-muted mb-6">View indexed files, crawler entries, and ingestion status.</p>

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        {["PDF", "SITE", "DB"].map((type, index) => (
          <div key={type} className="dash-stat-card">
            <div className="text-[9px] font-mono text-muted tracking-widest uppercase mb-2">{type} sources</div>
            <div className="text-2xl font-display font-medium leading-none mb-1">{[9, 3, 2][index]}</div>
            <div className="text-[10px] text-muted">indexed and searchable</div>
          </div>
        ))}
      </div>

      <div className="border border-black/10 rounded-sm overflow-hidden bg-white/30">
        <div className="grid grid-cols-[1fr_64px_96px_76px_76px] gap-3 px-4 py-2.5 bg-black/[0.03] border-b border-black/10 text-[9px] font-mono text-muted tracking-widest uppercase">
          <span>Name</span>
          <span>Type</span>
          <span>Status</span>
          <span className="text-right">Chunks</span>
          <span className="text-right">Updated</span>
        </div>
        {DOCUMENTS.map((doc) => (
          <div key={doc.name} className="grid grid-cols-[1fr_64px_96px_76px_76px] gap-3 px-4 py-3 items-center border-b border-black/[0.06] last:border-b-0 text-sm">
            <span className="truncate text-xs font-medium">{doc.name}</span>
            <span className="text-[9px] font-mono tracking-wider text-muted border border-black/10 px-1.5 py-0.5 rounded-sm w-fit">{doc.type}</span>
            <span className={doc.status === "processing" ? "dash-badge dash-badge-warn" : "dash-badge dash-badge-ok"}>{doc.status}</span>
            <span className="text-right text-xs text-muted font-mono">{doc.chunks || "--"}</span>
            <span className="text-right text-[10px] text-muted font-mono">{doc.updated}</span>
          </div>
        ))}
      </div>
    </div>
  );
}