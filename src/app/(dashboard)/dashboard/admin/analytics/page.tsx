"use client";

import { Skeleton as BoneyardSkeleton } from "boneyard-js/react";
import { IOTA_BONEYARD_SNAPSHOT_CONFIG } from "@/components/dashboard/boneyard";
import { useAdminData } from "../AdminDataProvider";
import {
  AdminGridBackground,
  AdminPageHeader,
  BlueprintLabel,
  BreakdownPanel,
} from "../AdminShared";
import { AdminAnalyticsFixture } from "../AdminSkeletonFixtures";

export default function AdminAnalyticsPage() {
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
      name="admin-analytics"
      loading={loading}
      fixture={<AdminAnalyticsFixture />}
      snapshotConfig={IOTA_BONEYARD_SNAPSHOT_CONFIG}
    >
      <AdminAnalyticsContent data={data} />
    </BoneyardSkeleton>
  );
}

function AdminAnalyticsContent({ data }: { data: ReturnType<typeof useAdminData>["data"] }) {
  // Compute additional analytics from user data
  const totalDocs = data.users.reduce((sum, u) => sum + u.documentCount, 0);
  const totalChunks = data.users.reduce((sum, u) => sum + u.chunkCount, 0);
  const totalMessages = data.users.reduce((sum, u) => sum + u.recentMessageCount, 0);
  const totalThreads = data.users.reduce((sum, u) => sum + u.conversationCount, 0);
  const totalCitations = data.users.reduce((sum, u) => sum + u.sourceCitationCount, 0);

  const userActivity: Record<string, number> = {};
  for (const user of data.users) {
    const label = user.name || user.email || user.id.slice(0, 8);
    userActivity[label] = user.recentMessageCount;
  }

  const userDocuments: Record<string, number> = {};
  for (const user of data.users) {
    const label = user.name || user.email || user.id.slice(0, 8);
    userDocuments[label] = user.documentCount;
  }

  const userChunks: Record<string, number> = {};
  for (const user of data.users) {
    const label = user.name || user.email || user.id.slice(0, 8);
    userChunks[label] = user.chunkCount;
  }

  return (
    <AdminGridBackground>
      <AdminPageHeader
        label="System analytics"
        title="Breakdowns & distributions"
        description="Visual breakdown of system data across documents, jobs, messages, chunks, and user activity."
      />

      {/* Summary stats */}
      <section className="grid border border-black/15 bg-background/75 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Total Docs", totalDocs],
          ["Total Chunks", totalChunks],
          ["Total Messages", totalMessages],
          ["Total Threads", totalThreads],
          ["Total Citations", totalCitations],
        ].map(([label, value]) => (
          <div key={label} className="relative border-b border-r border-black/10 p-4 last:border-r-0">
            <BlueprintLabel>{label}</BlueprintLabel>
            <div className="mt-3 font-display text-3xl leading-none">{value}</div>
            <span className="absolute right-3 top-3 h-2 w-2 border border-black/25" />
          </div>
        ))}
      </section>

      {/* System breakdowns */}
      <div>
        <div className="mb-4">
          <BlueprintLabel>System breakdowns</BlueprintLabel>
          <h2 className="mt-1 font-display text-xl">Data Distribution</h2>
        </div>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <BreakdownPanel title="Doc Status" rows={data.breakdowns.documentsByStatus} />
          <BreakdownPanel title="Doc Sources" rows={data.breakdowns.documentsBySourceType} />
          <BreakdownPanel title="Job Status" rows={data.breakdowns.jobsByStatus} />
          <BreakdownPanel title="Msg Roles" rows={data.breakdowns.messagesByRole} />
          <BreakdownPanel title="Chunk Types" rows={data.breakdowns.chunksBySourceType} />
        </section>
      </div>

      {/* Per-user breakdowns */}
      <div>
        <div className="mb-4">
          <BlueprintLabel>Per-user analytics</BlueprintLabel>
          <h2 className="mt-1 font-display text-xl">User Activity Distribution</h2>
        </div>
        <section className="grid gap-4 md:grid-cols-3">
          <BreakdownPanel title="Messages by User" rows={userActivity} />
          <BreakdownPanel title="Documents by User" rows={userDocuments} />
          <BreakdownPanel title="Chunks by User" rows={userChunks} />
        </section>
      </div>
    </AdminGridBackground>
  );
}
