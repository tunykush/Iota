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
import { AdminMessagesFixture } from "../AdminSkeletonFixtures";

export default function AdminMessagesPage() {
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
      name="admin-messages"
      loading={loading}
      fixture={<AdminMessagesFixture />}
      snapshotConfig={IOTA_BONEYARD_SNAPSHOT_CONFIG}
    >
      <AdminGridBackground>
        <AdminPageHeader
          label="Communication log"
          title="Message traces & citations"
          description="Full message archive with model attribution, metadata, and retrieval source citations."
        >
          <div className="flex gap-6">
            <div className="text-right">
              <div className="font-mono text-2xl">{scoped.recentMessages.length}</div>
              <BlueprintLabel>messages</BlueprintLabel>
            </div>
            <div className="text-right">
              <div className="font-mono text-2xl">{scoped.recentSources.length}</div>
              <BlueprintLabel>citations</BlueprintLabel>
            </div>
          </div>
        </AdminPageHeader>

        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          {/* Message traces */}
          <section className="border border-black/15 bg-background/80">
            <div className="flex items-center justify-between border-b border-black/15 px-4 py-3">
              <h2 className="font-display text-xl">Message Trace Archive</h2>
              <BlueprintLabel>{scoped.recentMessages.length} entries</BlueprintLabel>
            </div>
            {scoped.recentMessages.length === 0 ? (
              <EmptyLine label="No chat traces yet." />
            ) : (
              scoped.recentMessages.map((message) => (
                <div key={message.id} className="border-b border-black/10 px-4 py-4 text-sm last:border-b-0">
                  <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-wider text-muted">
                    <span className={`border px-2 py-0.5 ${
                      message.role === "user" ? "border-blue-300 text-blue-600" :
                      message.role === "assistant" ? "border-green-300 text-green-700" :
                      "border-black/15"
                    }`}>
                      {message.role}
                    </span>
                    <span className="h-px w-6 bg-black/20" />
                    <span>{formatDate(message.createdAt)}</span>
                    <span>{message.model || "no-model"}</span>
                    <span>{shortId(message.userId)}</span>
                  </div>
                  <p className="mt-2 line-clamp-3 text-foreground/75">{message.content}</p>
                  <div className="mt-2 font-mono text-[11px] text-muted">{stringifyMeta(message.metadata)}</div>
                </div>
              ))
            )}
          </section>

          {/* Citations / sources */}
          <section className="border border-black/15 bg-background/80">
            <div className="flex items-center justify-between border-b border-black/15 px-4 py-3">
              <h2 className="font-display text-xl">Citations / Sources</h2>
              <BlueprintLabel>{scoped.recentSources.length} entries</BlueprintLabel>
            </div>
            {scoped.recentSources.length === 0 ? (
              <EmptyLine label="No citations yet." />
            ) : (
              scoped.recentSources.map((source) => (
                <div key={source.id} className="min-w-0 border-b border-black/10 px-4 py-4 text-sm last:border-b-0">
                  <div className="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <span className="font-mono text-[11px] text-muted">
                      score{" "}
                      <span className={`font-medium ${
                        (source.score ?? 0) >= 0.8 ? "text-green-700" :
                        (source.score ?? 0) >= 0.5 ? "text-yellow-700" :
                        "text-red-600"
                      }`}>
                        {source.score?.toFixed(3) ?? "--"}
                      </span>
                    </span>
                    <span className="font-mono text-[11px] text-muted">{formatDate(source.createdAt)}</span>
                  </div>
                  <p className="mt-2 break-words text-foreground/75 [overflow-wrap:anywhere] sm:line-clamp-3">
                    {source.snippet || stringifyMeta(source.metadata)}
                  </p>
                  <div className="mt-2 break-words font-mono text-[11px] text-muted [overflow-wrap:anywhere]">
                    chunk {shortId(source.chunkId)} / msg {shortId(source.messageId)}
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
