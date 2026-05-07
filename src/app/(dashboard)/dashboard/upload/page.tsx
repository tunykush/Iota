"use client";

import { useState, useRef, useCallback } from "react";
import { useUploadPdf, useCrawlUrl, useJobPolling } from "@/hooks/useDocuments";

// ─── Upload PDF panel ──────────────────────────────────────────
function UploadPdfPanel() {
  const { upload, uploading, progress, result, error, reset } = useUploadPdf();
  const { job } = useJobPolling(result?.job.id ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        alert("Only PDF files are accepted.");
        return;
      }
      setSelectedFile(file);
      reset();
    },
    [reset],
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    try {
      await upload(selectedFile);
    } catch {
      // error shown in UI
    }
  };

  // Determine ingestion stage label
  const jobStageLabel =
    job?.stage === "extracting"
      ? "Extracting text…"
      : job?.stage === "chunking"
        ? "Chunking content…"
        : job?.stage === "embedding"
          ? "Creating embeddings…"
          : job?.stage === "storing"
            ? "Storing chunks…"
            : null;

  const isProcessing = result && job && (job.status === "queued" || job.status === "running");
  const isDone = result && job?.status === "succeeded";
  const isFailed = result && job?.status === "failed";

  return (
    <div className="border border-black/10 rounded-sm p-6 bg-white/40">
      <div className="text-[9px] font-mono text-muted tracking-widest uppercase mb-4">PDF Upload</div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-sm p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors mb-4 ${
          dragOver ? "border-accent bg-accent/5" : "border-black/20 hover:border-accent/40"
        }`}
      >
        <div className="w-12 h-12 rounded-full border border-black/10 mx-auto mb-3 flex items-center justify-center text-accent font-serif italic text-xl">
          ι
        </div>
        {selectedFile ? (
          <>
            <p className="text-sm font-medium mb-1 truncate max-w-xs">{selectedFile.name}</p>
            <p className="text-xs text-muted">{(selectedFile.size / 1024).toFixed(0)} KB · Click to change</p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium mb-1">Drop PDF here or click to browse</p>
            <p className="text-xs text-muted">Max 10 MB · PDF only</p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>

      {/* Progress bar */}
      {uploading && (
        <div className="mb-4">
          <div className="flex justify-between text-[10px] font-mono text-muted mb-1">
            <span>Uploading…</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1 bg-black/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Job status */}
      {isProcessing && (
        <div className="mb-4 flex items-center gap-2 text-xs text-muted">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          {jobStageLabel ?? "Processing…"}
        </div>
      )}

      {isDone && (
        <div className="mb-4 p-3 border border-green-200 bg-green-50 rounded-sm text-sm text-green-700">
          ✓ <span className="font-medium">{result.document.title}</span> ingested successfully.
        </div>
      )}

      {isFailed && (
        <div className="mb-4 p-3 border border-red-200 bg-red-50 rounded-sm text-sm text-red-700">
          ✕ Ingestion failed: {job?.errorMessage ?? "Unknown error"}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 border border-red-200 bg-red-50 rounded-sm text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || uploading || !!isProcessing}
          className="dash-btn-primary"
        >
          {uploading ? "Uploading…" : isProcessing ? "Processing…" : "Upload PDF"}
        </button>
        {(selectedFile || result) && (
          <button
            type="button"
            onClick={() => { setSelectedFile(null); reset(); }}
            className="dash-btn"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Crawl URL panel ───────────────────────────────────────────
function CrawlUrlPanel() {
  const { crawl, crawling, result, error, reset } = useCrawlUrl();
  const { job } = useJobPolling(result?.job.id ?? null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    try {
      await crawl({ url: url.trim(), title: title.trim() || undefined });
    } catch {
      // error shown in UI
    }
  };

  const isProcessing = result && job && (job.status === "queued" || job.status === "running");
  const isDone = result && job?.status === "succeeded";
  const isFailed = result && job?.status === "failed";

  return (
    <div className="border border-black/10 rounded-sm p-5 bg-white/40">
      <div className="text-[9px] font-mono text-muted tracking-widest uppercase mb-4">Website URL</div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="auth-label" htmlFor="crawl-url">URL</label>
          <input
            id="crawl-url"
            className="auth-input"
            placeholder="https://docs.example.com"
            value={url}
            onChange={(e) => { setUrl(e.target.value); reset(); }}
            disabled={crawling || !!isProcessing}
          />
        </div>
        <div>
          <label className="auth-label" htmlFor="crawl-title">Title (optional)</label>
          <input
            id="crawl-title"
            className="auth-input"
            placeholder="My documentation site"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={crawling || !!isProcessing}
          />
        </div>

        {isProcessing && (
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Crawling…
          </div>
        )}

        {isDone && (
          <div className="p-3 border border-green-200 bg-green-50 rounded-sm text-sm text-green-700">
            ✓ <span className="font-medium">{result.document.title}</span> queued for ingestion.
          </div>
        )}

        {isFailed && (
          <div className="p-3 border border-red-200 bg-red-50 rounded-sm text-sm text-red-700">
            ✕ Crawl failed: {job?.errorMessage ?? "Unknown error"}
          </div>
        )}

        {error && (
          <div className="p-3 border border-red-200 bg-red-50 rounded-sm text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!url.trim() || crawling || !!isProcessing}
          className="dash-btn"
        >
          {crawling ? "Submitting…" : isProcessing ? "Crawling…" : "Queue crawl"}
        </button>
      </form>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────
const PIPELINE_STEPS = [
  "Validate source",
  "Extract text",
  "Chunk content",
  "Create embeddings",
  "Index for chat",
];

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
      <p className="text-sm text-muted mb-6">
        Queue files, websites, and structured sources for ingestion.
      </p>

      <div className="grid lg:grid-cols-[1.2fr_.8fr] gap-5">
        {/* Left: PDF upload */}
        <UploadPdfPanel />

        {/* Right: URL crawl + pipeline */}
        <div className="space-y-4">
          <CrawlUrlPanel />

          <div className="border border-black/10 rounded-sm p-5 bg-white/40">
            <div className="text-[9px] font-mono text-muted tracking-widest uppercase mb-3">
              Ingestion pipeline
            </div>
            {PIPELINE_STEPS.map((step, index) => (
              <div
                key={step}
                className="flex items-center gap-3 py-2 border-b border-black/[0.06] last:border-b-0"
              >
                <span className="w-5 h-5 rounded-full border border-black/10 flex items-center justify-center text-[10px] font-mono text-muted">
                  {index + 1}
                </span>
                <span className="text-xs">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
