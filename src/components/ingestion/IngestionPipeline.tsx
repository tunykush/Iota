"use client";

import type { IngestionJob, JobStage } from "@/lib/api/types";

// ─── Pipeline step definitions ─────────────────────────────────
const STEPS: { key: JobStage | "queued" | "done"; label: string; description: string }[] = [
  { key: "queued", label: "Queued", description: "Waiting to start" },
  { key: "extracting", label: "Extract text", description: "Reading content from source" },
  { key: "chunking", label: "Chunk content", description: "Splitting into semantic chunks" },
  { key: "embedding", label: "Create embeddings", description: "Generating vector representations" },
  { key: "storing", label: "Index for chat", description: "Storing in vector database" },
  { key: "done", label: "Complete", description: "Ready for chat" },
];

const STAGE_ORDER: Record<string, number> = {
  queued: 0,
  extracting: 1,
  chunking: 2,
  embedding: 3,
  storing: 4,
  done: 5,
};

function getActiveIndex(job: IngestionJob | null): number {
  if (!job) return -1;
  if (job.status === "succeeded") return 5;
  if (job.status === "failed") return STAGE_ORDER[job.stage ?? "queued"] ?? 0;
  if (job.status === "queued") return 0;
  return STAGE_ORDER[job.stage ?? "extracting"] ?? 1;
}

function formatElapsed(startedAt?: string): string {
  if (!startedAt) return "";
  const ms = Date.now() - new Date(startedAt).getTime();
  if (ms < 1000) return "<1s";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

// ─── Step icon ─────────────────────────────────────────────────
function StepIcon({ state }: { state: "pending" | "active" | "done" | "error" }) {
  if (state === "done") {
    return (
      <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center shadow-sm shadow-green-200 transition-all duration-500">
        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }
  if (state === "active") {
    return (
      <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center shadow-sm shadow-accent/30 transition-all duration-500">
        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
      </div>
    );
  }
  if (state === "error") {
    return (
      <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center shadow-sm shadow-red-200 transition-all duration-500">
        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-7 h-7 rounded-full border-2 border-black/10 bg-white flex items-center justify-center transition-all duration-500">
      <div className="w-1.5 h-1.5 rounded-full bg-black/15" />
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────
export function IngestionPipeline({ job }: { job: IngestionJob | null }) {
  const activeIndex = getActiveIndex(job);
  const isFailed = job?.status === "failed";
  const isSucceeded = job?.status === "succeeded";
  const isRunning = job?.status === "running";

  // Embedding progress
  const embeddingProgress =
    job?.stage === "embedding" && job.totalChunks && job.embeddedChunks
      ? Math.round((job.embeddedChunks / job.totalChunks) * 100)
      : null;

  return (
    <div className="border border-black/10 rounded-sm p-5 bg-white/40">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[9px] font-mono text-muted tracking-widest uppercase">
          Ingestion Pipeline
        </div>
        {isRunning && job?.startedAt && (
          <div className="text-[10px] font-mono text-accent tabular-nums">
            {formatElapsed(job.startedAt)}
          </div>
        )}
        {isSucceeded && (
          <div className="text-[10px] font-mono text-green-600">✓ Done</div>
        )}
        {isFailed && (
          <div className="text-[10px] font-mono text-red-500">✕ Failed</div>
        )}
      </div>

      <div className="space-y-0">
        {STEPS.map((step, index) => {
          let state: "pending" | "active" | "done" | "error" = "pending";
          if (index < activeIndex) state = "done";
          else if (index === activeIndex && isFailed) state = "error";
          else if (index === activeIndex) state = "active";

          const isLast = index === STEPS.length - 1;

          return (
            <div key={step.key} className="flex items-start gap-3">
              {/* Vertical line + icon */}
              <div className="flex flex-col items-center">
                <StepIcon state={state} />
                {!isLast && (
                  <div
                    className={`w-px h-8 transition-all duration-700 ${
                      index < activeIndex ? "bg-green-400" : "bg-black/8"
                    }`}
                  />
                )}
              </div>

              {/* Label + description */}
              <div className={`pt-1 pb-3 min-w-0 ${isLast ? "" : ""}`}>
                <div
                  className={`text-xs font-medium transition-colors duration-300 ${
                    state === "done"
                      ? "text-green-700"
                      : state === "active"
                        ? "text-accent"
                        : state === "error"
                          ? "text-red-600"
                          : "text-black/30"
                  }`}
                >
                  {step.label}
                </div>
                <div
                  className={`text-[10px] transition-colors duration-300 ${
                    state === "active" || state === "done" ? "text-muted" : "text-black/20"
                  }`}
                >
                  {state === "error" && job?.errorMessage
                    ? job.errorMessage.slice(0, 120)
                    : step.description}
                </div>

                {/* Embedding progress bar */}
                {step.key === "embedding" && state === "active" && embeddingProgress !== null && (
                  <div className="mt-1.5">
                    <div className="flex justify-between text-[9px] font-mono text-muted mb-0.5">
                      <span>
                        {job!.embeddedChunks}/{job!.totalChunks} chunks
                      </span>
                      <span>{embeddingProgress}%</span>
                    </div>
                    <div className="h-1 bg-black/8 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${embeddingProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Chunk count info */}
                {step.key === "chunking" && state === "done" && job?.totalChunks && (
                  <div className="text-[9px] font-mono text-green-600 mt-0.5">
                    {job.totalChunks} chunks created
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}