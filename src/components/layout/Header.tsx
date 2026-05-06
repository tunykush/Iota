"use client";

import { useState } from "react";
import Link from "next/link";
import { NAV_LINKS } from "@/lib/constants";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm">
      {/* Top bar */}
      <div className="border-b border-black/5 px-4 md:px-8 py-2 flex items-center justify-between text-xs text-muted">
        <div className="flex items-center gap-4">
          <span className="font-medium text-foreground">iota / 2026</span>
          <span className="hidden md:inline">VOL. 01 · ISSUE N° 04</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            LIVE · v1.4.0
          </span>
          <div className="hidden md:flex items-center gap-2">
            <span className="font-medium text-foreground">EN</span>
            <span>·</span>
            <span className="hover:text-foreground cursor-pointer">VI</span>
            <span>·</span>
            <span className="hover:text-foreground cursor-pointer">中文</span>
            <span>·</span>
            <span className="hover:text-foreground cursor-pointer">日本語</span>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full border border-black/20 flex items-center justify-center">
              <span className="font-serif italic text-sm">ι</span>
            </div>
            <span className="font-display font-medium text-lg">iota</span>
          </Link>

          {/* Nav Links - Desktop */}
          <div className="hidden lg:flex items-center gap-6 text-sm">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1 hover:text-accent transition-colors"
              >
                {link.label}
                {link.badge && (
                  <sup className="text-[10px] text-muted">{link.badge}</sup>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <Link
            href="#contact"
            className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-full text-sm font-medium hover:bg-foreground/90 transition-colors"
          >
            Try free
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">v1.4</span>
            <span className="text-accent">+</span>
          </Link>

          {/* Mobile menu button */}
          <button
            type="button"
            className="lg:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="lg:hidden border-t border-black/5 px-4 py-6 space-y-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block text-lg hover:text-accent transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              {link.label}
              {link.badge && (
                <span className="text-muted text-sm ml-2">{link.badge}</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
