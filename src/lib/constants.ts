// App-wide constants & static data
// Centralise all hardcoded data here so components stay lean

import type { NavLink, UseCase, FooterLink } from "@/types";

// ─── Site metadata ────────────────────────────────────────────
export const SITE_NAME = "iota";
export const SITE_VERSION = "v1.4.0";
export const SITE_YEAR = "2026";
export const SITE_COORDS = { lat: "10.7626° N", lng: "106.6602° E" };

// ─── Navigation links ─────────────────────────────────────────
export const NAV_LINKS: NavLink[] = [
  { label: "About", href: "#about" },
  { label: "Capabilities", href: "#capabilities", badge: "04" },
  { label: "Use cases", href: "#labs", badge: "05" },
  { label: "Method", href: "#method", badge: "04" },
  { label: "Contact", href: "#contact" },
];

// ─── Ticker data (ContributorTicker) ──────────────────────────
export const TICKER_CITIES = [
  { name: "HANOI", coord: "10.76°N" },
  { name: "BERLIN", coord: "52.52°N" },
  { name: "TOKYO", coord: "35.68°N" },
  { name: "NEW YORK", coord: "40.71°N" },
  { name: "SAIGON", coord: "10.82°N" },
  { name: "LONDON", coord: "51.51°N" },
  { name: "SINGAPORE", coord: "1.35°N" },
  { name: "SEOUL", coord: "37.56°N" },
  { name: "PARIS", coord: "48.86°N" },
  { name: "LISBON", coord: "38.72°N" },
  { name: "MEXICO CITY", coord: "19.43°N" },
];

export const TICKER_USERS = [
  { username: "laihenyi", tokens: "2.4M" },
  { username: "aresdgi", tokens: "1.8M" },
  { username: "joeylee", tokens: "980K" },
  { username: "minhph", tokens: "740K" },
  { username: "pftom", tokens: "620K" },
  { username: "nguyenvy", tokens: "540K" },
  { username: "sariah", tokens: "410K" },
  { username: "danielo", tokens: "360K" },
  { username: "maya.k", tokens: "290K" },
];

// ─── Use cases (Labs) ─────────────────────────────────────────
export const USE_CASES: UseCase[] = [
  {
    number: "N° 01",
    year: "2026",
    type: "DOCS",
    title: "Onboarding buddy",
    description: "Wiki + HR PDFs + runbooks. New hires ask, iota answers — with the page link.",
    glyph: "i",
    bg: "uc-bg-1",
  },
  {
    number: "N° 02",
    year: "2026",
    type: "RESEARCH",
    title: "Reading partner",
    description: "500 papers, indexed in an hour. Cross-paper questions, citations down to the paragraph.",
    glyph: "π",
    bg: "uc-bg-2",
  },
  {
    number: "N° 03",
    year: "2026",
    type: "SUPPORT",
    title: "Tier-zero agent",
    description: "Help center + changelog synced. Customers get instant answers; tickets get context.",
    glyph: "?",
    bg: "uc-bg-3",
  },
  {
    number: "N° 04",
    year: "2026",
    type: "LEGAL",
    title: "Clause-level search",
    description:
      "Every contract you've ever signed. Ask about indemnity, jurisdiction, renewal — get the exact clause.",
    glyph: "§",
    bg: "uc-bg-4",
  },
  {
    number: "N° 05",
    year: "2026",
    type: "DEV",
    title: "API knowledge",
    description:
      "Swagger + RFCs + ADRs. Engineers ask in chat, iota replies with the exact endpoint and a code example.",
    glyph: "ƒ",
    bg: "uc-bg-5",
  },
];

export const LABS_FILTERS = [
  { label: "All", count: 24 },
  { label: "Internal", count: 9 },
  { label: "Research", count: 5 },
  { label: "Support", count: 7 },
  { label: "Legal", count: 3 },
];

// ─── Footer links ─────────────────────────────────────────────
export const FOOTER_LINKS: Record<string, FooterLink[]> = {
  product: [
    { label: "Capabilities", href: "#capabilities" },
    { label: "Use cases", href: "#labs" },
    { label: "Method", href: "#method" },
    { label: "Pricing", href: "#" },
    { label: "Changelog", href: "#" },
  ],
  resources: [
    { label: "Docs", href: "#" },
    { label: "API reference", href: "#" },
    { label: "Cookbook", href: "#" },
    { label: "Status", href: "#" },
    { label: "Security", href: "#" },
  ],
  company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Contact", href: "#contact" },
    { label: "Press kit", href: "#" },
  ],
};
