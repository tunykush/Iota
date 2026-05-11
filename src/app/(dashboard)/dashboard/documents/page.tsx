"use client";

import { Skeleton as BoneyardSkeleton } from "boneyard-js/react";
import { useState } from "react";
import { DOCUMENTS_FIXTURE, DocumentsSurface } from "@/components/dashboard/DocumentsSurface";
import { IOTA_BONEYARD_SNAPSHOT_CONFIG } from "@/components/dashboard/boneyard";
import { useDeleteDocument, useDocuments, useRetryDocumentIngestion } from "@/hooks/useDocuments";
import type { Document } from "@/lib/api/types";

function sourceTypeLabel(t: Document["sourceType"]): string {
  return t === "pdf" ? "PDF" : t === "website" ? "SITE" : "DB";
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

  const handleDeleteConfirm = async () => {
    if (!confirmDoc) return;
    try {
      await deleteDocument(confirmDoc.id);
      setConfirmDoc(null);
      refetch();
    } catch {
      // Error shown by the hook caller when wired into the surface.
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

  const visibleDocuments = loading ? DOCUMENTS_FIXTURE : documents;

  return (
    <>
      <BoneyardSkeleton
        name="documents-registry"
        loading={loading}
        fixture={<DocumentsSurface documents={DOCUMENTS_FIXTURE} />}
        snapshotConfig={IOTA_BONEYARD_SNAPSHOT_CONFIG}
      >
        <DocumentsSurface
          documents={visibleDocuments}
          error={loading ? null : error}
          retryError={loading ? null : retryError}
          deleting={deleting}
          retrying={retrying}
          onRefetch={refetch}
          onDelete={setConfirmDoc}
          onRetry={handleRetry}
        />
      </BoneyardSkeleton>

      {confirmDoc && (
        <DeleteConfirm
          doc={confirmDoc}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmDoc(null)}
          loading={deleting === confirmDoc.id}
        />
      )}
    </>
  );
}
