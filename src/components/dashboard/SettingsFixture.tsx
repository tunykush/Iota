"use client";

import { CustomSelect } from "@/components/ui";

const GENERAL_SETTINGS = [
  ["workspace-name", "Workspace name", "My Knowledge Workspace"],
  ["default-language", "Default language", "Auto-detect"],
  ["timezone", "Timezone", "Australia/Sydney"],
] as const;

const SELECT_SETTINGS = [
  ["answer-style", "Default answer style", "Detailed"],
  ["citation-mode", "Citation mode", "Always show sources"],
  ["knowledge-scope", "Default knowledge scope", "All documents"],
  ["processing-preference", "Processing preference", "Balanced"],
] as const;

const TOGGLES = [
  ["Remember previous messages in same chat", true],
  ["Auto-title chats", true],
  ["Notify when PDF processing is complete", true],
] as const;

export const SETTINGS_FIXTURE_PROFILE = {
  email: "avery@iota.local",
  name: "Avery Nguyen",
};

function FixtureField({ id, label, value }: { id: string; label: string; value: string }) {
  return (
    <div className="border border-black/10 bg-surface/70 p-4">
      <label className="auth-label" htmlFor={`fixture-${id}`}>{label}</label>
      <input id={`fixture-${id}`} className="auth-input" defaultValue={value} readOnly />
      <p className="mt-2 text-xs leading-relaxed text-muted">Default preference used across the workspace.</p>
    </div>
  );
}

function FixtureSelect({ id, label, value }: { id: string; label: string; value: string }) {
  return (
    <div className="border border-black/10 bg-surface/70 p-4">
      <label className="auth-label" htmlFor={`fixture-${id}`}>{label}</label>
      <CustomSelect id={`fixture-${id}`} value={value} options={["Auto-detect", "Detailed", "Balanced", "All documents", "Always show sources"]} />
      <p className="mt-2 text-xs leading-relaxed text-muted">Ready for persistence when settings API lands.</p>
    </div>
  );
}

function FixtureToggle({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border border-black/10 bg-surface/70 p-4">
      <span className="text-sm font-medium">{label}</span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full border ${enabled ? "border-foreground bg-foreground" : "border-black/20 bg-white"}`}>
        <span className={`absolute top-1 h-4 w-4 rounded-full ${enabled ? "left-6 bg-background" : "left-1 bg-muted"}`} />
      </span>
    </div>
  );
}

export function SettingsFixture() {
  return (
    <div className="mx-auto max-w-6xl p-4 lg:p-8">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-px w-4 bg-accent" />
        <span className="section-label text-[10px]">Settings</span>
        <span className="font-mono text-[10px] text-muted">Phase 1 UI</span>
      </div>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="mb-1 font-display text-2xl font-medium tracking-tight">
            General settings<span className="text-accent">.</span>
          </h1>
          <p className="max-w-2xl text-sm text-muted">
            User-facing defaults for workspace identity, chat behavior, knowledge search, uploads, and notifications.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Mock preferences
        </div>
      </div>

      <section className="dash-card mb-4 p-5 lg:p-6">
        <p className="section-label mb-2 text-[10px]">General</p>
        <h2 className="mb-5 font-display text-xl font-medium tracking-tight">Workspace defaults</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {GENERAL_SETTINGS.map(([id, label, value]) => (
            <FixtureField key={id} id={id} label={label} value={value} />
          ))}
        </div>
      </section>

      <section className="mb-4 grid gap-4 lg:grid-cols-[1fr_0.86fr]">
        <div className="dash-card p-5 lg:p-6">
          <p className="section-label mb-2 text-[10px]">Chat behavior</p>
          <h2 className="mb-5 font-display text-xl font-medium tracking-tight">Answer and source rules</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {SELECT_SETTINGS.slice(0, 2).map(([id, label, value]) => (
              <FixtureSelect key={id} id={id} label={label} value={value} />
            ))}
          </div>
        </div>
        <div className="dash-card p-5 lg:p-6">
          <p className="section-label mb-2 text-[10px]">Memory</p>
          <h2 className="mb-4 font-display text-xl font-medium tracking-tight">Chat memory</h2>
          <div className="space-y-3">
            {TOGGLES.map(([label, enabled]) => (
              <FixtureToggle key={label} label={label} enabled={enabled} />
            ))}
          </div>
        </div>
      </section>

      <section className="mb-4 grid gap-4 lg:grid-cols-[0.86fr_1fr]">
        <div className="dash-card p-5 lg:p-6">
          <p className="section-label mb-2 text-[10px]">Knowledge defaults</p>
          <h2 className="mb-5 font-display text-xl font-medium tracking-tight">Search and processing</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {SELECT_SETTINGS.slice(2).map(([id, label, value]) => (
              <FixtureSelect key={id} id={id} label={label} value={value} />
            ))}
          </div>
        </div>
        <div className="dash-card p-5 lg:p-6">
          <p className="section-label mb-2 text-[10px]">Account</p>
          <h2 className="mb-5 font-display text-xl font-medium tracking-tight">Profile information</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <FixtureField id="profile-name" label="Display name" value={SETTINGS_FIXTURE_PROFILE.name} />
            <FixtureField id="profile-email" label="Email address" value={SETTINGS_FIXTURE_PROFILE.email} />
          </div>
        </div>
      </section>
    </div>
  );
}
