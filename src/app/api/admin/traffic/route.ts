// GET /api/admin/traffic — admin-only model traffic & quota overview.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";

/** Known free-tier quota limits per provider (requests/day or tokens/day). */
const PROVIDER_QUOTAS: Record<string, { dailyRequests?: number; dailyTokens?: number; note: string }> = {
  "groq/llama-3.1-8b-instant": { dailyRequests: 14400, dailyTokens: 500000, note: "Free tier: 14.4k req/day, 500k tok/day" },
  "gemini/gemini-2.0-flash-lite": { dailyRequests: 1500, dailyTokens: 1000000, note: "Free tier: 1500 RPD, 1M tok/day" },
  "gemini/gemini-2.5-flash-lite": { dailyRequests: 1500, dailyTokens: 1000000, note: "Free tier: 1500 RPD, 1M tok/day" },
  "gemini/gemini-2.0-flash": { dailyRequests: 1500, dailyTokens: 1000000, note: "Free tier: 1500 RPD, 1M tok/day" },
  "openrouter/openai/gpt-oss-20b:free": { dailyRequests: 200, note: "Free model, ~200 req/day limit" },
  "openrouter/nvidia/nemotron-nano-9b-v2:free": { dailyRequests: 200, note: "Free model, ~200 req/day limit" },
  "openrouter/qwen/qwen3-next-80b-a3b-instruct:free": { dailyRequests: 200, note: "Free model, ~200 req/day limit" },
  "openrouter/z-ai/glm-4.5-air:free": { dailyRequests: 200, note: "Free model, ~200 req/day limit" },
  "zai/glm-4.5-flash": { dailyRequests: 1000, note: "Free tier: ~1000 req/day" },
  "zai/glm-4.7": { dailyRequests: 1000, note: "Free tier: ~1000 req/day" },
  "zai/glm-4.6": { dailyRequests: 1000, note: "Free tier: ~1000 req/day" },
  "zai/glm-4.5": { dailyRequests: 1000, note: "Free tier: ~1000 req/day" },
  "deepseek/deepseek-chat": { dailyTokens: 500000, note: "Paid: $0.14/M input, $0.28/M output" },
};

export async function GET() {
  try {
    await requireAdmin();
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "You must be signed in" } }, { status: 401 });
    }
    if (message === "FORBIDDEN") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access is required" } }, { status: 403 });
    }
    throw error;
  }

  const supabase = createAdminClient();

  // Fetch all assistant messages (they have model info)
  const { data: messages, error } = await supabase
    .from("conversation_messages")
    .select("id, user_id, role, model, metadata, created_at")
    .eq("role", "assistant")
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error) {
    return NextResponse.json({ error: { code: "DATABASE_ERROR", message: error.message } }, { status: 500 });
  }

  const allMessages = messages ?? [];
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  // Build per-model stats
  const modelMap = new Map<string, {
    provider: string;
    model: string;
    totalRequests: number;
    last24h: number;
    last7d: number;
    last30d: number;
    avgLatencyMs: number;
    latencies: number[];
    lastUsed: string;
    userIds: Set<string>;
    errors: number;
  }>();

  for (const msg of allMessages) {
    // Extract provider/model from metadata or model field
    const meta = (msg.metadata ?? {}) as Record<string, unknown>;
    const provider = (meta.provider as string) || "unknown";
    const model = msg.model || (meta.model as string) || "unknown";
    const key = `${provider}/${model}`;
    const latency = (meta.latencyMs as number) || 0;
    const isError = Boolean(meta.error);
    const ts = new Date(msg.created_at).getTime();

    if (!modelMap.has(key)) {
      modelMap.set(key, {
        provider,
        model,
        totalRequests: 0,
        last24h: 0,
        last7d: 0,
        last30d: 0,
        avgLatencyMs: 0,
        latencies: [],
        lastUsed: msg.created_at,
        userIds: new Set(),
        errors: 0,
      });
    }

    const entry = modelMap.get(key)!;
    entry.totalRequests++;
    if (ts >= oneDayAgo) entry.last24h++;
    if (ts >= sevenDaysAgo) entry.last7d++;
    if (ts >= thirtyDaysAgo) entry.last30d++;
    if (latency > 0) entry.latencies.push(latency);
    if (isError) entry.errors++;
    entry.userIds.add(msg.user_id);
    if (msg.created_at > entry.lastUsed) entry.lastUsed = msg.created_at;
  }

  // Compute averages and build response
  const models = Array.from(modelMap.entries())
    .map(([key, entry]) => {
      const avgLatency = entry.latencies.length > 0
        ? Math.round(entry.latencies.reduce((a, b) => a + b, 0) / entry.latencies.length)
        : 0;

      const quota = PROVIDER_QUOTAS[key];
      const dailyUsed = entry.last24h;
      const dailyLimit = quota?.dailyRequests;
      const quotaPercent = dailyLimit ? Math.round((dailyUsed / dailyLimit) * 100) : null;
      const quotaRemaining = dailyLimit ? Math.max(0, dailyLimit - dailyUsed) : null;

      return {
        key,
        provider: entry.provider,
        model: entry.model,
        totalRequests: entry.totalRequests,
        last24h: entry.last24h,
        last7d: entry.last7d,
        last30d: entry.last30d,
        avgLatencyMs: avgLatency,
        p95LatencyMs: entry.latencies.length > 0
          ? Math.round(entry.latencies.sort((a, b) => a - b)[Math.floor(entry.latencies.length * 0.95)] ?? 0)
          : 0,
        lastUsed: entry.lastUsed,
        uniqueUsers: entry.userIds.size,
        errors: entry.errors,
        errorRate: entry.totalRequests > 0 ? Math.round((entry.errors / entry.totalRequests) * 100) : 0,
        quota: quota ? {
          dailyRequests: dailyLimit ?? null,
          dailyTokens: quota.dailyTokens ?? null,
          note: quota.note,
          used: dailyUsed,
          remaining: quotaRemaining,
          percent: quotaPercent,
        } : null,
      };
    })
    .sort((a, b) => b.last24h - a.last24h);

  // Provider-level aggregation
  const providerMap = new Map<string, { requests24h: number; requests7d: number; total: number; models: number; errors: number }>();
  for (const m of models) {
    const p = providerMap.get(m.provider) ?? { requests24h: 0, requests7d: 0, total: 0, models: 0, errors: 0 };
    p.requests24h += m.last24h;
    p.requests7d += m.last7d;
    p.total += m.totalRequests;
    p.models++;
    p.errors += m.errors;
    providerMap.set(m.provider, p);
  }

  const providers = Array.from(providerMap.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.requests24h - a.requests24h);

  // Hourly traffic for last 24h
  const hourlyBuckets: Record<string, number> = {};
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now - i * 60 * 60 * 1000);
    const label = `${hour.getUTCHours().toString().padStart(2, "0")}:00`;
    hourlyBuckets[label] = 0;
  }
  for (const msg of allMessages) {
    const ts = new Date(msg.created_at).getTime();
    if (ts >= oneDayAgo) {
      const hour = new Date(ts);
      const label = `${hour.getUTCHours().toString().padStart(2, "0")}:00`;
      if (label in hourlyBuckets) hourlyBuckets[label]++;
    }
  }

  return NextResponse.json({
    summary: {
      totalMessages: allMessages.length,
      last24h: allMessages.filter((m) => new Date(m.created_at).getTime() >= oneDayAgo).length,
      last7d: allMessages.filter((m) => new Date(m.created_at).getTime() >= sevenDaysAgo).length,
      uniqueModels: models.length,
      uniqueProviders: providers.length,
    },
    models,
    providers,
    hourlyTraffic: hourlyBuckets,
  });
}
