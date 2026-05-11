"use client";

import { Skeleton as BoneyardSkeleton } from "boneyard-js/react";
import { useEffect, useState } from "react";
import {
  DASHBOARD_OVERVIEW_EMPTY_STATS,
  DASHBOARD_OVERVIEW_FIXTURE_CONVERSATIONS,
  DASHBOARD_OVERVIEW_FIXTURE_DOCUMENTS,
  DASHBOARD_OVERVIEW_FIXTURE_STATS,
  DashboardOverviewSurface,
} from "@/components/dashboard/DashboardOverviewSurface";
import { IOTA_BONEYARD_SNAPSHOT_CONFIG } from "@/components/dashboard/boneyard";
import { useDashboard } from "@/hooks/useDashboard";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const { stats, recentDocuments, recentConversations, loading, error, refetch } = useDashboard();
  const [displayName, setDisplayName] = useState("there");

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      const currentUser = data.user;
      const firstName = currentUser?.user_metadata?.first_name as string | undefined;
      const fullName = currentUser?.user_metadata?.full_name as string | undefined;
      const emailName = currentUser?.email?.split("@")[0];

      setDisplayName(firstName?.trim() || fullName?.trim() || emailName || "there");
    });
  }, []);

  return (
    <BoneyardSkeleton
      name="dashboard-overview"
      loading={loading}
      fixture={
        <DashboardOverviewSurface
          displayName="Avery"
          stats={DASHBOARD_OVERVIEW_FIXTURE_STATS}
          recentDocuments={DASHBOARD_OVERVIEW_FIXTURE_DOCUMENTS}
          recentConversations={DASHBOARD_OVERVIEW_FIXTURE_CONVERSATIONS}
        />
      }
      snapshotConfig={IOTA_BONEYARD_SNAPSHOT_CONFIG}
    >
      <DashboardOverviewSurface
        displayName={displayName}
        stats={loading ? DASHBOARD_OVERVIEW_FIXTURE_STATS : stats ?? DASHBOARD_OVERVIEW_EMPTY_STATS}
        recentDocuments={loading ? DASHBOARD_OVERVIEW_FIXTURE_DOCUMENTS : recentDocuments}
        recentConversations={loading ? DASHBOARD_OVERVIEW_FIXTURE_CONVERSATIONS : recentConversations}
        error={loading ? null : error}
        onRetry={refetch}
      />
    </BoneyardSkeleton>
  );
}
