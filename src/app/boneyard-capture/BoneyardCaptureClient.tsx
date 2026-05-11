"use client";

import { Skeleton as BoneyardSkeleton } from "boneyard-js/react";
import { AdminTelemetrySurface } from "@/app/(dashboard)/dashboard/admin/AdminTelemetryClient";
import { ADMIN_TELEMETRY_FIXTURE } from "@/app/(dashboard)/dashboard/admin/adminTelemetryFixture";
import { ChatWorkspaceFixture } from "@/components/dashboard/ChatWorkspaceFixture";
import { DashboardUserCardFixture, DashboardWorkspaceBadgeFixture } from "@/components/dashboard/DashboardSidebarFixtures";
import { SettingsFixture } from "@/components/dashboard/SettingsFixture";
import {
  DASHBOARD_OVERVIEW_FIXTURE_CONVERSATIONS,
  DASHBOARD_OVERVIEW_FIXTURE_DOCUMENTS,
  DASHBOARD_OVERVIEW_FIXTURE_STATS,
  DashboardOverviewSurface,
} from "@/components/dashboard/DashboardOverviewSurface";
import { DOCUMENTS_FIXTURE, DocumentsSurface } from "@/components/dashboard/DocumentsSurface";
import { IOTA_BONEYARD_SNAPSHOT_CONFIG } from "@/components/dashboard/boneyard";

export function BoneyardCaptureClient() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="w-[220px] border-r border-black/10">
        <div className="px-5 py-3">
          <BoneyardSkeleton
            name="dashboard-workspace-badge"
            loading={false}
            fixture={<DashboardWorkspaceBadgeFixture />}
            snapshotConfig={IOTA_BONEYARD_SNAPSHOT_CONFIG}
          >
            <DashboardWorkspaceBadgeFixture />
          </BoneyardSkeleton>
        </div>
        <BoneyardSkeleton
          name="dashboard-user-card"
          loading={false}
          fixture={<DashboardUserCardFixture />}
          snapshotConfig={IOTA_BONEYARD_SNAPSHOT_CONFIG}
        >
          <DashboardUserCardFixture />
        </BoneyardSkeleton>
      </div>

      <BoneyardSkeleton
        name="dashboard-overview"
        loading={false}
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
          displayName="Avery"
          stats={DASHBOARD_OVERVIEW_FIXTURE_STATS}
          recentDocuments={DASHBOARD_OVERVIEW_FIXTURE_DOCUMENTS}
          recentConversations={DASHBOARD_OVERVIEW_FIXTURE_CONVERSATIONS}
        />
      </BoneyardSkeleton>

      <BoneyardSkeleton
        name="documents-registry"
        loading={false}
        fixture={<DocumentsSurface documents={DOCUMENTS_FIXTURE} />}
        snapshotConfig={IOTA_BONEYARD_SNAPSHOT_CONFIG}
      >
        <DocumentsSurface documents={DOCUMENTS_FIXTURE} />
      </BoneyardSkeleton>

      <BoneyardSkeleton
        name="chat-workspace"
        loading={false}
        fixture={<ChatWorkspaceFixture />}
        snapshotConfig={IOTA_BONEYARD_SNAPSHOT_CONFIG}
      >
        <ChatWorkspaceFixture />
      </BoneyardSkeleton>

      <BoneyardSkeleton
        name="settings-page"
        loading={false}
        fixture={<SettingsFixture />}
        snapshotConfig={IOTA_BONEYARD_SNAPSHOT_CONFIG}
      >
        <SettingsFixture />
      </BoneyardSkeleton>

      <BoneyardSkeleton
        name="admin-telemetry"
        loading={false}
        fixture={
          <AdminTelemetrySurface
            data={ADMIN_TELEMETRY_FIXTURE}
            selectedUserId="all"
            setSelectedUserId={() => undefined}
          />
        }
        snapshotConfig={IOTA_BONEYARD_SNAPSHOT_CONFIG}
      >
        <AdminTelemetrySurface
          data={ADMIN_TELEMETRY_FIXTURE}
          selectedUserId="all"
          setSelectedUserId={() => undefined}
        />
      </BoneyardSkeleton>
    </main>
  );
}
