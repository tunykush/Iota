"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useUploadPdf, useCrawlUrl, useJobPolling } from "@/hooks/useDocuments";
import { IngestionPipeline } from "@/components/ingestion/IngestionPipeline";
import type { IngestionJob } from "@/lib/api/types";

// ─── Upload PDF panel ──────────────────────────────────────────
function UploadPdfPanel({ onJobStart, onUploadBegin }: { onJobStart: (jobId: string) => void; onUploadBegin: () => void }) {
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
    // Start pipeline animation immediately — don't wait for upload to finish
    onUploadBegin();
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
        className={`flex min-h-[80px] cursor-pointer flex-col items-center justify-center rounded-sm border-2 border-dashed p-3 text-center transition-colors ${
          dragOver ? "border-accent bg-accent/5" : "border-black/20 hover:border-accent/40"
        }`}
      >
        <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full border border-black/10 font-serif text-base italic text-accent">
          ι
        </div>
        {selectedFile ? (
          <>
            <p className="text-xs font-medium mb-0.5 truncate max-w-xs">{selectedFile.name}</p>
            <p className="text-[10px] text-muted">{(selectedFile.size / 1024).toFixed(0)} KB · Click to change</p>
          </>
        ) : (
          <>
            <p className="text-xs font-medium mb-0.5">Drop PDF here or click to browse</p>
            <p className="text-[10px] text-muted">Max 10 MB · PDF only</p>
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
        <div className="mt-2">
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
        <div className="mt-2 rounded-sm border border-green-200 bg-green-50 p-2 text-xs text-green-700">
          ✓ <span className="font-medium">{result.document.title}</span> uploaded.
        </div>
      )}

      {error && (
        <div className="mt-2 rounded-sm border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="mt-2 flex gap-2">
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
  const demoJobSeedRef = useRef<IngestionJob | null>(null);
  // Optimistic job shown immediately when user clicks Upload (before API responds)
  const [optimisticJob, setOptimisticJob] = useState<IngestionJob | null>(null);

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

  // Once real polled job arrives, clear the optimistic placeholder
  useEffect(() => {
    if (job && optimisticJob) {
      setOptimisticJob(null);
    }
  }, [job, optimisticJob]);

  // Called immediately when user clicks "Upload PDF" — before the API call finishes
  const handleUploadBegin = useCallback(() => {
    const startedAt = new Date().toISOString();
    demoJobSeedRef.current = null;
    setDemoJob(null);
    setActiveJobId(null);
    prevStatusRef.current = null;
    setOptimisticJob({
      id: `optimistic-${Date.now()}`,
      documentId: "uploading",
      status: "queued",
      createdAt: startedAt,
      startedAt,
      totalChunks: 0,
      embeddedChunks: 0,
    });
  }, []);

  // Progress the optimistic job through early stages while waiting for real data
  useEffect(() => {
    if (!optimisticJob) return;

    const stages: Array<Partial<IngestionJob>> = [
      { status: "queued", stage: undefined },
      { status: "running", stage: "extracting" },
      { status: "running", stage: "chunking" },
    ];

    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      if (index >= stages.length) {
        window.clearInterval(timer);
        return;
      }
      setOptimisticJob((prev) => prev ? { ...prev, ...stages[index] } : null);
    }, 1200);

    return () => window.clearInterval(timer);
  }, [optimisticJob?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleJobStart = (jobId: string) => {
    demoJobSeedRef.current = null;
    setDemoJob(null);
    prevStatusRef.current = null;
    setActiveJobId(jobId);
  };

  const handleDemoPipeline = () => {
    const startedAt = new Date().toISOString();
    const nextDemoJob: IngestionJob = {
      id: `demo-${Date.now()}`,
      documentId: "demo-blueprint-source",
      status: "queued",
      createdAt: startedAt,
      startedAt,
      totalChunks: 24,
      embeddedChunks: 0,
    };
    setActiveJobId(null);
    setOptimisticJob(null);
    demoJobSeedRef.current = nextDemoJob;
    setDemoJob(nextDemoJob);
  };

  const demoJobId = demoJob?.id;
  useEffect(() => {
    if (!demoJobId) return;
    const baseJob = demoJobSeedRef.current;
    if (!baseJob || baseJob.id !== demoJobId) return;

    const timeline: IngestionJob[] = [
      { ...baseJob, status: "queued", stage: undefined, embeddedChunks: 0 },
      { ...baseJob, status: "running", stage: "extracting", embeddedChunks: 0 },
      { ...baseJob, status: "running", stage: "chunking", embeddedChunks: 0 },
      { ...baseJob, status: "running", stage: "embedding", embeddedChunks: 8 },
      { ...baseJob, status: "running", stage: "embedding", embeddedChunks: 18 },
      { ...baseJob, status: "running", stage: "storing", embeddedChunks: 24 },
      { ...baseJob, status: "succeeded", stage: "storing", embeddedChunks: 24, completedAt: new Date().toISOString() },
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
  }, [demoJobId]);

  const pipelineJob = optimisticJob ?? demoJob ?? (activeJobId ? job : null);

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden p-3 lg:p-4 xl:p-5">
      <div className="mb-1 flex items-center gap-2">
        <span className="w-4 h-px bg-accent" />
        <span className="section-label text-[10px]">Upload</span>
        <span className="text-muted text-[10px] font-mono">? N? 04</span>
      </div>
      <h1 className="text-xl font-display font-medium tracking-tight mb-0.5">
        Add knowledge<span className="text-accent">.</span>
      </h1>
      <p className="mb-2 text-xs text-muted">
        Queue files, websites, and structured sources for ingestion.
      </p>

      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden xl:grid-cols-[minmax(280px,0.65fr)_minmax(520px,1.35fr)]">
        {/* Left column: upload panels + simulator */}
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-1">
            <UploadPdfPanel onJobStart={handleJobStart} onUploadBegin={handleUploadBegin} />
            <CrawlUrlPanel onJobStart={handleJobStart} />
          </div>

          <div className="flex items-center justify-between gap-3 border border-black/10 bg-white/30 p-3 rounded-sm">
            <div>
              <div className="text-[9px] font-mono uppercase tracking-widest text-muted">Pipeline simulator</div>
              <p className="mt-0.5 text-[10px] text-muted">Preview the ingestion animation.</p>
            </div>
            <button type="button" onClick={handleDemoPipeline} className="dash-btn-primary shrink-0">
              Simulate
            </button>
          </div>

          {/* Recent ingestions — inline in left column */}
          {completedJobs.length > 0 && (
            <div className="border border-black/10 rounded-sm p-3 bg-white/40">
              <div className="text-[9px] font-mono text-muted tracking-widest uppercase mb-2">
                Recent ingestions
              </div>
              <div className="space-y-1">
                {completedJobs.map((j) => (
                  <div key={j.id} className="flex items-center gap-2 text-xs">
                    <span
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
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

        {/* Right column: pipeline visualization */}
        <div className="min-h-0 overflow-y-auto">
          <IngestionPipeline job={pipelineJob} compact />
        </div>
      </div>
    </div>
  );
}
