"use client";

import { useState } from "react";
import { useDocuments, useDeleteDocument, useRetryDocumentIngestion } from "@/hooks/useDocuments";
import type { Document, DocumentSourceType, DocumentStatus } from "@/lib/api/types";

// ─── Helpers ───────────────────────────────────────────────────
function sourceTypeLabel(t: DocumentSourceType): string {
  return t === "pdf" ? "PDF" : t === "website" ? "SITE" : "DB";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "2-digit" });
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
  return (
    <span className={`dash-badge ${map[status]}`}>
      {status === "processing" && (
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse mr-1" />
      )}
      {label[status]}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="text-[9px] font-mono tracking-wider text-muted border border-black/10 px-1.5 py-0.5 rounded-sm w-fit">
      {type}
    </span>
  );
}

// ─── Delete confirmation dialog ────────────────────────────────
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

// ─── Page ──────────────────────────────────────────────────────
export default function DocumentsPage() {
  const { documents, loading, error, refetch } = useDocuments();
  const { deleteDocument, deleting } = useDeleteDocument();
  const { retryDocument, retrying, error: retryError } = useRetryDocumentIngestion();
  const [confirmDoc, setConfirmDoc] = useState<Document | null>(null);

  const pdfCount = documents.filter((d) => d.sourceType === "pdf").length;
  const siteCount = documents.filter((d) => d.sourceType === "website").length;
  const dbCount = documents.filter((d) => d.sourceType === "database").length;

  const handleDeleteConfirm = async () => {
    if (!confirmDoc) return;
    try {
      await deleteDocument(confirmDoc.id);
      setConfirmDoc(null);
      refetch();
    } catch {
      // error shown inline
    }
  };

  const handleRetry = async (doc: Document) => {
    try {
      await retryDocument(doc.id);
      refetch();
    } catch {
      // error shown inline
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="w-4 h-px bg-accent" />
        <span className="section-label text-[10px]">Documents</span>
        <span className="text-muted text-[10px] font-mono">· N° 03</span>
      </div>
      <h1 className="text-2xl font-display font-medium tracking-tight mb-1">
        Manage sources<span className="text-accent">.</span>
      </h1>
      <p className="text-sm text-muted mb-6">View indexed files, crawler entries, and ingestion status.</p>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: "PDF sources", value: pdfCount },
          { label: "SITE sources", value: siteCount },
          { label: "DB sources", value: dbCount },
        ].map((s) => (
          <div key={s.label} className="dash-stat-card">
            <div className="text-[9px] font-mono text-muted tracking-widest uppercase mb-2">{s.label}</div>
            <div className="text-2xl font-display font-medium leading-none mb-1">
              {loading ? "—" : s.value}
            </div>
            <div className="text-[10px] text-muted">indexed and searchable</div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 border border-red-200 bg-red-50 rounded-sm text-sm text-red-700">
          {error} —{" "}
          <button type="button" onClick={refetch} className="underline">
            retry
          </button>
        </div>
      )}

      {retryError && (
        <div className="mb-4 p-3 border border-red-200 bg-red-50 rounded-sm text-sm text-red-700">
          Retry failed: {retryError}
        </div>
      )}

      {/* Table */}
      <div className="border border-black/10 rounded-sm overflow-hidden bg-white/30">
        <div className="grid grid-cols-[1fr_64px_96px_76px_76px_76px_40px] gap-3 px-4 py-2.5 bg-black/[0.03] border-b border-black/10 text-[9px] font-mono text-muted tracking-widest uppercase">
          <span>Name</span>
          <span>Type</span>
          <span>Status</span>
          <span className="text-right">Chunks</span>
          <span className="text-right">Updated</span>
          <span className="text-right">Retry</span>
          <span />
        </div>

        {loading && (
          <div className="px-4 py-8 text-center text-sm text-muted font-mono tracking-wider">
            Loading…
          </div>
        )}

        {!loading && documents.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted">
            No documents yet.{" "}
            <a href="/dashboard/upload" className="text-accent underline">
              Upload one
            </a>
            .
          </div>
        )}

        {!loading &&
          documents.map((doc) => (
            <div
              key={doc.id}
              className="grid grid-cols-[1fr_64px_96px_76px_76px_76px_40px] gap-3 px-4 py-3 items-center border-b border-black/[0.06] last:border-b-0 text-sm"
            >
              <span className="truncate text-xs font-medium">{doc.title}</span>
              <TypeBadge type={sourceTypeLabel(doc.sourceType)} />
              <StatusBadge status={doc.status} />
              <span className="text-right text-xs text-muted font-mono">
                {doc.chunkCount > 0 ? doc.chunkCount.toLocaleString() : "—"}
              </span>
              <span className="text-right text-[10px] text-muted font-mono">
                {formatDate(doc.updatedAt)}
              </span>
              <span className="text-right">
                {doc.sourceType === "website" && doc.status === "failed" ? (
                  <button
                    type="button"
                    onClick={() => handleRetry(doc)}
                    disabled={retrying === doc.id}
                    className="text-[10px] font-mono text-accent hover:underline disabled:opacity-50"
                  >
                    {retrying === doc.id ? "Retrying…" : "Retry"}
                  </button>
                ) : (
                  <span className="text-[10px] text-muted font-mono">—</span>
                )}
              </span>
              <button
                type="button"
                onClick={() => setConfirmDoc(doc)}
                disabled={deleting === doc.id}
                className="text-muted hover:text-red-500 transition-colors text-[11px] font-mono"
                aria-label={`Delete ${doc.title}`}
              >
                ✕
              </button>
            </div>
          ))}
      </div>

      {/* Delete confirmation */}
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
