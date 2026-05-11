"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Database, FileText, Globe2, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useDocuments, useDeleteDocument, useRetryDocumentIngestion } from "@/hooks/useDocuments";
import type { Document, DocumentSourceType, DocumentStatus } from "@/lib/api/types";

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

function DeleteConfirm({
  doc,
  onConfirm,
  onCancel,
  loading,
}: {
  doc: Document;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const chunkLabel = doc.chunkCount > 0 ? `${doc.chunkCount.toLocaleString()} chunks` : "No chunks";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#16130f]/45 px-4 backdrop-blur-[3px]">
      <button
        type="button"
        aria-label="Close delete dialog"
        className="absolute inset-0 cursor-default"
        onClick={loading ? undefined : onCancel}
      />

      <div className="relative w-full max-w-[560px] overflow-hidden border border-[#d8d0c1] bg-[#f4efe4] shadow-2xl shadow-black/25">
        <div className="pointer-events-none absolute inset-0 opacity-[0.32] [background-image:linear-gradient(#d8d0c1_1px,transparent_1px),linear-gradient(90deg,#d8d0c1_1px,transparent_1px)] [background-size:12px_12px]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(#c8bdac_1px,transparent_1px),linear-gradient(90deg,#c8bdac_1px,transparent_1px)] [background-size:60px_60px]" />

        <div className="relative grid grid-cols-[64px_1fr] sm:grid-cols-[64px_1fr]">
          <aside className="hidden border-r border-[#d8d0c1] sm:block">
            <div className="flex h-[98px] items-center justify-center border-b border-[#d8d0c1]">
              <span className="h-3 w-3 rounded-full bg-[#df6a50]" />
            </div>
            <div className="flex h-[170px] items-center justify-center border-b border-[#d8d0c1]">
              <span className="font-mono text-[8px] uppercase tracking-[0.3em] text-[#756d62] [writing-mode:vertical-rl]">
                Iota erase
              </span>
            </div>
            <div className="h-[70px]" />
          </aside>

          <section className="col-span-2 sm:col-span-1">
            <header className="border-b border-[#d8d0c1] px-5 pb-5 pt-6 sm:px-6">
              <div className="mb-3 flex items-center justify-between gap-4 font-mono text-[8px] uppercase tracking-[0.38em] text-[#756d62]">
                <span>Deletion blueprint</span>
                <span className="hidden sm:inline">Ref: doc-db-erase</span>
              </div>
              <h3 className="font-display text-3xl font-medium tracking-[-0.04em] text-[#1f1d1a] sm:text-[31px] sm:leading-none">
                Delete this source<span className="text-[#d65f49]">.</span>
              </h3>
            </header>

            <div className="px-5 py-5 sm:px-6">
              <div className="border border-[#d8d0c1] bg-[#f8f4ec]/78 px-4 py-4 shadow-sm">
                <div className="grid gap-3 sm:grid-cols-[1fr_68px] sm:items-center">
                  <p className="text-sm leading-6 text-[#4c4740] sm:text-base">
                    This operation removes the document, vector chunks, ingestion job, and saved source references from the database.
                  </p>
                  <span className="font-display text-[34px] italic leading-none text-[#df745c] sm:text-right">03</span>
                </div>
              </div>

              <div className="mt-4 border-l border-[#df6a50] pl-3">
                <div className="mb-2.5 flex items-center gap-3">
                  <span className="h-px w-8 bg-[#df6a50]" />
                  <span className="font-mono text-[8px] uppercase tracking-[0.28em] text-[#c34f36]">
                    This action cannot be undone
                  </span>
                </div>
                <div className="min-w-0 border border-[#ded6c8] bg-[#fffaf2]/70 px-3 py-2">
                  <p className="truncate font-display text-sm font-medium text-[#1f1d1a]">{doc.title}</p>
                  <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.22em] text-[#756d62]">
                    {sourceTypeLabel(doc.sourceType)} / {doc.status} / {chunkLabel}
                  </p>
                </div>
              </div>
            </div>

            <footer className="flex flex-col gap-3 border-t border-[#d8d0c1] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-center gap-3 font-mono text-[8px] uppercase tracking-[0.3em] text-[#756d62]">
                <span className="h-px w-8 bg-[#b8ad9d]" />
                <span>Confirm operation</span>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={onCancel}
                  className="border border-[#d8d0c1] bg-[#fbf8f1] px-4 py-2.5 text-sm text-[#27231f] shadow-sm transition hover:bg-white disabled:opacity-60 sm:min-w-[82px]"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={loading}
                  className="border border-[#d8d0c1] bg-[#fbf8f1] px-4 py-2.5 text-sm text-[#27231f] shadow-sm transition hover:border-[#df6a50] hover:text-[#c34f36] disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[110px]"
                >
                  {loading ? "Deleting..." : "Delete source"}
                </button>
              </div>
            </footer>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  const { documents, loading, error, refetch } = useDocuments();
  const { deleteDocument, deleting } = useDeleteDocument();
  const { retryDocument, retrying, error: retryError } = useRetryDocumentIngestion();
  const [confirmDoc, setConfirmDoc] = useState<Document | null>(null);

  const pdfCount = documents.filter((d) => d.sourceType === "pdf").length;
  const siteCount = documents.filter((d) => d.sourceType === "website").length;
  const dbCount = documents.filter((d) => d.sourceType === "database").length;
  const readyCount = documents.filter((d) => d.status === "ready").length;
  const processingCount = documents.filter((d) => d.status === "processing").length;
  const failedCount = documents.filter((d) => d.status === "failed").length;

  const handleDeleteConfirm = async () => {
    if (!confirmDoc) return;
    try {
      await deleteDocument(confirmDoc.id);
      setConfirmDoc(null);
      refetch();
    } catch {
      // Error shown inline by the hook.
    }
  };

  const handleRetry = async (doc: Document) => {
    try {
      await retryDocument(doc.id);
      refetch();
    } catch {
      // Error shown inline by the hook.
    }
  };

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
            <span className="font-mono text-[10px] text-muted">· N° 03</span>
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
            <div className="mb-1 font-display text-2xl font-medium leading-none">{loading ? "-" : s.value}</div>
            <div className="text-[10px] text-muted">indexed and searchable</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}{" "}
          <button type="button" onClick={refetch} className="underline">
            retry
          </button>
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
            <div className="mt-1 text-xs text-muted">
              {loading ? "Checking sources..." : `${documents.length} sources tracked`}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:flex sm:flex-wrap sm:justify-end sm:text-left">
            <span className="dash-badge dash-badge-ok justify-center">Indexed {readyCount}</span>
            <span className="dash-badge dash-badge-warn justify-center">Processing {processingCount}</span>
            <span className="dash-badge dash-badge-err justify-center">Failed {failedCount}</span>
          </div>
        </div>

        {loading && (
          <div className="rounded-sm border border-black/10 px-4 py-10 text-center font-mono text-sm tracking-wider text-muted">
            Loading...
          </div>
        )}

        {!loading && documents.length === 0 && (
          <div className="rounded-sm border border-black/10 px-4 py-10 text-center text-sm text-muted">
            No documents yet.{" "}
            <a href="/dashboard/upload" className="text-accent underline">
              Upload one
            </a>
            .
          </div>
        )}

        {!loading && documents.length > 0 && (
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
                    className={`grid grid-cols-[1fr_90px_120px_80px_90px_130px] gap-3 px-4 py-3 items-center text-sm transition-colors hover:bg-black/[0.02] ${i < documents.length - 1 ? "border-b border-black/[0.06]" : ""}`}
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
                          onClick={() => handleRetry(doc)}
                          disabled={retrying === doc.id}
                          className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-black/10 px-2.5 font-mono text-[10px] uppercase tracking-wider text-accent transition hover:border-accent hover:bg-black/[0.02] disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Retry ${doc.title}`}
                        >
                          <RefreshCw
                            className={`h-3.5 w-3.5 ${retrying === doc.id ? "animate-spin" : ""}`}
                            aria-hidden="true"
                          />
                          {retrying === doc.id ? "Retrying" : "Retry"}
                        </button>
                      ) : (
                        <span className="font-mono text-[10px] text-muted">-</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setConfirmDoc(doc)}
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
                      onClick={() => setConfirmDoc(doc)}
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
                      onClick={() => handleRetry(doc)}
                      disabled={retrying === doc.id}
                      className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-sm border border-black/10 font-mono text-[10px] uppercase tracking-wider text-accent transition hover:border-accent hover:bg-black/[0.02] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${retrying === doc.id ? "animate-spin" : ""}`}
                        aria-hidden="true"
                      />
                      {retrying === doc.id ? "Retrying" : "Retry source"}
                    </button>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {confirmDoc && (
        <DeleteConfirm
          doc={confirmDoc}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmDoc(null)}
          loading={deleting === confirmDoc.id}
        />
      )}
    </div>
  );
}
