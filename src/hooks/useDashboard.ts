// ─── useDashboard hook ─────────────────────────────────────────

"use client";

import { useState, useEffect, useCallback } from "react";
import { dashboardApi } from "@/lib/api/client";
import type { DashboardResponse } from "@/lib/api/types";

export function useDashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await dashboardApi.get();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    stats: data?.stats ?? null,
    recentDocuments: data?.recentDocuments ?? [],
    recentConversations: data?.recentConversations ?? [],
    loading,
    error,
    refetch: fetch,
  };
}
