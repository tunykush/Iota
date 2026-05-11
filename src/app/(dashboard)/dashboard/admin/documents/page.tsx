"use client";

import { Skeleton as BoneyardSkeleton } from "boneyard-js/react";
import { IOTA_BONEYARD_SNAPSHOT_CONFIG } from "@/components/dashboard/boneyard";
import { useAdminData } from "../AdminDataProvider";
import {
  AdminGridBackground,
  AdminPageHeader,
  BlueprintLabel,
  EmptyLine,
  WrapText,
  formatDate,
  shortId,
  stringifyMeta,
} from "../AdminShared";
import { AdminDocumentsFixture } from "../AdminSkeletonFixtures";

export default function AdminDocumentsPage() {
  const { scoped, loading, error } = useAdminData();

  if (error) {
    return (
      <div className="p-6">
        <div className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <BoneyardSkeleton
      name="admin-documents"
      loading={loading}
      fixture={<AdminDocumentsFixture />}
      snapshotConfig={IOTA_BONEYARD_SNAPSHOT_CONFIG}
    >
      <AdminGridBackground>
        <AdminPageHeader
          label="Document registry"
          title="Documents / storage / metadata"
          description="Full document inventory with storage paths, content hashes, chunk counts, and processing status."
        >
          <div className="text-right">
            <div className="font-mono text-2xl">{scoped.recentDocuments.length}</div>
            <BlueprintLabel>documents</BlueprintLabel>
          </div>
        </AdminPageHeader>

        <section className="border border-black/15 bg-background/80">
          <div className="flex items-center justify-between border-b border-black/15 px-4 py-3">
            <h2 className="font-display text-xl">All Documents</h2>
            <BlueprintLabel>{scoped.recentDocuments.length} entries</BlueprintLabel>
          </div>

          {scoped.recentDocuments.length === 0 ? (
            <EmptyLine label="No document traces yet." />
          ) : (
            scoped.recentDocuments.map((document) => (
              <div key={document.id} className="min-w-0 border-b border-black/10 px-4 py-4 text-sm last:border-b-0">
                <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                  <div className="min-w-0">
                    <div className="break-words font-medium [overflow-wrap:anywhere]">{document.title}</div>
                    <div className="mt-1 break-words font-mono text-[11px] text-muted [overflow-wrap:anywhere]">
                      {document.sourceType} / {document.chunkCount} chunks / {shortId(document.userId)}
                    </div>
                  </div>
                  <div className="font-mono text-[11px] uppercase tracking-wider text-muted">
                    <span className={`border px-2 py-1 ${
                      document.status === "ready" ? "border-green-300 text-green-700" :
                      document.status === "failed" ? "border-red-300 text-red-600" :
                      "border-yellow-300 text-yellow-700"
                    }`}>
                      {document.status}
                    </span>
                  </div>
                </div>
                <div className="mt-3 grid min-w-0 gap-2 font-mono text-[11px] text-muted md:grid-cols-2">
                  <WrapText>file: {document.originalFilename || document.url || "--"}</WrapText>
                  <WrapText>storage: {document.storageBucket || "--"}/{document.storagePath || "--"}</WrapText>
                  <WrapText>hash: {shortId(document.contentHash)}</WrapText>
                  <WrapText>updated: {formatDate(document.updatedAt)}</WrapText>
                </div>
                {(document.errorMessage || document.metadata) && (
                  <div className="mt-3 min-w-0 break-words border-l border-black/15 pl-3 font-mono text-[11px] text-muted [overflow-wrap:anywhere]">
                    {document.errorMessage || stringifyMeta(document.metadata)}
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      </AdminGridBackground>
    </BoneyardSkeleton>
  );
}
