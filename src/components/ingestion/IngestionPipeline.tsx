"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { IngestionJob, JobStage } from "@/lib/api/types";

type StepKey = JobStage | "queued" | "done";

const MIN_STEP_MS = 950;

// ─── Pipeline step definitions ─────────────────────────────────
const STEPS: { key: StepKey; label: string; description: string; blueprint: string }[] = [
  { key: "queued", label: "Queued", description: "Preparing the source outline", blueprint: "source plate" },
  { key: "extracting", label: "Extract text", description: "Tracing readable text from the material", blueprint: "line tracing" },
  { key: "chunking", label: "Chunk content", description: "Dividing notes into measured sections", blueprint: "section grid" },
  { key: "embedding", label: "Create embeddings", description: "Plotting semantic coordinates", blueprint: "vector plot" },
  { key: "storing", label: "Index for chat", description: "Pinning coordinates into the knowledge map", blueprint: "index pins" },
  { key: "done", label: "Complete", description: "Blueprint sealed and ready for chat", blueprint: "final sheet" },
];

const BLUEPRINT_POINTS = [
  { x: 34, y: 70 },
  { x: 104, y: 46 },
  { x: 174, y: 70 },
  { x: 246, y: 46 },
  { x: 316, y: 70 },
  { x: 386, y: 46 },
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

function useRevealedIndex(targetIndex: number, jobId?: string) {
  const [revealedIndex, setRevealedIndex] = useState(targetIndex);
  const previousJobId = useRef(jobId);

  useEffect(() => {
    if (previousJobId.current !== jobId) {
      previousJobId.current = jobId;
      setRevealedIndex(targetIndex < 0 ? -1 : 0);
    }
  }, [jobId, targetIndex]);

  useEffect(() => {
    if (targetIndex <= revealedIndex) return;
    const timer = window.setTimeout(() => {
      setRevealedIndex((current) => Math.min(current + 1, targetIndex));
    }, MIN_STEP_MS);

    return () => window.clearTimeout(timer);
  }, [revealedIndex, targetIndex]);

  return revealedIndex;
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

function MagicRotor({ className = "", reverse = false }: { className?: string; reverse?: boolean }) {
  return (
    <g className={className} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0"
        to={reverse ? "-360" : "360"}
        dur={reverse ? "10s" : "12s"}
        repeatCount="indefinite"
      />
      <circle r="15" fill="none" stroke="#8a8170" strokeWidth="0.65" strokeDasharray="1 6" opacity="0.34" />
      <circle r="9" fill="none" stroke="#cf5b3f" strokeWidth="0.55" strokeDasharray="6 8" opacity="0.28" />
      {Array.from({ length: 6 }).map((_, spark) => (
        <circle key={spark} cx="0" cy="-15" r={spark % 2 ? "0.9" : "1.2"} fill="#cf5b3f" opacity="0.42" transform={`rotate(${spark * 60})`}>
          <animate attributeName="opacity" values="0.12;0.58;0.12" dur={`${2.8 + spark * 0.22}s`} begin={`${spark * 0.16}s`} repeatCount="indefinite" />
        </circle>
      ))}
      <path d="M-7 0 C-3 -5 3 -5 7 0 C3 5 -3 5 -7 0Z" fill="none" stroke="#7d7465" strokeWidth="0.55" opacity="0.38" />
    </g>
  );
}

function BlueprintCore({ activeIndex, activeStep, isRunning, isFailed, isSucceeded, load, compact = false }: { activeIndex: number; activeStep: (typeof STEPS)[number]; isRunning: boolean; isFailed: boolean; isSucceeded: boolean; load: number; compact?: boolean }) {
  const visibleLines = Math.max(0, Math.min(activeIndex, BLUEPRINT_POINTS.length - 1));
  const stateLabel = isFailed ? "needs revision" : isSucceeded ? "sealed" : isRunning ? "drafting" : "standby";
  const showFinalEngine = activeStep.key === "done" && isSucceeded;

  return (
    <div className={`relative overflow-hidden border border-[#6f8fa3]/25 bg-[#f7f4e9] rounded-sm p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.65)] ${compact ? "mb-3" : "mb-5"}`}>
      <div className="absolute inset-0 opacity-55 bg-[linear-gradient(rgba(78,118,140,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(78,118,140,0.10)_1px,transparent_1px)] bg-[size:18px_18px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(207,91,63,0.10),transparent_26%),radial-gradient(circle_at_82%_24%,rgba(78,118,140,0.12),transparent_24%)]" />

      <div className="relative flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="text-[8px] font-mono uppercase tracking-[0.28em] text-[#4e768c]/70">Live Blueprint</div>
          <div className="mt-1 text-sm font-medium text-[#233945]">{activeStep.blueprint}</div>
          <div className="mt-0.5 text-[10px] text-[#6f6a5d]">{activeStep.description}</div>
        </div>
        <div className="text-right">
          <div className={`text-[9px] font-mono uppercase tracking-[0.22em] ${isFailed ? "text-red-500" : "text-[#4e768c]"}`}>{stateLabel}</div>
          <div className="mt-1 text-[10px] text-[#8a8170] tabular-nums">draft {String(Math.max(activeIndex, 0) + 1).padStart(2, "0")}/06</div>
        </div>
      </div>

      <div className={`relative overflow-hidden rounded-sm border border-[#6f8fa3]/20 bg-white/25 ${compact ? "h-[190px]" : "h-32 sm:h-36"}`}>
        <svg viewBox="0 0 410 120" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <filter id="blueprintGlow">
              <feGaussianBlur stdDeviation="1.4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path d="M24 88 C92 50 142 48 205 72 S318 78 396 34" fill="none" stroke="#8a8170" strokeWidth="0.65" strokeDasharray="2 9" opacity="0.14" />
          {BLUEPRINT_POINTS.slice(0, -1).map((point, index) => {
            const next = BLUEPRINT_POINTS[index + 1];
            const isVisible = index < visibleLines;
            return (
              <line
                key={`${point.x}-${next.x}`}
                x1={point.x}
                y1={point.y}
                x2={next.x}
                y2={next.y}
                stroke={isFailed && index === activeIndex ? "#dc2626" : "#7d7465"}
                strokeWidth="1.05"
                strokeLinecap="round"
                strokeDasharray={isVisible ? "7 7" : "120"}
                strokeDashoffset={isVisible ? 0 : 120}
                className="transition-all duration-700 ease-out"
                opacity={isVisible ? 0.42 : 0.12}
              />
            );
          })}
          {BLUEPRINT_POINTS.map((point, index) => {
            const isCurrent = index === activeIndex;
            const isPast = index < activeIndex;
            const isVisible = index <= Math.max(activeIndex, 0);
            return (
              <g key={point.x} className="transition-opacity duration-500" opacity={isVisible ? 1 : 0.22}>
                <circle cx={point.x} cy={point.y} r={isCurrent ? 10 : 7} fill="#f7f4e9" stroke={isFailed && isCurrent ? "#dc2626" : isPast || isCurrent ? "#7d7465" : "#b8b1a2"} strokeWidth="1" strokeDasharray="2 2" opacity={isPast || isCurrent ? 0.72 : 0.32} />
                <circle cx={point.x} cy={point.y} r="2.2" fill={isFailed && isCurrent ? "#dc2626" : isPast || isCurrent ? "#cf5b3f" : "#b8b1a2"} className={isCurrent && isRunning ? "animate-pulse" : ""} opacity="0.8" />
                {isCurrent && <circle cx={point.x} cy={point.y} r="15" fill="none" stroke="#cf5b3f" strokeWidth="0.7" strokeDasharray="2 5" opacity="0.36" />}
              </g>
            );
          })}
          <path d="M26 16 h54 m-27 -7 v14 M326 98 h58 m-29 -7 v14" stroke="#8a8170" strokeWidth="0.7" opacity="0.28" />
          {showFinalEngine && (
            <g transform="translate(210 58)">
              <rect x="-70" y="-24" width="140" height="48" rx="2" fill="none" stroke="#8a8170" strokeWidth="0.55" strokeDasharray="8 8" opacity="0.18" />
              <path d="M-70 0 H70 M0 -24 V24" fill="none" stroke="#8a8170" strokeWidth="0.45" strokeDasharray="4 8" opacity="0.18" />
              <path d="M-48 -10 C-26 -24 26 -24 48 -10 M-48 10 C-24 24 24 24 48 10" fill="none" stroke="#cf5b3f" strokeWidth="0.45" strokeDasharray="2 8" opacity="0.18">
                <animate attributeName="stroke-dashoffset" values="0;-20" dur="7s" repeatCount="indefinite" />
              </path>
              <g transform="translate(-28 0)"><MagicRotor /></g>
              <g transform="translate(0 0) scale(.82)"><MagicRotor reverse /></g>
              <g transform="translate(28 0) scale(.68)"><MagicRotor /></g>
              <circle cx="0" cy="0" r="38" fill="none" stroke="#cf5b3f" strokeWidth="0.45" strokeDasharray="1 9" opacity="0.2">
                <animate attributeName="r" values="31;40;31" dur="5.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.08;0.24;0.08" dur="5.8s" repeatCount="indefinite" />
              </circle>
              <text x="0" y="38" textAnchor="middle" className="fill-[#7d7465] font-mono text-[4.5px] uppercase tracking-[0.2em]">arcane core</text>
            </g>
          )}
        </svg>

        <div className="absolute left-4 bottom-3 right-4 flex items-end justify-between gap-3">
          <div className="max-w-[62%]">
            <div className="text-[8px] font-mono uppercase tracking-[0.24em] text-[#4e768c]/70">current trace</div>
            <div className="mt-0.5 text-xs text-[#233945]">{activeStep.label}</div>
          </div>
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#d8d0bd]">
            <div className={`h-full rounded-full transition-all duration-700 ${isFailed ? "bg-red-500" : "bg-[#cf5b3f]"}`} style={{ width: `${load}%` }} />
          </div>
        </div>
      </div>

      <div className="relative mt-3 grid grid-cols-3 gap-2 text-[9px] font-mono uppercase tracking-widest text-[#6f6a5d]">
        <div className="border border-[#6f8fa3]/20 bg-white/25 p-2">Draw <span className="text-[#233945]">{load}%</span></div>
        <div className="border border-[#6f8fa3]/20 bg-white/25 p-2">Layer <span className="text-[#233945]">{activeStep.key}</span></div>
        <div className="border border-[#6f8fa3]/20 bg-white/25 p-2">Status <span className={isFailed ? "text-red-500" : "text-[#4e768c]"}>{stateLabel}</span></div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────
export function IngestionPipeline({ job, compact = false }: { job: IngestionJob | null; compact?: boolean }) {
  const targetIndex = getActiveIndex(job);
  const activeIndex = useRevealedIndex(targetIndex, job?.id);
  const isFailed = job?.status === "failed";
  const isSucceeded = job?.status === "succeeded";
  const isRunning = Boolean(job) && !isFailed && !isSucceeded;
  const activeStep = STEPS[Math.max(0, activeIndex)] ?? STEPS[0];

  // Embedding progress
  const embeddingProgress =
    job?.stage === "embedding" && job.totalChunks && typeof job.embeddedChunks === "number"
      ? Math.round((job.embeddedChunks / job.totalChunks) * 100)
      : null;
  const load = useMemo(() => {
    if (!job) return 0;
    if (isSucceeded) return 100;
    if (isFailed) return 12;
    if (embeddingProgress !== null) return Math.max(45, embeddingProgress);
    return Math.min(92, Math.max(18, activeIndex * 19));
  }, [activeIndex, embeddingProgress, isFailed, isSucceeded, job]);

  return (
    <div className={`border border-black/10 rounded-sm bg-white/40 ${compact ? "p-4 xl:p-5" : "p-5"}`}>
      <div className="mb-4 flex items-center justify-between">
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

      <BlueprintCore activeIndex={activeIndex} activeStep={activeStep} isRunning={isRunning} isFailed={Boolean(isFailed)} isSucceeded={Boolean(isSucceeded)} load={load} compact={compact} />

      <div className="overflow-x-auto pb-1">
        <div className={`grid grid-cols-6 gap-2 ${compact ? "min-w-[620px]" : "min-w-[720px] sm:min-w-0"}`}>
        {STEPS.map((step, index) => {
          let state: "pending" | "active" | "done" | "error" = "pending";
          if (index < activeIndex) state = "done";
          else if (index === activeIndex && isFailed) state = "error";
          else if (index === activeIndex) state = "active";

          const isLast = index === STEPS.length - 1;

          return (
            <div key={step.key} className={`relative min-w-0 rounded-sm border border-black/10 bg-white/25 ${compact ? "p-2" : "p-3"}`}>
              {!isLast && (
                <div
                  className={`absolute left-[calc(100%-0.25rem)] top-6 h-px w-3 transition-all duration-700 ${
                    index < activeIndex ? "bg-[#4e768c]" : "bg-black/10"
                  }`}
                />
              )}
              <div className="mb-2 flex items-center justify-between gap-2">
                <StepIcon state={state} />
                <span className="text-[8px] font-mono uppercase tracking-[0.18em] text-muted">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>

              <div className="min-w-0">
                <div
                  className={`truncate text-xs font-medium transition-colors duration-300 ${
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
                  className={`mt-1 line-clamp-2 text-[10px] leading-4 transition-colors duration-300 ${compact ? "min-h-[1rem] xl:min-h-[2rem]" : "min-h-[2rem]"} ${
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
    </div>
  );
}