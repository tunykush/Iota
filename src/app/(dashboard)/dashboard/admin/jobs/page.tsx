"use client";

import { Skeleton as BoneyardSkeleton } from "boneyard-js/react";
import { IOTA_BONEYARD_SNAPSHOT_CONFIG } from "@/components/dashboard/boneyard";
import { useAdminData } from "../AdminDataProvider";
import {
  AdminGridBackground,
  AdminPageHeader,
  BlueprintLabel,
  EmptyLine,
  formatDate,
  shortId,
  stringifyMeta,
} from "../AdminShared";
import { AdminJobsFixture } from "../AdminSkeletonFixtures";

export default function AdminJobsPage() {
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
      name="admin-jobs"
      loading={loading}
      fixture={<AdminJobsFixture />}
      snapshotConfig={IOTA_BONEYARD_SNAPSHOT_CONFIG}
    >
      <AdminGridBackground>
        <AdminPageHeader
          label="Pipeline operations"
          title="Ingestion jobs & chunk samples"
          description="Track ingestion pipeline stages, job statuses, and inspect sampled chunk data across all users."
        >
          <div className="flex gap-6">
            <div className="text-right">
              <div className="font-mono text-2xl">{scoped.recentJobs.length}</div>
              <BlueprintLabel>jobs</BlueprintLabel>
            </div>
            <div className="text-right">
              <div className="font-mono text-2xl">{scoped.sampledChunks.length}</div>
              <BlueprintLabel>chunks</BlueprintLabel>
            </div>
          </div>
        </AdminPageHeader>

        <div className="grid min-w-0 gap-6 xl:grid-cols-2">
          {/* Ingestion jobs */}
          <section className="min-w-0 overflow-hidden border border-black/15 bg-background/80">
            <div className="flex items-center justify-between border-b border-black/15 px-4 py-3">
              <h2 className="font-display text-xl">Ingestion Jobs</h2>
              <BlueprintLabel>{scoped.recentJobs.length} entries</BlueprintLabel>
            </div>
            {scoped.recentJobs.length === 0 ? (
              <EmptyLine label="No jobs yet." />
            ) : (
              scoped.recentJobs.map((job) => (
                <div key={job.id} className="min-w-0 border-b border-black/10 px-4 py-4 text-sm last:border-b-0">
                  <div className="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <span className="break-words font-medium [overflow-wrap:anywhere]">
                      {job.jobType} / {job.stage || "queued"}
                    </span>
                    <span className={`font-mono text-[11px] uppercase tracking-wider border px-2 py-0.5 ${
                      job.status === "succeeded" ? "border-green-300 text-green-700" :
                      job.status === "failed" ? "border-red-300 text-red-600" :
                      job.status === "running" ? "border-blue-300 text-blue-600" :
                      "border-black/15 text-muted"
                    }`}>
                      {job.status}
                    </span>
                  </div>
                  <div className="mt-2 break-words font-mono text-[11px] text-muted [overflow-wrap:anywhere]">
                    doc {shortId(job.documentId)} / {formatDate(job.createdAt)}
                  </div>
                  {(job.errorMessage || job.metadata) && (
                    <div className="mt-2 break-words text-xs text-muted [overflow-wrap:anywhere] sm:line-clamp-2">
                      {job.errorMessage || stringifyMeta(job.metadata)}
                    </div>
                  )}
                </div>
              ))
            )}
          </section>

          {/* Chunk samples */}
          <section className="min-w-0 overflow-hidden border border-black/15 bg-background/80">
            <div className="flex items-center justify-between border-b border-black/15 px-4 py-3">
              <h2 className="font-display text-xl">Chunk Samples</h2>
              <BlueprintLabel>{scoped.sampledChunks.length} entries</BlueprintLabel>
            </div>
            {scoped.sampledChunks.length === 0 ? (
              <EmptyLine label="No chunks sampled yet." />
            ) : (
              scoped.sampledChunks.map((chunk) => (
                <div key={chunk.id} className="min-w-0 border-b border-black/10 px-4 py-4 text-sm last:border-b-0">
                  <div className="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <span className="break-words font-medium [overflow-wrap:anywhere]">
                      #{chunk.chunkIndex} / {chunk.sourceType}
                    </span>
                    <span className="font-mono text-[11px] text-muted">{chunk.tokenCount ?? 0} tok</span>
                  </div>
                  <div className="mt-2 break-words font-mono text-[11px] text-muted [overflow-wrap:anywhere]">
                    doc {shortId(chunk.documentId)} / page {chunk.pageNumber ?? "--"}
                  </div>
                  <div className="mt-2 break-words text-xs text-muted [overflow-wrap:anywhere] sm:line-clamp-1">
                    {chunk.url || stringifyMeta(chunk.metadata)}
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      </AdminGridBackground>
    </BoneyardSkeleton>
  );
}
