// Global TypeScript types & interfaces
// Add shared types here to avoid duplication across components

// ─── Navigation ───────────────────────────────────────────────
export type NavLink = {
  label: string;
  href: string;
  badge?: string;
};

// ─── Chat / About section ─────────────────────────────────────
export type ChatSource = {
  ix: string;   // e.g. "[1]"
  nm: string;   // file name
  meta: string; // page / row reference
};

export type ChatMessage =
  | { type: "user"; text: string }
  | { type: "bot"; text: string; sources?: ChatSource[] };

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
