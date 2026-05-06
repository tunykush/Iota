export default function UploadPage() {
  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-4 h-px bg-accent" />
        <span className="section-label text-[10px]">Upload</span>
        <span className="text-muted text-[10px] font-mono">· N° 04</span>
      </div>
      <h1 className="text-2xl font-display font-medium tracking-tight mb-1">
        Add knowledge<span className="text-accent">.</span>
      </h1>
      <p className="text-sm text-muted mb-6">Queue files, websites, and structured sources for ingestion.</p>

      <div className="grid lg:grid-cols-[1.2fr_.8fr] gap-5">
        <div className="border border-dashed border-black/20 rounded-sm p-8 bg-white/40 min-h-[300px] flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-full border border-black/10 mx-auto mb-4 flex items-center justify-center text-accent font-serif italic text-2xl">
            ι
          </div>
          <h2 className="font-display font-medium mb-1">Drop PDF files here</h2>
          <p className="text-xs text-muted max-w-sm mb-5">Phase 1 keeps this as a UI shell. Phase 3 will connect validation, chunking, embeddings, and status updates.</p>
          <button type="button" className="dash-btn-primary">Browse files</button>
        </div>

        <div className="space-y-4">
          <div className="border border-black/10 rounded-sm p-5 bg-white/40">
            <label className="auth-label" htmlFor="url">Website URL</label>
            <input id="url" className="auth-input" placeholder="https://docs.example.com" />
            <button type="button" className="dash-btn mt-4">Queue crawl</button>
          </div>

          <div className="border border-black/10 rounded-sm p-5 bg-white/40">
            <div className="text-[9px] font-mono text-muted tracking-widest uppercase mb-3">Ingestion pipeline</div>
            {["Validate source", "Extract text", "Chunk content", "Create embeddings", "Index for chat"].map((step, index) => (
              <div key={step} className="flex items-center gap-3 py-2 border-b border-black/[0.06] last:border-b-0">
                <span className="w-5 h-5 rounded-full border border-black/10 flex items-center justify-center text-[10px] font-mono text-muted">{index + 1}</span>
                <span className="text-xs">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
