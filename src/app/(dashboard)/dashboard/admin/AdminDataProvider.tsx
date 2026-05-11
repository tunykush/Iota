"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { adminApi } from "@/lib/api/client";
import type { AdminOverviewResponse } from "@/lib/api/types";
import { ADMIN_TELEMETRY_FIXTURE } from "./adminTelemetryFixture";

type AdminDataContextValue = {
  data: AdminOverviewResponse;
  loading: boolean;
  error: string | null;
  selectedUserId: string;
  setSelectedUserId: (id: string) => void;
  /** Data scoped to the selected user (or all if "all") */
  scoped: AdminOverviewResponse;
};

const AdminDataContext = createContext<AdminDataContextValue | null>(null);

export function useAdminData() {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error("useAdminData must be used within AdminDataProvider");
  return ctx;
}

export function AdminDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>("all");

  useEffect(() => {
    adminApi
      .overview()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load admin data"))
      .finally(() => setLoading(false));
  }, []);

  const resolvedData = data ?? ADMIN_TELEMETRY_FIXTURE;

  const scoped = useMemo(() => {
    if (selectedUserId === "all") return resolvedData;
    return {
      ...resolvedData,
      recentDocuments: resolvedData.recentDocuments.filter((item) => item.userId === selectedUserId),
      recentJobs: resolvedData.recentJobs.filter((item) => item.userId === selectedUserId),
      recentMessages: resolvedData.recentMessages.filter((item) => item.userId === selectedUserId),
      sampledChunks: resolvedData.sampledChunks.filter((item) => item.userId === selectedUserId),
      recentSources: resolvedData.recentSources.filter((item) => item.userId === selectedUserId),
      timeline: resolvedData.timeline.filter((item) => item.userId === selectedUserId),
    };
  }, [resolvedData, selectedUserId]);

  const value = useMemo<AdminDataContextValue>(
    () => ({ data: resolvedData, loading, error, selectedUserId, setSelectedUserId, scoped }),
    [resolvedData, loading, error, selectedUserId, scoped],
  );

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}
