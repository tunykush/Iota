"use client";

import { AlertTriangle, CheckCircle2, Database, FileText, Globe2, Loader2, RefreshCw, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import type { Document, DocumentSourceType, DocumentStatus } from "@/lib/api/types";

export const DOCUMENTS_FIXTURE: Document[] = [
  {
    id: "fixture-source-1",
    sourceType: "pdf",
    title: "Machine Learning Systems Handbook.pdf",
    originalFilename: "machine-learning-systems-handbook.pdf",
    status: "ready",
    chunkCount: 1420,
    createdAt: "2026-05-09T08:20:00.000Z",
    updatedAt: "2026-05-10T08:20:00.000Z",
  },
  {
    id: "fixture-source-2",
    sourceType: "website",
    title: "Internal onboarding knowledge base",
    url: "https://docs.example.com/onboarding",
    status: "processing",
    chunkCount: 386,
    createdAt: "2026-05-10T06:45:00.000Z",
    updatedAt: "2026-05-10T07:05:00.000Z",
  },
  {
    id: "fixture-source-3",
    sourceType: "database",
    title: "Customer support playbooks",
    status: "ready",
    chunkCount: 2348,
    createdAt: "2026-05-08T13:10:00.000Z",
    updatedAt: "2026-05-10T04:30:00.000Z",
  },
  {
    id: "fixture-source-4",
    sourceType: "website",
    title: "API reference mirror",
    url: "https://docs.example.com/api",
    status: "failed",
    chunkCount: 0,
    createdAt: "2026-05-07T11:00:00.000Z",
    updatedAt: "2026-05-09T12:40:00.000Z",
  },
  {
    id: "fixture-source-5",
    sourceType: "pdf",
    title: "Quarterly compliance register",
    originalFilename: "quarterly-compliance-register.pdf",
    status: "ready",
    chunkCount: 912,
    createdAt: "2026-05-06T10:30:00.000Z",
    updatedAt: "2026-05-08T10:30:00.000Z",
  },
];

function sourceTypeLabel(t: DocumentSourceType): string {
  return t === "pdf" ? "PDF" : t === "website" ? "SITE" : "DB";
}

function sourceTypeIcon(t: DocumentSourceType) {
  if (t === "pdf") return <FileText className="h-3.5 w-3.5" aria-hidden="true" />;
  if (t === "website") return <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />;
  return <Database className="h-3.5 w-3.5" aria-hidden="true" />;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

function documentSubtitle(doc: Document): string {
  return doc.originalFilename ?? doc.url ?? sourceTypeLabel(doc.sourceType);
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  const map: Record<DocumentStatus, string> = {
    ready: "dash-badge-ok",
    processing: "dash-badge-warn",
    failed: "dash-badge-err",
  };
  const label: Record<DocumentStatus, string> = {
    ready: "indexed",
    processing: "processing",
    failed: "failed",
  };
  const icon: Record<DocumentStatus, ReactNode> = {
    ready: <CheckCircle2 className="h-3 w-3" aria-hidden="true" />,
    processing: <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />,
    failed: <AlertTriangle className="h-3 w-3" aria-hidden="true" />,
  };

  return (
    <span className={`dash-badge inline-flex items-center gap-1.5 ${map[status]}`}>
      {icon[status]}
      {label[status]}
    </span>
  );
}

function TypeBadge({ type, sourceType }: { type: string; sourceType: DocumentSourceType }) {
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-sm border border-black/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted">
      {sourceTypeIcon(sourceType)}
      {type}
    </span>
  );
}

function ChunkValue({ doc }: { doc: Document }) {
  return (
    <span className={doc.chunkCount > 0 ? "text-foreground" : "text-muted"}>
      {doc.chunkCount > 0 ? doc.chunkCount.toLocaleString() : "-"}
    </span>
  );
}

type DocumentsSurfaceProps = {
  documents: Document[];
  error?: string | null;
  retryError?: string | null;
  deleting?: string | null;
  retrying?: string | null;
  onRefetch?: () => void;
  onDelete?: (doc: Document) => void;
  onRetry?: (doc: Document) => void;
};

export function DocumentsSurface({
  documents,
  error,
  retryError,
  deleting,
  retrying,
  onRefetch,
  onDelete,
  onRetry,
}: DocumentsSurfaceProps) {
  const pdfCount = documents.filter((d) => d.sourceType === "pdf").length;
  const siteCount = documents.filter((d) => d.sourceType === "website").length;
  const dbCount = documents.filter((d) => d.sourceType === "database").length;
  const readyCount = documents.filter((d) => d.status === "ready").length;
  const processingCount = documents.filter((d) => d.status === "processing").length;
  const failedCount = documents.filter((d) => d.status === "failed").length;

  return (
    <div className="relative mx-auto w-full max-w-6xl overflow-x-hidden p-4 lg:p-8">
      <div className="pointer-events-none absolute left-0 top-7 hidden h-px w-10 bg-black/15 lg:block" />
      <div className="pointer-events-none absolute right-0 top-7 hidden h-px w-10 bg-black/15 lg:block" />
      <div className="pointer-events-none absolute right-8 top-3 hidden items-center gap-2 font-mono text-[8px] uppercase tracking-[0.3em] text-muted lg:flex">
        <span className="h-px w-8 bg-accent/45" />
        <span>Source plan / ref 03</span>
      </div>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-black/10 pb-5">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-px w-4 bg-accent" />
            <span className="section-label text-[10px]">Documents</span>
            <span className="font-mono text-[10px] text-muted">No. 03</span>
          </div>
          <h1 className="font-display text-2xl font-medium tracking-tight">
            Manage sources<span className="text-accent">.</span>
          </h1>
          <p className="mt-1 text-sm text-muted">View indexed files, crawler entries, and ingestion status.</p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "PDF sources", value: pdfCount },
          { label: "SITE sources", value: siteCount },
          { label: "DB sources", value: dbCount },
        ].map((s) => (
          <div key={s.label} className="dash-stat-card">
            <div className="mb-2 font-mono text-[9px] uppercase tracking-widest text-muted">{s.label}</div>
            <div className="mb-1 font-display text-2xl font-medium leading-none">{s.value}</div>
            <div className="text-[10px] text-muted">indexed and searchable</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}{" "}
          {onRefetch && (
            <button type="button" onClick={onRefetch} className="underline">
              retry
            </button>
          )}
        </div>
      )}

      {retryError && (
        <div className="mb-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Retry failed: {retryError}
        </div>
      )}

      <section className="relative">
        <div className="pointer-events-none absolute -left-5 top-0 hidden h-full border-l border-dashed border-black/15 lg:block" />
        <div className="pointer-events-none absolute -left-8 top-1 hidden font-mono text-[8px] uppercase tracking-[0.24em] text-muted [writing-mode:vertical-rl] lg:block">
          registry elevation
        </div>
        <div className="pointer-events-none absolute -right-10 top-0 hidden h-20 border-r border-black/15 xl:block" />
        <div className="pointer-events-none absolute -right-10 top-0 hidden w-7 border-t border-black/15 xl:block" />
        <div className="pointer-events-none absolute -right-10 top-20 hidden w-7 border-t border-black/15 xl:block" />
        <div className="pointer-events-none absolute -right-24 top-8 hidden font-mono text-[8px] uppercase tracking-[0.24em] text-muted xl:block">
          live index
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif italic text-accent">I.</span>
              <span className="text-sm font-medium">Source registry</span>
            </div>
            <div className="mt-1 text-xs text-muted">{documents.length} sources tracked</div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:flex sm:flex-wrap sm:justify-end sm:text-left">
            <span className="dash-badge dash-badge-ok justify-center">Indexed {readyCount}</span>
            <span className="dash-badge dash-badge-warn justify-center">Processing {processingCount}</span>
            <span className="dash-badge dash-badge-err justify-center">Failed {failedCount}</span>
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="rounded-sm border border-black/10 px-4 py-10 text-center text-sm text-muted">
            No documents yet.{" "}
            <a href="/dashboard/upload" className="text-accent underline">
              Upload one
            </a>
            .
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <div className="min-w-[920px] overflow-hidden rounded-sm border border-black/10">
                <div className="grid grid-cols-[1fr_90px_120px_80px_90px_130px] gap-3 border-b border-black/10 bg-black/[0.03] px-4 py-2.5 font-mono text-[9px] uppercase tracking-widest text-muted">
                  <span>Name</span>
                  <span>Type</span>
                  <span>Status</span>
                  <span className="text-right">Chunks</span>
                  <span className="text-right">Updated</span>
                  <span className="text-right">Actions</span>
                </div>

                {documents.map((doc, i) => (
                  <div
                    key={doc.id}
                    className={`grid grid-cols-[1fr_90px_120px_80px_90px_130px] items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-black/[0.02] ${
                      i < documents.length - 1 ? "border-b border-black/[0.06]" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-foreground">{doc.title}</p>
                      <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-widest text-muted">
                        {documentSubtitle(doc)}
                      </p>
                    </div>
                    <TypeBadge type={sourceTypeLabel(doc.sourceType)} sourceType={doc.sourceType} />
                    <StatusBadge status={doc.status} />
                    <span className="text-right font-mono text-xs text-muted">
                      <ChunkValue doc={doc} />
                    </span>
                    <span className="text-right font-mono text-[10px] uppercase tracking-widest text-muted">
                      {formatDate(doc.updatedAt)}
                    </span>
                    <div className="flex items-center justify-end gap-2">
                      {doc.sourceType === "website" && doc.status === "failed" ? (
                        <button
                          type="button"
                          onClick={() => onRetry?.(doc)}
                          disabled={retrying === doc.id}
                          className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-black/10 px-2.5 font-mono text-[10px] uppercase tracking-wider text-accent transition hover:border-accent hover:bg-black/[0.02] disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Retry ${doc.title}`}
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${retrying === doc.id ? "animate-spin" : ""}`} aria-hidden="true" />
                          {retrying === doc.id ? "Retrying" : "Retry"}
                        </button>
                      ) : (
                        <span className="font-mono text-[10px] text-muted">-</span>
                      )}
                      <button
                        type="button"
                        onClick={() => onDelete?.(doc)}
                        disabled={deleting === doc.id}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-black/10 text-muted transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Delete ${doc.title}`}
                        title="Delete source"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-2 lg:hidden">
              {documents.map((doc) => (
                <article key={doc.id} className="rounded-sm border border-black/10 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="break-words text-xs font-medium leading-5 text-foreground [overflow-wrap:anywhere]">
                        {doc.title}
                      </h2>
                      <p className="mt-1 break-words font-mono text-[9px] uppercase tracking-widest text-muted [overflow-wrap:anywhere]">
                        {documentSubtitle(doc)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDelete?.(doc)}
                      disabled={deleting === doc.id}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-black/10 text-muted transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Delete ${doc.title}`}
                      title="Delete source"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-3">
                    <div className="min-w-0">
                      <dt className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-muted">Type</dt>
                      <dd>
                        <TypeBadge type={sourceTypeLabel(doc.sourceType)} sourceType={doc.sourceType} />
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-muted">Status</dt>
                      <dd>
                        <StatusBadge status={doc.status} />
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-muted">Chunks</dt>
                      <dd className="font-mono text-xs">
                        <ChunkValue doc={doc} />
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-muted">Updated</dt>
                      <dd className="font-mono text-xs uppercase tracking-[0.14em] text-muted">{formatDate(doc.updatedAt)}</dd>
                    </div>
                  </dl>

                  {doc.sourceType === "website" && doc.status === "failed" && (
                    <button
                      type="button"
                      onClick={() => onRetry?.(doc)}
                      disabled={retrying === doc.id}
                      className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-sm border border-black/10 font-mono text-[10px] uppercase tracking-wider text-accent transition hover:border-accent hover:bg-black/[0.02] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${retrying === doc.id ? "animate-spin" : ""}`} aria-hidden="true" />
                      {retrying === doc.id ? "Retrying" : "Retry source"}
                    </button>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
