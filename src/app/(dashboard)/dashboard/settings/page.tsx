"use client";

import { CustomSelect } from "@/components/ui";

const GENERAL_SETTINGS = [
  {
    id: "workspace-name",
    label: "Workspace name",
    type: "input",
    value: "My Knowledge Workspace",
    helper: "Used as the dashboard and knowledge base name.",
  },
  {
    id: "default-language",
    label: "Default language",
    type: "select",
    value: "Auto-detect",
    options: ["English", "Vietnamese", "Auto-detect"],
    helper: "Controls the chatbot response language unless a chat asks otherwise.",
  },
  {
    id: "timezone",
    label: "Timezone",
    type: "select",
    value: "Auto-detect",
    options: ["Auto-detect", "Australia/Sydney", "Asia/Ho_Chi_Minh", "UTC"],
    helper: "Used for logs, uploaded dates, and scraped dates.",
  },
] as const;

const CHAT_SETTINGS = [
  {
    id: "answer-style",
    label: "Default answer style",
    value: "Detailed",
    options: ["Concise", "Detailed", "Academic", "Technical"],
    helper: "Sets whether answers should be short, expanded, academic, or implementation-focused.",
  },
  {
    id: "citation-mode",
    label: "Citation mode",
    value: "Always show sources",
    options: ["Always show sources", "Show only when needed", "Hide sources"],
    helper: "RAG should default to visible sources so users can verify answers.",
  },
] as const;

const KNOWLEDGE_SETTINGS = [
  {
    id: "knowledge-scope",
    label: "Default knowledge scope",
    value: "All documents",
    options: ["All documents", "PDFs only", "Websites only", "Selected collections"],
    helper: "Defines where the AI searches by default when answering.",
  },
  {
    id: "processing-preference",
    label: "Processing preference",
    value: "Balanced",
    options: ["Fast", "Balanced", "High accuracy"],
    helper: "Fast chunks quickly. High accuracy cleans text and chunks more carefully.",
  },
] as const;

const TOGGLES = [
  {
    group: "Chat memory",
    items: [
      ["Remember previous messages in same chat", true],
      ["Do not use chat history", false],
    ],
  },
  {
    group: "Automation",
    items: [
      ["Auto-title chats", true],
      ["Auto-save uploads", true],
    ],
  },
  {
    group: "Notifications",
    items: [
      ["Notify when PDF processing is complete", true],
      ["Notify when website scraping fails", true],
      ["Notify when embedding is complete", false],
    ],
  },
] as const;

const SYSTEM_DEFAULTS = [
  ["LLM provider", "OpenAI / Ollama-compatible"],
  ["Embedding model", "1536-d vector adapter"],
  ["Retrieval depth", "top_k = 5"],
  ["Persistence", "UI mock only in Phase 1"],
] as const;

function FieldCard({ setting }: { setting: (typeof GENERAL_SETTINGS)[number] }) {
  return (
    <div className="border border-black/10 bg-surface/70 p-4">
      <label className="auth-label" htmlFor={setting.id}>{setting.label}</label>
      {setting.type === "input" ? (
        <input id={setting.id} className="auth-input" defaultValue={setting.value} />
      ) : (
        <CustomSelect id={setting.id} value={setting.value} options={setting.options} />
      )}
      <p className="text-xs leading-relaxed text-muted mt-2">{setting.helper}</p>
    </div>
  );
}

function SelectCard({ setting }: { setting: (typeof CHAT_SETTINGS)[number] | (typeof KNOWLEDGE_SETTINGS)[number] }) {
  return (
    <div className="border border-black/10 bg-surface/70 p-4">
      <label className="auth-label" htmlFor={setting.id}>{setting.label}</label>
      <CustomSelect id={setting.id} value={setting.value} options={setting.options} />
      <p className="text-xs leading-relaxed text-muted mt-2">{setting.helper}</p>
    </div>
  );
}

function TogglePill({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border border-black/10 bg-surface/70 p-4">
      <span className="text-sm font-medium">{label}</span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
          enabled ? "border-foreground bg-foreground" : "border-black/20 bg-white"
        }`}
        aria-label={`${label} ${enabled ? "enabled" : "disabled"}`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full transition-transform ${
            enabled ? "left-6 bg-background" : "left-1 bg-muted"
          }`}
        />
      </span>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-4 h-px bg-accent" />
        <span className="section-label text-[10px]">Settings</span>
        <span className="text-muted text-[10px] font-mono">Phase 1 UI</span>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight mb-1">
            General settings<span className="text-accent">.</span>
          </h1>
          <p className="text-sm text-muted max-w-2xl">
            User-facing defaults for workspace identity, chat behavior, knowledge search, uploads, and notifications. These controls are static for now and ready for persistence later.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-muted">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Mock preferences
        </div>
      </div>

      <section className="dash-card p-5 lg:p-6 mb-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">
          <div>
            <p className="section-label text-[10px] mb-2">General</p>
            <h2 className="font-display text-xl font-medium tracking-tight">Workspace defaults</h2>
          </div>
          <p className="text-xs text-muted max-w-sm">Naming, language, and time settings used across dashboard views.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {GENERAL_SETTINGS.map((setting) => (
            <FieldCard key={setting.id} setting={setting} />
          ))}
        </div>
      </section>

      <section className="grid lg:grid-cols-[1fr_0.86fr] gap-4 mb-4">
        <div className="dash-card p-5 lg:p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <p className="section-label text-[10px] mb-2">Chat behavior</p>
              <h2 className="font-display text-xl font-medium tracking-tight">Answer and source rules</h2>
              <p className="text-sm text-muted mt-1">Controls how the assistant responds before a user overrides it in a specific chat.</p>
            </div>
            <span className="border border-black/10 bg-surface px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-muted">
              RAG first
            </span>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {CHAT_SETTINGS.map((setting) => (
              <SelectCard key={setting.id} setting={setting} />
            ))}
          </div>
        </div>

        <div className="dash-card p-5 lg:p-6">
          <p className="section-label text-[10px] mb-2">Memory</p>
          <h2 className="font-display text-xl font-medium tracking-tight mb-4">Chat memory</h2>
          <div className="space-y-3">
            {TOGGLES[0].items.map(([label, enabled]) => (
              <TogglePill key={label} label={label} enabled={enabled} />
            ))}
          </div>
          <p className="text-xs text-muted leading-relaxed mt-4">
            This is separate from the RAG knowledge base. It only decides whether previous turns in the same chat influence the next response.
          </p>
        </div>
      </section>

      <section className="grid lg:grid-cols-[0.86fr_1fr] gap-4 mb-4">
        <div className="dash-card p-5 lg:p-6">
          <p className="section-label text-[10px] mb-2">Automation</p>
          <h2 className="font-display text-xl font-medium tracking-tight mb-4">Chat and upload defaults</h2>
          <div className="space-y-3">
            {TOGGLES[1].items.map(([label, enabled]) => (
              <TogglePill key={label} label={label} enabled={enabled} />
            ))}
          </div>
        </div>

        <div className="dash-card p-5 lg:p-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">
            <div>
              <p className="section-label text-[10px] mb-2">Knowledge defaults</p>
              <h2 className="font-display text-xl font-medium tracking-tight">Search and processing</h2>
            </div>
            <p className="text-xs text-muted max-w-xs">Selected collections can stay disabled until collection management exists.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {KNOWLEDGE_SETTINGS.map((setting) => (
              <SelectCard key={setting.id} setting={setting} />
            ))}
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-[1fr_0.78fr] gap-4 mb-4">
        <div className="dash-card p-5 lg:p-6">
          <p className="section-label text-[10px] mb-2">Notifications</p>
          <h2 className="font-display text-xl font-medium tracking-tight mb-4">Processing alerts</h2>
          <div className="grid md:grid-cols-3 gap-3">
            {TOGGLES[2].items.map(([label, enabled]) => (
              <TogglePill key={label} label={label} enabled={enabled} />
            ))}
          </div>
        </div>

        <div className="dash-card overflow-hidden">
          <div className="p-5 border-b border-black/10">
            <p className="section-label text-[10px] mb-2">System defaults</p>
            <h2 className="font-display text-xl font-medium tracking-tight">Read-only setup</h2>
            <p className="text-sm text-muted mt-1">Technical settings stay visible for transparency, but backend wiring comes later.</p>
          </div>
          <div className="divide-y divide-black/10">
            {SYSTEM_DEFAULTS.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 p-4">
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs text-muted font-mono text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Account section ── */}
      <section className="grid lg:grid-cols-[1fr_0.9fr] gap-4 mb-4">
        {/* Profile info */}
        <div className="dash-card p-5 lg:p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <p className="section-label text-[10px] mb-2">Account</p>
              <h2 className="font-display text-xl font-medium tracking-tight">Profile information</h2>
              <p className="text-sm text-muted mt-1">Display name and email shown across the dashboard.</p>
            </div>
            <span className="border border-black/10 bg-surface px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-muted shrink-0">
              Mock
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <div className="border border-black/10 bg-surface/70 p-4">
              <label className="auth-label" htmlFor="profile-name">Display name</label>
              <input id="profile-name" className="auth-input" defaultValue="Ada Lovelace" />
            </div>
            <div className="border border-black/10 bg-surface/70 p-4">
              <label className="auth-label" htmlFor="profile-email">Email address</label>
              <input id="profile-email" className="auth-input" type="email" defaultValue="ada@example.com" />
              <p className="text-xs text-muted mt-2">Used for login and notifications.</p>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="button" className="dash-btn-primary">Update profile</button>
          </div>
        </div>

        {/* Change password */}
        <div className="dash-card p-5 lg:p-6">
          <p className="section-label text-[10px] mb-2">Security</p>
          <h2 className="font-display text-xl font-medium tracking-tight mb-1">Change password</h2>
          <p className="text-sm text-muted mb-5">Minimum 8 characters. Use a mix of letters, numbers, and symbols.</p>
          <div className="space-y-3 mb-4">
            <div className="border border-black/10 bg-surface/70 p-4">
              <label className="auth-label" htmlFor="current-password">Current password</label>
              <input id="current-password" className="auth-input" type="password" placeholder="Enter current password" />
            </div>
            <div className="border border-black/10 bg-surface/70 p-4">
              <label className="auth-label" htmlFor="new-password">New password</label>
              <input id="new-password" className="auth-input" type="password" placeholder="At least 8 characters" />
            </div>
            <div className="border border-black/10 bg-surface/70 p-4">
              <label className="auth-label" htmlFor="confirm-password">Confirm new password</label>
              <input id="confirm-password" className="auth-input" type="password" placeholder="Repeat new password" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="button" className="dash-btn-primary">Update password</button>
          </div>
        </div>
      </section>

      {/* Danger zone */}
      <section className="dash-card mb-4 overflow-hidden">
        <div className="p-5 lg:p-6 border-b border-red-200/60 bg-red-50/30">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-red-500 mb-2">Danger zone</p>
          <h2 className="font-display text-xl font-medium tracking-tight">Account actions</h2>
          <p className="text-sm text-muted mt-1">These actions are permanent and cannot be undone. Proceed with caution.</p>
        </div>
        <div className="divide-y divide-black/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5">
            <div>
              <div className="text-sm font-medium mb-0.5">Export all data</div>
              <div className="text-xs text-muted">Download a ZIP of all your documents, chats, and settings.</div>
            </div>
            <button type="button" className="dash-btn shrink-0">Export data</button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5">
            <div>
              <div className="text-sm font-medium mb-0.5">Sign out of all devices</div>
              <div className="text-xs text-muted">Revoke all active sessions. You will need to log in again.</div>
            </div>
            <button type="button" className="dash-btn shrink-0">Sign out everywhere</button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5">
            <div>
              <div className="text-sm font-medium text-red-600 mb-0.5">Delete account</div>
              <div className="text-xs text-muted">Permanently delete your account, all documents, and knowledge base. This cannot be reversed.</div>
            </div>
            <button
              type="button"
              className="shrink-0 border border-red-300 bg-red-50 text-red-600 hover:bg-red-100 transition-colors px-3 py-1.5 text-xs font-medium rounded-sm"
            >
              Delete account
            </button>
          </div>
        </div>
      </section>

      <div className="dash-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-muted">
          Phase 1 scope: visual settings only. Saving, validation, and account persistence belong to the API/auth phase.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="dash-btn">Reset draft</button>
          <button type="button" className="dash-btn-primary">Save preferences</button>
        </div>
      </div>
    </div>
  );
}
