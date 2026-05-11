"use client";

/** Shared UI primitives used across all admin sub-pages */

export function BlueprintLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted">{children}</div>;
}

export function EmptyLine({ label }: { label: string }) {
  return <div className="border-t border-black/10 px-4 py-6 text-xs text-muted">{label}</div>;
}

export function WrapText({ children }: { children: React.ReactNode }) {
  return <span className="min-w-0 break-words [overflow-wrap:anywhere]">{children}</span>;
}

export function BreakdownPanel({ title, rows }: { title: string; rows: Record<string, number> }) {
  const entries = Object.entries(rows).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, value]) => value), 1);

  return (
    <div className="border border-black/15 bg-background/80 p-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-display text-lg">{title}</h3>
        <BlueprintLabel>{entries.length} keys</BlueprintLabel>
      </div>
      <div className="mt-5 space-y-3">
        {entries.length === 0 ? (
          <div className="text-xs text-muted">No signal yet.</div>
        ) : (
          entries.map(([key, value]) => (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted">
                <span>{key}</span>
                <span>{value}</span>
              </div>
              <div className="h-2 border border-black/10 bg-black/[0.025]">
                <div className="h-full bg-foreground" style={{ width: `${Math.max(8, (value / max) * 100)}%` }} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function AdminPageHeader({
  label,
  title,
  description,
  children,
}: {
  label: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative border-b border-black/15 pb-6">
      <div className="absolute left-0 top-0 h-5 border-l border-black/30" />
      <div className="absolute right-0 bottom-0 h-5 border-r border-black/30" />
      <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-serif italic text-accent text-2xl">A.</span>
            <BlueprintLabel>{label}</BlueprintLabel>
          </div>
          <h1 className="mt-3 font-display text-3xl md:text-4xl font-medium tracking-tight">{title}</h1>
          {description && (
            <p className="mt-2 text-sm leading-6 text-foreground/65 max-w-xl">{description}</p>
          )}
        </div>
        {children && <div className="flex items-center gap-3">{children}</div>}
      </div>
    </section>
  );
}

export function formatDate(value?: string) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function shortId(value?: string) {
  if (!value) return "--";
  return value.length > 13 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}

export function stringifyMeta(value?: Record<string, unknown>) {
  if (!value || Object.keys(value).length === 0) return "{}";
  return JSON.stringify(value).slice(0, 180);
}

/** The blueprint grid background used on all admin pages */
export function AdminGridBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full max-w-full overflow-x-hidden bg-[linear-gradient(to_right,rgba(0,0,0,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.045)_1px,transparent_1px)] bg-[size:48px_48px]">
      <div className="max-w-full space-y-6 overflow-x-hidden p-4 lg:p-6">
        {children}
      </div>
    </div>
  );
}
