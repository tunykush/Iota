// Global TypeScript types & interfaces
// Add shared types here to avoid duplication across components

// ─── Navigation ───────────────────────────────────────────────
export type NavLink = {
  label: string;
  href: string;
  badge?: string;
};

// ─── Chat / About section (homepage demo) ─────────────────────
export type ChatSource = {
  ix: string;   // e.g. "[1]"
  nm: string;   // file name
  meta: string; // page / row reference
};

export type ChatMessage =
  | { type: "user"; text: string }
  | { type: "bot"; text: string; sources?: ChatSource[] };

// ─── Chat workspace (dashboard) ───────────────────────────────
export type ChatRole = "user" | "assistant";

export type Citation = {
  index: number;       // [1], [2], ...
  sourceType: "pdf" | "url" | "db";
  title: string;       // file name or page title
  detail: string;      // "p. 3", "§2", "row 84", URL
  snippet?: string;    // optional preview of the matched chunk
  score?: number;      // retrieval confidence 0-1
};

export type Message = {
  id: string;
  role: ChatRole;
  content: string;
  citations?: Citation[];
  provider?: string;
  model?: string;
  diagnostics?: {
    mode: string;
    requestedTopK: number;
    returnedChunks: number;
    scopedDocumentIds: string[];
    sourceTitles: string[];
    topScore?: number;
  };
  timestamp: number;
  isStreaming?: boolean;
};

export type ChatState = "idle" | "loading" | "streaming" | "error" | "refusal";

// ─── Capabilities ─────────────────────────────────────────────
export type Capability = {
  number: string;
  label: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
};

// ─── Method steps ─────────────────────────────────────────────
export type MethodStep = {
  number: string;
  title: string;
  description: string;
  vis: React.ReactNode;
  hasArrow?: boolean;
};

// ─── Use cases (Labs) ─────────────────────────────────────────
export type UseCase = {
  number: string;
  year: string;
  type: string;
  title: string;
  description: string;
  glyph: string;
  bg: string;
};

// ─── Footer ───────────────────────────────────────────────────
export type FooterLink = {
  label: string;
  href: string;
};

export type FooterSection = {
  title: string;
  links: FooterLink[];
};
