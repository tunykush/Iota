"use client";

import { Skeleton as BoneyardSkeleton } from "boneyard-js/react";
import { IOTA_BONEYARD_SNAPSHOT_CONFIG } from "@/components/dashboard/boneyard";
import { AdminDataProvider, useAdminData } from "./AdminDataProvider";
import { AdminScopeFilterFixture } from "./AdminSkeletonFixtures";

/**
 * Admin layout client — wraps children with AdminDataProvider.
 * The sidebar navigation is now handled by the main dashboard layout
 * which switches between user/admin nav based on the current route.
 * This component only provides the data context + user scope filter.
 */

function AdminScopeFilter() {
  const { data, loading, selectedUserId, setSelectedUserId } = useAdminData();

  return (
    <BoneyardSkeleton
      name="admin-scope-filter"
      loading={loading}
      fixture={<AdminScopeFilterFixture />}
      snapshotConfig={IOTA_BONEYARD_SNAPSHOT_CONFIG}
    >
      <div className="sticky top-[53px] z-10 bg-background/95 backdrop-blur-sm border-b border-black/10 px-4 lg:px-6 py-2 flex items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="text-[9px] font-mono text-muted tracking-widest uppercase flex-shrink-0">Scope</div>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="h-7 border border-black/15 bg-background px-2 font-mono text-[11px] uppercase tracking-wider rounded-none max-w-[280px]"
          >
            <option value="all">All users</option>
            {data.users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.email || user.name || user.id}
              </option>
            ))}
          </select>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-[10px] font-mono text-muted tracking-wider">
          <span>{data.stats.userCount} users</span>
          <span>{data.stats.documentCount} docs</span>
          <span>{data.stats.jobCount} jobs</span>
          <span>{data.stats.recentMessageCount} msgs</span>
        </div>
      </div>
    </BoneyardSkeleton>
  );
}

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <AdminDataProvider>
      <AdminScopeFilter />
      {children}
    </AdminDataProvider>
  );
}
