"use client";

import { useMemo } from "react";
import { Skeleton as BoneyardSkeleton } from "boneyard-js/react";
import { IOTA_BONEYARD_SNAPSHOT_CONFIG } from "@/components/dashboard/boneyard";
import { useAdminData } from "../AdminDataProvider";
import { AdminGridBackground, AdminPageHeader, BlueprintLabel, formatDate } from "../AdminShared";
import { AdminUsersFixture } from "../AdminSkeletonFixtures";

export default function AdminUsersPage() {
  const { data, loading, error, selectedUserId, setSelectedUserId } = useAdminData();

  const selectedUser = useMemo(
    () => data.users.find((u) => u.id === selectedUserId),
    [data, selectedUserId],
  );

  if (error) {
    return (
      <div className="p-6">
        <div className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <BoneyardSkeleton
      name="admin-users"
      loading={loading}
      fixture={<AdminUsersFixture />}
      snapshotConfig={IOTA_BONEYARD_SNAPSHOT_CONFIG}
    >
      <AdminGridBackground>
        <AdminPageHeader
          label="User management"
          title="Users / access ledger"
          description="Complete user roster with activity metrics, document counts, and role assignments."
        >
          <div className="text-right">
            <div className="font-mono text-2xl">{data.users.length}</div>
            <BlueprintLabel>total accounts</BlueprintLabel>
          </div>
        </AdminPageHeader>

        {selectedUser && (
          <section className="grid gap-4 border border-black/15 bg-background/80 p-4 lg:grid-cols-[1fr_2fr]">
            <div>
              <BlueprintLabel>Focused account</BlueprintLabel>
              <h2 className="mt-3 font-display text-3xl">{selectedUser.name || selectedUser.email || "Unnamed user"}</h2>
              <div className="mt-2 font-mono text-[11px] text-muted">{selectedUser.id}</div>
              <button
                type="button"
                onClick={() => setSelectedUserId("all")}
                className="mt-3 text-xs text-accent hover:underline"
              >
                ← Clear selection
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {([
                ["docs", selectedUser.documentCount],
                ["chunks", selectedUser.chunkCount],
                ["jobs failed", selectedUser.failedJobCount],
                ["threads", selectedUser.conversationCount],
                ["messages", selectedUser.recentMessageCount],
                ["last", formatDate(selectedUser.lastActivityAt)],
              ] as const).map(([label, value]) => (
                <div key={label} className="border-l border-black/15 pl-3">
                  <BlueprintLabel>{label}</BlueprintLabel>
                  <div className="mt-2 font-mono text-sm">{value}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="border border-black/15 bg-background/80">
          <div className="flex items-center justify-between border-b border-black/15 px-4 py-3">
            <h2 className="font-display text-xl">All Users</h2>
            <BlueprintLabel>{data.users.length} rows</BlueprintLabel>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-sm">
              <thead className="text-left text-[10px] font-mono uppercase tracking-[0.2em] text-muted">
                <tr className="border-b border-black/15">
                  <th className="px-4 py-3 font-medium">Account</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Docs</th>
                  <th className="px-4 py-3 font-medium">Chunks</th>
                  <th className="px-4 py-3 font-medium">Processing</th>
                  <th className="px-4 py-3 font-medium">Failed</th>
                  <th className="px-4 py-3 font-medium">Threads</th>
                  <th className="px-4 py-3 font-medium">Msgs</th>
                  <th className="px-4 py-3 font-medium">Cites</th>
                  <th className="px-4 py-3 font-medium">Last active</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={`cursor-pointer border-b border-black/10 last:border-b-0 hover:bg-black/[0.025] transition-colors ${
                      selectedUserId === user.id ? "bg-black/[0.04]" : ""
                    }`}
                  >
                    <td className="px-4 py-4">
                      <div className="font-medium">{user.name || user.email || "Unnamed user"}</div>
                      <div className="mt-1 font-mono text-[11px] text-muted">{user.email || user.id}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`border px-2 py-1 text-[11px] uppercase tracking-wider ${
                        user.role === "admin" ? "border-accent/30 text-accent" : "border-black/15"
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-mono">{user.documentCount}</td>
                    <td className="px-4 py-4 font-mono">{user.chunkCount}</td>
                    <td className="px-4 py-4 font-mono">{user.processingCount}</td>
                    <td className="px-4 py-4 font-mono">{user.failedJobCount}</td>
                    <td className="px-4 py-4 font-mono">{user.conversationCount}</td>
                    <td className="px-4 py-4 font-mono">{user.recentMessageCount}</td>
                    <td className="px-4 py-4 font-mono">{user.sourceCitationCount}</td>
                    <td className="px-4 py-4 font-mono text-[11px] text-muted">{formatDate(user.lastActivityAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </AdminGridBackground>
    </BoneyardSkeleton>
  );
}
