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
} from "../AdminShared";
import { AdminTimelineFixture } from "../AdminSkeletonFixtures";

export default function AdminTimelinePage() {
  const { scoped, loading, error } = useAdminData();

  if (error) {
    return (
      <div className="p-6">
        <div className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  const typeColors: Record<string, string> = {
    document: "border-blue-300 text-blue-600 bg-blue-50",
    job: "border-yellow-300 text-yellow-700 bg-yellow-50",
    conversation: "border-green-300 text-green-700 bg-green-50",
    message: "border-purple-300 text-purple-600 bg-purple-50",
  };

  const statusColors: Record<string, string> = {
    ready: "text-green-700",
    succeeded: "text-green-700",
    running: "text-blue-600",
    processing: "text-yellow-700",
    failed: "text-red-600",
  };

  return (
    <BoneyardSkeleton
      name="admin-timeline"
      loading={loading}
      fixture={<AdminTimelineFixture />}
      snapshotConfig={IOTA_BONEYARD_SNAPSHOT_CONFIG}
    >
      <AdminGridBackground>
        <AdminPageHeader
          label="Activity feed"
          title="System timeline"
          description="Chronological feed of all system events — documents, jobs, conversations, and messages."
        >
          <div className="text-right">
            <div className="font-mono text-2xl">{scoped.timeline.length}</div>
            <BlueprintLabel>events</BlueprintLabel>
          </div>
        </AdminPageHeader>

        <section className="border border-black/15 bg-background/80">
          <div className="flex items-center justify-between border-b border-black/15 px-4 py-3">
            <h2 className="font-display text-xl">Event Stream</h2>
            <BlueprintLabel>{scoped.timeline.length} events</BlueprintLabel>
          </div>

          {scoped.timeline.length === 0 ? (
            <EmptyLine label="No timeline events yet." />
          ) : (
            <div className="divide-y divide-black/10">
              {scoped.timeline.map((event, index) => (
                <div
                  key={`${event.type}-${event.createdAt}-${index}`}
                  className="flex items-start gap-4 px-4 py-4 hover:bg-black/[0.015] transition-colors"
                >
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center pt-1">
                    <div className={`w-2.5 h-2.5 rounded-full border-2 ${
                      event.type === "document" ? "border-blue-400 bg-blue-100" :
                      event.type === "job" ? "border-yellow-400 bg-yellow-100" :
                      event.type === "conversation" ? "border-green-400 bg-green-100" :
                      "border-purple-400 bg-purple-100"
                    }`} />
                    {index < scoped.timeline.length - 1 && (
                      <div className="w-px h-8 bg-black/10 mt-1" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${typeColors[event.type] || "border-black/15"}`}>
                        {event.type}
                      </span>
                      <span className={`text-[11px] font-mono uppercase tracking-wider ${statusColors[event.status] || "text-muted"}`}>
                        {event.status}
                      </span>
                      <span className="text-[11px] font-mono text-muted ml-auto">
                        {formatDate(event.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-foreground/80 truncate">{event.title}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </AdminGridBackground>
    </BoneyardSkeleton>
  );
}
