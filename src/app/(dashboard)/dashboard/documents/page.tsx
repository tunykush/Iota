"use client";

import { useState } from "react";
import { useDocuments, useDeleteDocument } from "@/hooks/useDocuments";
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white border border-black/10 rounded-sm p-6 max-w-sm w-full mx-4 shadow-xl">
        <h3 className="font-display font-medium mb-2">Delete document?</h3>
        <p className="text-sm text-muted mb-1">
          <span className="font-medium text-foreground">{doc.title}</span> and all its chunks will
          be permanently removed.
        </p>
        <p className="text-xs text-muted mb-5">This action cannot be undone.</p>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel} className="dash-btn" disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="dash-btn bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
          >
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────
export default function DocumentsPage() {
  const { documents, loading, error, refetch } = useDocuments();
  const { deleteDocument, deleting } = useDeleteDocument();
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

      {/* Table */}
      <div className="border border-black/10 rounded-sm overflow-hidden bg-white/30">
        <div className="grid grid-cols-[1fr_64px_96px_76px_76px_40px] gap-3 px-4 py-2.5 bg-black/[0.03] border-b border-black/10 text-[9px] font-mono text-muted tracking-widest uppercase">
          <span>Name</span>
          <span>Type</span>
          <span>Status</span>
          <span className="text-right">Chunks</span>
          <span className="text-right">Updated</span>
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
              className="grid grid-cols-[1fr_64px_96px_76px_76px_40px] gap-3 px-4 py-3 items-center border-b border-black/[0.06] last:border-b-0 text-sm"
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
