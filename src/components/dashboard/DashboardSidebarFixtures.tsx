export function DashboardWorkspaceBadgeFixture() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-sm bg-accent/15">
        <span className="font-serif text-xs italic text-accent">i</span>
      </div>
      <div className="min-w-0">
        <div className="truncate text-xs font-medium">Avery's workspace</div>
        <div className="font-mono text-[10px] tracking-wider text-muted">FREE PLAN</div>
      </div>
      <svg className="ml-auto h-3 w-3 flex-shrink-0 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}

export function DashboardUserCardFixture() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-3">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-foreground">
        <span className="text-[10px] font-medium text-background">A</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium">Avery Nguyen</div>
        <div className="truncate text-[10px] text-muted">avery@iota.local</div>
      </div>
      <svg className="h-3.5 w-3.5 flex-shrink-0 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
    </div>
  );
}
