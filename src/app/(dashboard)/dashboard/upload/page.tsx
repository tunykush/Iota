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
    <div className="border border-black/10 rounded-sm bg-white/40 p-4 xl:p-5">
      <div className="mb-3 text-[9px] font-mono text-muted tracking-widest uppercase">PDF Upload</div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
        className={`flex min-h-[132px] cursor-pointer flex-col items-center justify-center rounded-sm border-2 border-dashed p-5 text-center transition-colors xl:min-h-[150px] ${
          dragOver ? "border-accent bg-accent/5" : "border-black/20 hover:border-accent/40"
        }`}
      >
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-black/10 font-serif text-lg italic text-accent">
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
        <div className="mt-3">
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
        <div className="mt-3 rounded-sm border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          ✓ <span className="font-medium">{result.document.title}</span> uploaded — ingestion started.
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex gap-2">
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
    <div className="border border-black/10 rounded-sm bg-white/40 p-4 xl:p-5">
      <div className="mb-3 text-[9px] font-mono text-muted tracking-widest uppercase">Website URL</div>

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
  const [demoJob, setDemoJob] = useState<IngestionJob | null>(null);

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
    setDemoJob(null);
    prevStatusRef.current = null;
    setActiveJobId(jobId);
  };

  const handleDemoPipeline = () => {
    const startedAt = new Date().toISOString();
    setActiveJobId(null);
    setDemoJob({
      id: `demo-${Date.now()}`,
      documentId: "demo-blueprint-source",
      status: "queued",
      createdAt: startedAt,
      startedAt,
      totalChunks: 24,
      embeddedChunks: 0,
    });
  };

  useEffect(() => {
    if (!demoJob) return;

    const timeline: IngestionJob[] = [
      { ...demoJob, status: "queued", stage: undefined, embeddedChunks: 0 },
      { ...demoJob, status: "running", stage: "extracting", embeddedChunks: 0 },
      { ...demoJob, status: "running", stage: "chunking", embeddedChunks: 0 },
      { ...demoJob, status: "running", stage: "embedding", embeddedChunks: 8 },
      { ...demoJob, status: "running", stage: "embedding", embeddedChunks: 18 },
      { ...demoJob, status: "running", stage: "storing", embeddedChunks: 24 },
      { ...demoJob, status: "succeeded", stage: "storing", embeddedChunks: 24, completedAt: new Date().toISOString() },
    ];

    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      if (index >= timeline.length) {
        window.clearInterval(timer);
        return;
      }
      setDemoJob(timeline[index]);
    }, 1050);

    return () => window.clearInterval(timer);
  }, [demoJob?.id]);

  const pipelineJob = demoJob ?? (activeJobId ? job : null);

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden p-4 lg:p-6 xl:p-7">
      <div className="mb-2 flex items-center gap-2">
        <span className="w-4 h-px bg-accent" />
        <span className="section-label text-[10px]">Upload</span>
        <span className="text-muted text-[10px] font-mono">? N? 04</span>
      </div>
      <h1 className="text-2xl font-display font-medium tracking-tight mb-1">
        Add knowledge<span className="text-accent">.</span>
      </h1>
      <p className="mb-4 text-sm text-muted">
        Queue files, websites, and structured sources for ingestion.
      </p>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(320px,0.72fr)_minmax(620px,1.28fr)]">
        <div className="grid min-h-0 gap-4 lg:grid-cols-2 xl:grid-cols-1 xl:content-start">
          <UploadPdfPanel onJobStart={handleJobStart} />
          <CrawlUrlPanel onJobStart={handleJobStart} />

          <div className="flex flex-col gap-3 border border-black/10 bg-white/30 p-4 sm:flex-row sm:items-center sm:justify-between xl:flex-col xl:items-start">
          <div>
            <div className="text-[9px] font-mono uppercase tracking-widest text-muted">Pipeline simulator</div>
            <p className="mt-1 text-xs text-muted">Preview the ingestion animation without uploading a file.</p>
          </div>
          <button type="button" onClick={handleDemoPipeline} className="dash-btn-primary self-start sm:self-auto">
            Simulate pipeline
          </button>
        </div>
        </div>

        <div className="min-h-0">
          <IngestionPipeline job={pipelineJob} compact />
        </div>

        {completedJobs.length > 0 && (
          <div className="border border-black/10 rounded-sm p-4 bg-white/40">
            <div className="text-[9px] font-mono text-muted tracking-widest uppercase mb-3">
              Recent ingestions
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {completedJobs.map((j) => (
                <div key={j.id} className="flex items-center gap-2 text-xs">
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      j.status === "succeeded" ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  <span className="text-muted font-mono truncate flex-1">
                    {j.documentId.slice(0, 8)}?
                  </span>
                  <span
                    className={`text-[10px] font-mono ${
                      j.status === "succeeded" ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {j.status === "succeeded"
                      ? `? ${j.totalChunks ?? "?"} chunks`
                      : "? failed"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
