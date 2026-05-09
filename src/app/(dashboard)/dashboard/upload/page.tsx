"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useUploadPdf, useCrawlUrl, useJobPolling } from "@/hooks/useDocuments";
import { IngestionPipeline } from "@/components/ingestion/IngestionPipeline";
import type { IngestionJob } from "@/lib/api/types";

// ─── Upload PDF panel ──────────────────────────────────────────
function UploadPdfPanel({ onJobStart }: { onJobStart: (jobId: string) => void }) {
  const { upload, uploading, progress, result, error, reset } = useUploadPdf();
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
      const data = await upload(selectedFile);
      onJobStart(data.job.id);
    } catch {
      // error shown in UI
    }
  };

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

      {result && (
        <div className="mb-4 p-3 border border-green-200 bg-green-50 rounded-sm text-sm text-green-700">
          ✓ <span className="font-medium">{result.document.title}</span> uploaded — ingestion started.
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
          disabled={!selectedFile || uploading}
          className="dash-btn-primary"
        >
          {uploading ? "Uploading…" : "Upload PDF"}
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
function CrawlUrlPanel({ onJobStart }: { onJobStart: (jobId: string) => void }) {
  const { crawl, crawling, result, error, reset } = useCrawlUrl();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    try {
      const data = await crawl({ url: url.trim(), title: title.trim() || undefined });
      onJobStart(data.job.id);
    } catch {
      // error shown in UI
    }
  };

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
            disabled={crawling}
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
            disabled={crawling}
          />
        </div>

        {result && (
          <div className="p-3 border border-green-200 bg-green-50 rounded-sm text-sm text-green-700">
            ✓ <span className="font-medium">{result.document.title}</span> queued for ingestion.
          </div>
        )}

        {error && (
          <div className="p-3 border border-red-200 bg-red-50 rounded-sm text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!url.trim() || crawling}
          className="dash-btn"
        >
          {crawling ? "Submitting…" : "Queue crawl"}
        </button>
      </form>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────
export default function UploadPage() {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const { job } = useJobPolling(activeJobId, 1500);

  // Track completed jobs for history display
  const [completedJobs, setCompletedJobs] = useState<IngestionJob[]>([]);

  // When a job finishes, add to history
  const prevStatusRef = useRef<string | null>(null);
  useEffect(() => {
    if (!job) return;

    if ((job.status === "succeeded" || job.status === "failed") && prevStatusRef.current !== job.status) {
      prevStatusRef.current = job.status;
      setCompletedJobs((prev) => {
        if (prev.some((j) => j.id === job.id)) return prev;
        return [job, ...prev].slice(0, 5);
      });
      return;
    }

    if (job.status !== "succeeded" && job.status !== "failed") {
      prevStatusRef.current = job.status;
    }
  }, [job]);

  const handleJobStart = (jobId: string) => {
    prevStatusRef.current = null;
    setActiveJobId(jobId);
  };

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
        <UploadPdfPanel onJobStart={handleJobStart} />

        {/* Right: URL crawl + live pipeline */}
        <div className="space-y-4">
          <CrawlUrlPanel onJobStart={handleJobStart} />

          {/* Live pipeline tracker — shows when a job is active */}
          <IngestionPipeline job={activeJobId ? job : null} />

          {/* Recent completed jobs */}
          {completedJobs.length > 0 && (
            <div className="border border-black/10 rounded-sm p-4 bg-white/40">
              <div className="text-[9px] font-mono text-muted tracking-widest uppercase mb-3">
                Recent ingestions
              </div>
              <div className="space-y-2">
                {completedJobs.map((j) => (
                  <div
                    key={j.id}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        j.status === "succeeded" ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    <span className="text-muted font-mono truncate flex-1">
                      {j.documentId.slice(0, 8)}…
                    </span>
                    <span
                      className={`text-[10px] font-mono ${
                        j.status === "succeeded" ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {j.status === "succeeded"
                        ? `✓ ${j.totalChunks ?? "?"} chunks`
                        : "✕ failed"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}