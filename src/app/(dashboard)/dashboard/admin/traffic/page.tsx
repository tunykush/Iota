"use client";

import { useEffect, useMemo, useState } from "react";
import { Skeleton as BoneyardSkeleton } from "boneyard-js/react";
import { IOTA_BONEYARD_SNAPSHOT_CONFIG } from "@/components/dashboard/boneyard";
import { AdminTrafficFixture } from "../AdminSkeletonFixtures";
import {
  AdminGridBackground,
  AdminPageHeader,
  BlueprintLabel,
} from "../AdminShared";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";

/* ─── Types ─── */
type ModelQuota = {
  dailyRequests: number | null;
  dailyTokens: number | null;
  note: string;
  used: number;
  remaining: number | null;
  percent: number | null;
};

type ModelTraffic = {
  key: string;
  provider: string;
  model: string;
  totalRequests: number;
  last24h: number;
  last7d: number;
  last30d: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  lastUsed: string;
  uniqueUsers: number;
  errors: number;
  errorRate: number;
  quota: ModelQuota | null;
};

type ProviderSummary = {
  name: string;
  requests24h: number;
  requests7d: number;
  total: number;
  models: number;
  errors: number;
};

type TrafficData = {
  summary: {
    totalMessages: number;
    last24h: number;
    last7d: number;
    uniqueModels: number;
    uniqueProviders: number;
  };
  models: ModelTraffic[];
  providers: ProviderSummary[];
  hourlyTraffic: Record<string, number>;
};

/* ─── Constants ─── */
const CHART_INK = "#1f1f1f";
const CHART_MUTED = "#737373";
const CHART_SOFT = "#a3a3a3";
const CHART_FAINT = "#d4d4d4";

const PROVIDER_COLORS: Record<string, string> = {
  groq: "#1f1f1f",
  gemini: "#525252",
  openrouter: "#737373",
  zai: "#a3a3a3",
  deepseek: "#d4d4d4",
  unknown: "#e5e5e5",
};

/* ─── Helpers ─── */
function formatDate(value?: string) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function QuotaBar({ percent, remaining, limit }: { percent: number | null; remaining: number | null; limit: number | null }) {
  if (percent === null || limit === null) return <span className="text-[10px] text-muted font-mono">No limit tracked</span>;
  const color = percent > 80 ? "bg-neutral-900" : percent > 50 ? "bg-neutral-700" : "bg-neutral-500";
  return (
    <div className="space-y-1.5">
      <div className="h-2.5 rounded-full border border-black/10 bg-black/[0.03] overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${Math.min(100, Math.max(2, percent))}%` }} />
      </div>
      <div className="flex justify-between text-[10px] font-mono text-muted">
        <span>{percent}% used ({limit?.toLocaleString()} limit)</span>
        <span>{remaining?.toLocaleString()} remaining</span>
      </div>
    </div>
  );
}

/* ─── Custom Tooltip ─── */
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-black/15 bg-background/95 backdrop-blur-sm px-3 py-2 shadow-lg">
      <div className="text-[10px] font-mono text-muted uppercase tracking-wider mb-1">{label}</div>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted">{entry.name}:</span>
          <span className="font-mono font-medium">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Main Page ─── */
export default function AdminTrafficPage() {
  const [data, setData] = useState<TrafficData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/traffic")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => { setData(json); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  /* ─── Derived chart data ─── */
  const hourlyChartData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.hourlyTraffic).map(([hour, count]) => ({
      hour,
      requests: count,
    }));
  }, [data]);

  const providerPieData = useMemo(() => {
    if (!data) return [];
    return data.providers.map((p) => ({
      name: p.name,
      value: p.requests24h,
      color: PROVIDER_COLORS[p.name] ?? "#6b7280",
    }));
  }, [data]);

  const modelBarData = useMemo(() => {
    if (!data) return [];
    return data.models.slice(0, 8).map((m) => ({
      name: m.model.length > 20 ? `${m.model.slice(0, 18)}…` : m.model,
      fullName: m.model,
      "24h": m.last24h,
      "7d": m.last7d,
      total: m.totalRequests,
    }));
  }, [data]);

  const modelShareData = useMemo(() => {
    if (!data) return [];
    return data.models.slice(0, 5).map((m, index) => ({
      name: m.model.length > 22 ? `${m.model.slice(0, 20)}…` : m.model,
      fullName: m.model,
      value: m.totalRequests,
      requests24h: m.last24h,
      requests7d: m.last7d,
      fill: ["#1f1f1f", "#525252", "#737373", "#a3a3a3", "#d4d4d4"][index] ?? "#e5e5e5",
    }));
  }, [data]);

  const modelRadialData = useMemo(() => {
    const max = Math.max(...modelShareData.map((model) => model.value), 1);
    return modelShareData.map((model) => ({
      ...model,
      percentage: Math.max(4, Math.round((model.value / max) * 100)),
    }));
  }, [modelShareData]);

  const latencyBarData = useMemo(() => {
    if (!data) return [];
    return data.models
      .filter((m) => m.avgLatencyMs > 0)
      .slice(0, 8)
      .map((m) => ({
        name: m.model.length > 18 ? `${m.model.slice(0, 16)}…` : m.model,
        avg: m.avgLatencyMs,
        p95: m.p95LatencyMs,
      }));
  }, [data]);

  return (
    <BoneyardSkeleton
      name="admin-traffic-page"
      loading={loading}
      fixture={<AdminTrafficFixture />}
      snapshotConfig={IOTA_BONEYARD_SNAPSHOT_CONFIG}
    >
      <AdminGridBackground>
        {error ? (
          <div className="border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            Failed to load traffic data: {error}
          </div>
        ) : data ? (
          <>
            {/* ── Header ── */}
            <AdminPageHeader
              label="Model traffic & quotas"
              title="LLM Provider Dashboard"
              description="Real-time traffic monitoring, quota usage, and performance metrics across all configured LLM providers."
            >
              <div className="flex gap-6">
                <div className="text-right">
                  <div className="font-mono text-2xl">{data.summary.uniqueProviders}</div>
                  <BlueprintLabel>providers</BlueprintLabel>
                </div>
                <div className="text-right">
                  <div className="font-mono text-2xl">{data.summary.uniqueModels}</div>
                  <BlueprintLabel>models</BlueprintLabel>
                </div>
              </div>
            </AdminPageHeader>

            {/* ── KPI Cards ── */}
            <section className="grid border border-black/15 bg-background/75 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ["Total Requests", data.summary.totalMessages, "all time"],
                ["Last 24h", data.summary.last24h, "requests"],
                ["Last 7d", data.summary.last7d, "requests"],
                ["Providers", data.summary.uniqueProviders, "active"],
                ["Models", data.summary.uniqueModels, "in use"],
              ].map(([label, value, note]) => (
                <div key={String(label)} className="relative border-b border-r border-black/10 p-5 last:border-r-0 group hover:bg-black/[0.02] transition-colors">
                  <BlueprintLabel>{String(label)}</BlueprintLabel>
                  <div className="mt-7 font-display text-4xl leading-none tracking-tight">{String(value)}</div>
                  <div className="mt-2 text-[11px] uppercase tracking-wider text-muted">{String(note)}</div>
                </div>
              ))}
            </section>

            {/* ── Row: Area Chart + Donut ── */}
            <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
              {/* Hourly Traffic Area Chart */}
              <div className="border border-black/15 bg-background/80 p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <BlueprintLabel>Traffic pattern</BlueprintLabel>
                    <h2 className="mt-1 font-display text-xl">Hourly Requests (24h)</h2>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-2xl">{data.summary.last24h}</div>
                    <BlueprintLabel>total / 24h</BlueprintLabel>
                  </div>
                </div>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={hourlyChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_INK} stopOpacity={0.22} />
                          <stop offset="95%" stopColor={CHART_INK} stopOpacity={0.015} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                      <XAxis
                        dataKey="hour"
                        tick={{ fontSize: 10, fontFamily: "monospace", fill: "#9ca3af" }}
                        tickLine={false}
                        axisLine={{ stroke: "rgba(0,0,0,0.1)" }}
                        interval={3}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fontFamily: "monospace", fill: "#9ca3af" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="requests"
                        stroke={CHART_INK}
                        strokeWidth={2}
                        fill="url(#trafficGradient)"
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Provider Distribution Donut */}
              <div className="border border-black/15 bg-background/80 p-5">
                <div className="mb-4">
                  <BlueprintLabel>Distribution</BlueprintLabel>
                  <h2 className="mt-1 font-display text-xl">By Provider (24h)</h2>
                </div>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={providerPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {providerPieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="border border-black/15 bg-background/95 backdrop-blur-sm px-3 py-2 shadow-lg">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                                <span className="font-medium capitalize">{d.name}</span>
                                <span className="font-mono text-muted ml-auto">{d.value} req</span>
                              </div>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend */}
                <div className="mt-2 space-y-1.5">
                  {providerPieData.map((p) => (
                    <div key={p.name} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="capitalize flex-1">{p.name}</span>
                      <span className="font-mono text-muted">{p.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Model Mix Dashboard Card ── */}
            <section className="grid gap-4 xl:grid-cols-[1fr_410px]">
              <div className="border border-black/15 bg-background/80">
                <div className="flex h-14 items-center justify-between border-b border-black/10 px-5">
                  <div>
                    <BlueprintLabel>Model demand</BlueprintLabel>
                    <h2 className="font-display text-lg">Requests by Model</h2>
                  </div>
                  <div className="hidden items-center gap-4 text-[10px] font-mono text-muted sm:flex">
                    <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-neutral-900" /> total</span>
                    <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-neutral-500" /> 7d</span>
                    <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-neutral-300" /> 24h</span>
                  </div>
                </div>

                <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="flex min-h-[300px] flex-col justify-between border-b border-black/10 p-5 lg:border-b-0 lg:border-r">
                    <div>
                      <div className="font-mono text-4xl tracking-tight">{data.summary.totalMessages}</div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-muted">total model calls</div>
                    </div>

                    <div className="mt-6 grid grid-cols-3 border border-black/10">
                      <div className="border-r border-black/10 p-3">
                        <div className="font-mono text-xl">{data.summary.last24h}</div>
                        <div className="mt-1 text-[10px] uppercase tracking-wider text-muted">24h</div>
                      </div>
                      <div className="border-r border-black/10 p-3">
                        <div className="font-mono text-xl">{data.summary.last7d}</div>
                        <div className="mt-1 text-[10px] uppercase tracking-wider text-muted">7d</div>
                      </div>
                      <div className="p-3">
                        <div className="font-mono text-xl">{data.summary.uniqueModels}</div>
                        <div className="mt-1 text-[10px] uppercase tracking-wider text-muted">models</div>
                      </div>
                    </div>

                    <div className="mt-6 space-y-2">
                      {modelShareData.slice(0, 4).map((model) => {
                        const maxTotal = Math.max(...modelShareData.map((item) => item.value), 1);
                        return (
                          <div key={model.fullName} className="space-y-1">
                            <div className="flex items-center justify-between gap-3 text-xs">
                              <span className="truncate">{model.name}</span>
                              <span className="font-mono text-muted">{model.value}</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.05]">
                              <div className="h-full rounded-full bg-neutral-900" style={{ width: `${Math.max(4, (model.value / maxTotal) * 100)}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="grid gap-4 lg:grid-cols-[260px_1fr] lg:items-center">
                      <div className="relative mx-auto h-[260px] w-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadialBarChart
                            data={modelRadialData}
                            innerRadius="32%"
                            outerRadius="96%"
                            startAngle={90}
                            endAngle={-270}
                            barSize={13}
                          >
                            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                            <RadialBar
                              dataKey="percentage"
                              cornerRadius={999}
                              background={{ fill: "rgba(0,0,0,0.045)" }}
                            />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const d = payload[0].payload;
                                return (
                                  <div className="border border-black/15 bg-background/95 px-3 py-2 text-xs shadow-lg">
                                    <div className="font-medium">{d.fullName}</div>
                                    <div className="mt-1 font-mono text-muted">{d.value} total requests</div>
                                  </div>
                                );
                              }}
                            />
                          </RadialBarChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                          <span className="font-mono text-3xl">{modelRadialData[0]?.value ?? 0}</span>
                          <span className="text-[9px] uppercase tracking-wider text-muted">top model</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {modelRadialData.map((model, index) => (
                          <div key={model.fullName} className="grid grid-cols-[28px_1fr_auto] items-center gap-3 border-b border-black/10 pb-3 last:border-b-0">
                            <div className="font-mono text-[10px] text-muted">#{index + 1}</div>
                            <div className="min-w-0">
                              <div className="truncate text-xs font-medium">{model.fullName}</div>
                              <div className="mt-1 flex items-center gap-2">
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.045]">
                                  <div
                                    className="h-full rounded-full"
                                    style={{ width: `${model.percentage}%`, backgroundColor: model.fill }}
                                  />
                                </div>
                                <span className="font-mono text-[10px] text-muted">{model.percentage}%</span>
                              </div>
                            </div>
                            <div className="text-right font-mono text-xs">{model.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-black/15 bg-background/80">
                <div className="flex h-14 items-center justify-between border-b border-black/10 px-5">
                  <h2 className="font-display text-lg">Model Share</h2>
                  <BlueprintLabel>top 5</BlueprintLabel>
                </div>

                <div className="p-5">
                  <div className="mb-5 grid grid-cols-3 border border-black/10">
                    <div className="border-r border-black/10 p-3">
                      <div className="font-mono text-2xl leading-none">{modelShareData.reduce((sum, item) => sum + item.value, 0)}</div>
                      <div className="mt-1 text-[9px] uppercase tracking-wider text-muted">top calls</div>
                    </div>
                    <div className="border-r border-black/10 p-3">
                      <div className="font-mono text-2xl leading-none">{modelShareData[0]?.value ?? 0}</div>
                      <div className="mt-1 text-[9px] uppercase tracking-wider text-muted">leader</div>
                    </div>
                    <div className="p-3">
                      <div className="font-mono text-2xl leading-none">{modelShareData.length}</div>
                      <div className="mt-1 text-[9px] uppercase tracking-wider text-muted">models</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {modelShareData.map((model, index) => {
                      const total = Math.max(modelShareData.reduce((sum, item) => sum + item.value, 0), 1);
                      const percent = Math.round((model.value / total) * 100);
                      return (
                        <div key={model.fullName} className="space-y-2">
                          <div className="grid grid-cols-[28px_1fr_auto] items-start gap-3">
                            <div className="font-mono text-[10px] text-muted">#{index + 1}</div>
                            <div className="min-w-0">
                              <div className="truncate text-xs font-medium">{model.fullName}</div>
                              <div className="font-mono text-[10px] text-muted">24h {model.requests24h} · 7d {model.requests7d}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-xs">{model.value}</div>
                              <div className="font-mono text-[10px] text-muted">{percent}%</div>
                            </div>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-black/[0.045]">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.max(4, percent)}%`, backgroundColor: model.fill }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            {/* ── Latency Chart ── */}
            {latencyBarData.length > 0 && (
              <section className="border border-black/15 bg-background/80 p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <BlueprintLabel>Performance</BlueprintLabel>
                    <h2 className="mt-1 font-display text-xl">Response Latency (ms)</h2>
                  </div>
                  <div className="flex gap-4 text-[10px] font-mono text-muted">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-neutral-500" /> avg</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-neutral-900" /> p95</span>
                  </div>
                </div>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={latencyBarData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }} barCategoryGap="25%">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10, fontFamily: "monospace", fill: "#9ca3af" }}
                        tickLine={false}
                        axisLine={{ stroke: "rgba(0,0,0,0.1)" }}
                        unit="ms"
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 9, fontFamily: "monospace", fill: "#9ca3af" }}
                        tickLine={false}
                        axisLine={false}
                        width={130}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="avg" fill={CHART_MUTED} radius={[0, 3, 3, 0]} name="Avg latency" />
                      <Bar dataKey="p95" fill={CHART_INK} radius={[0, 3, 3, 0]} name="P95 latency" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            {/* ── Provider Cards ── */}
            <section>
              <div className="mb-4">
                <BlueprintLabel>Provider overview</BlueprintLabel>
                <h2 className="mt-1 font-display text-xl">Provider Traffic Summary</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {data.providers.map((provider) => {
                  const color = PROVIDER_COLORS[provider.name] ?? "#6b7280";
                  return (
                    <div key={provider.name} className="border border-black/15 bg-background/80 p-5 hover:border-black/25 transition-colors">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                          <h3 className="font-display text-lg capitalize">{provider.name}</h3>
                        </div>
                        <span className="text-[10px] font-mono text-muted border border-black/15 px-2 py-0.5 rounded-sm">
                          {provider.models} model{provider.models > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="font-mono text-2xl tracking-tight">{provider.requests24h}</div>
                          <div className="text-[10px] font-mono text-muted uppercase tracking-wider mt-1">24h</div>
                        </div>
                        <div>
                          <div className="font-mono text-2xl tracking-tight">{provider.requests7d}</div>
                          <div className="text-[10px] font-mono text-muted uppercase tracking-wider mt-1">7d</div>
                        </div>
                        <div>
                          <div className="font-mono text-2xl tracking-tight">{provider.total}</div>
                          <div className="text-[10px] font-mono text-muted uppercase tracking-wider mt-1">total</div>
                        </div>
                      </div>
                      {provider.errors > 0 && (
                        <div className="mt-3 flex items-center gap-1.5 text-[11px] font-mono text-red-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          {provider.errors} error{provider.errors > 1 ? "s" : ""} detected
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ── Model Detail Cards with Quota Bars ── */}
            <section>
              <div className="mb-4">
                <BlueprintLabel>Model-level metrics</BlueprintLabel>
                <h2 className="mt-1 font-display text-xl">Model Traffic & Quota Status</h2>
              </div>
              <div className="space-y-3">
                {data.models.map((model) => {
                  const provColor = PROVIDER_COLORS[model.provider] ?? "#6b7280";
                  return (
                    <div key={model.key} className="border border-black/15 bg-background/80 p-5 hover:border-black/25 transition-colors">
                      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className="flex items-center gap-1.5 border border-black/15 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded-sm">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: provColor }} />
                              {model.provider}
                            </span>
                            <h3 className="font-medium text-sm">{model.model}</h3>
                            {model.errorRate > 0 && (
                              <span className="text-[10px] font-mono text-red-600 border border-red-200 bg-red-50 px-2 py-0.5 rounded-sm">
                                {model.errorRate}% errors
                              </span>
                            )}
                          </div>

                          {/* Stats grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                            <div className="border border-black/8 p-2 rounded-sm">
                              <div className="font-mono text-lg leading-none">{model.last24h}</div>
                              <div className="text-[9px] font-mono text-muted uppercase tracking-wider mt-1">24h</div>
                            </div>
                            <div className="border border-black/8 p-2 rounded-sm">
                              <div className="font-mono text-lg leading-none">{model.last7d}</div>
                              <div className="text-[9px] font-mono text-muted uppercase tracking-wider mt-1">7d</div>
                            </div>
                            <div className="border border-black/8 p-2 rounded-sm">
                              <div className="font-mono text-lg leading-none">{model.avgLatencyMs}<span className="text-[10px] text-muted">ms</span></div>
                              <div className="text-[9px] font-mono text-muted uppercase tracking-wider mt-1">avg latency</div>
                            </div>
                            <div className="border border-black/8 p-2 rounded-sm">
                              <div className="font-mono text-lg leading-none">{model.uniqueUsers}</div>
                              <div className="text-[9px] font-mono text-muted uppercase tracking-wider mt-1">users</div>
                            </div>
                          </div>

                          {/* Quota bar */}
                          {model.quota && (
                            <div className="mt-2">
                              <div className="text-[10px] font-mono text-muted mb-1.5">{model.quota.note}</div>
                              <QuotaBar
                                percent={model.quota.percent}
                                remaining={model.quota.remaining}
                                limit={model.quota.dailyRequests}
                              />
                            </div>
                          )}
                        </div>

                        {/* Right side: big number */}
                        <div className="flex flex-col items-end justify-center gap-1 min-w-[130px]">
                          {model.quota?.dailyRequests ? (
                            <>
                              <div className="font-mono text-3xl tracking-tight">
                                {model.quota.remaining?.toLocaleString() ?? "∞"}
                              </div>
                              <BlueprintLabel>remaining / day</BlueprintLabel>
                            </>
                          ) : (
                            <>
                              <div className="font-mono text-3xl tracking-tight">{model.totalRequests}</div>
                              <BlueprintLabel>total requests</BlueprintLabel>
                            </>
                          )}
                          <div className="mt-2 text-[10px] font-mono text-muted">
                            last: {formatDate(model.lastUsed)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {data.models.length === 0 && (
                  <div className="border border-black/15 bg-background/80 p-10 text-center">
                    <div className="text-3xl mb-3 opacity-30">📡</div>
                    <div className="text-sm text-muted">No model traffic recorded yet.</div>
                    <div className="text-xs text-muted mt-1">Start a chat to generate traffic data.</div>
                  </div>
                )}
              </div>
            </section>
          </>
        ) : null}
      </AdminGridBackground>
    </BoneyardSkeleton>
  );
}
