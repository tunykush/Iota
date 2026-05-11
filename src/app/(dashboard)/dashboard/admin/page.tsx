"use client";

import { Skeleton as BoneyardSkeleton } from "boneyard-js/react";
import { IOTA_BONEYARD_SNAPSHOT_CONFIG } from "@/components/dashboard/boneyard";
import { useAdminData } from "./AdminDataProvider";
import { AdminGridBackground, AdminPageHeader, BlueprintLabel, BreakdownPanel } from "./AdminShared";
import { AdminOverviewFixture } from "./AdminSkeletonFixtures";

export default function AdminOverviewPage() {
  const { data, loading, error } = useAdminData();

  if (error) {
    return (
      <div className="p-6">
        <div className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <BoneyardSkeleton
      name="admin-overview"
      loading={loading}
      fixture={<AdminOverviewFixture />}
      snapshotConfig={IOTA_BONEYARD_SNAPSHOT_CONFIG}
    >
      <AdminOverviewContent data={data} />
    </BoneyardSkeleton>
  );
}

function AdminOverviewContent({ data }: { data: ReturnType<typeof useAdminData>["data"] }) {
  const stats = [
    ["Users", data.stats.userCount, "registered accounts"],
    ["Admins", data.stats.adminCount, "elevated profiles"],
    ["Documents", data.stats.documentCount, `${data.stats.documentsLast7d} new / 7d`],
    ["Chunks", data.stats.chunkCount, `${data.stats.sampledChunkCount} sampled`],
    ["Jobs", data.stats.jobCount, `${data.stats.failedJobCount} failed`],
    ["Threads", data.stats.conversationCount, "conversations"],
    ["Messages", data.stats.recentMessageCount, `${data.stats.messagesLast24h} / 24h`],
    ["Citations", data.stats.sourceCitationCount, "retrieval sources"],
  ];

  return (
    <AdminGridBackground>
      <AdminPageHeader
        label="Admin deep access surface"
        title="Full-system telemetry map"
        description="Service-role backed view across profiles, documents, storage metadata, ingestion jobs, chunks, citations, conversations, messages, and recent system timeline."
      />

      {/* Stats grid */}
      <section className="grid border border-black/15 bg-background/75 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, value, note]) => (
          <div key={label} className="relative min-h-32 border-b border-r border-black/10 p-4 last:border-r-0">
            <BlueprintLabel>{label}</BlueprintLabel>
            <div className="mt-5 font-display text-5xl leading-none">{value}</div>
            <div className="mt-3 text-[11px] uppercase tracking-wider text-muted">{note}</div>
            <span className="absolute right-3 top-3 h-2 w-2 border border-black/25" />
          </div>
        ))}
      </section>

      {/* Breakdowns */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <BreakdownPanel title="Doc status" rows={data.breakdowns.documentsByStatus} />
        <BreakdownPanel title="Sources" rows={data.breakdowns.documentsBySourceType} />
        <BreakdownPanel title="Jobs" rows={data.breakdowns.jobsByStatus} />
        <BreakdownPanel title="Messages" rows={data.breakdowns.messagesByRole} />
        <BreakdownPanel title="Chunks" rows={data.breakdowns.chunksBySourceType} />
      </section>

      {/* Quick recent activity */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="border border-black/15 bg-background/80 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg">Recent Documents</h3>
            <BlueprintLabel>{data.recentDocuments.length} latest</BlueprintLabel>
          </div>
          <div className="space-y-2">
            {data.recentDocuments.slice(0, 5).map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-3 py-2 border-b border-black/5 last:border-b-0">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{doc.title}</div>
                  <div className="text-[11px] font-mono text-muted">{doc.sourceType} / {doc.chunkCount} chunks</div>
                </div>
                <span className="flex-shrink-0 border border-black/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted">
                  {doc.status}
                </span>
              </div>
            ))}
            {data.recentDocuments.length === 0 && (
              <div className="text-xs text-muted py-2">No documents yet.</div>
            )}
          </div>
        </div>

        <div className="border border-black/15 bg-background/80 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg">System Timeline</h3>
            <BlueprintLabel>{data.timeline.length} events</BlueprintLabel>
          </div>
          <div className="space-y-2">
            {data.timeline.slice(0, 5).map((event, index) => (
              <div key={`${event.type}-${event.createdAt}-${index}`} className="flex items-center gap-3 py-2 border-b border-black/5 last:border-b-0">
                <span className="flex-shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted w-16">{event.type}</span>
                <span className="min-w-0 text-sm truncate text-foreground/80">{event.title}</span>
                <span className="flex-shrink-0 ml-auto font-mono text-[10px] uppercase tracking-wider text-muted">{event.status}</span>
              </div>
            ))}
            {data.timeline.length === 0 && (
              <div className="text-xs text-muted py-2">No timeline events yet.</div>
            )}
          </div>
        </div>
      </section>
    </AdminGridBackground>
  );
}
