"use client";

import { useState } from "react";
import { USE_CASES, LABS_FILTERS } from "@/lib/constants";

export default function Labs() {
  const [active, setActive] = useState("All");

  return (
    <section className="py-20 px-4 md:px-8" id="labs">
      <div className="max-w-6xl mx-auto mb-12">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted border-b border-black/10 pb-4 tracking-wider uppercase">
          <span className="font-serif italic text-accent text-lg normal-case tracking-normal">IV.</span>
          <span>USE CASES / WHERE IOTA LIVES</span>
          <span className="text-accent font-medium">+</span>
          <span>05 OF 24 DEPLOYED</span>
          <span>005 / 008</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <span className="w-6 h-px bg-accent" />
          <span className="section-label">Use cases</span>
          <span className="text-muted text-xs">· N° 05</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 mb-8">
          <h2 className="text-3xl md:text-4xl font-display font-medium leading-[1.15] tracking-tight max-w-xl">
            Built for teams that <span className="font-serif italic text-accent">read more</span> than they
            write — and need every answer cited<span className="text-accent">.</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {LABS_FILTERS.map((filter) => (
              <button
                type="button"
                key={filter.label}
                onClick={() => setActive(filter.label)}
                className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                  active === filter.label
                    ? "bg-accent text-white border-accent"
                    : "bg-white border-black/10 hover:border-accent/30"
                }`}
              >
                {filter.label}
                <span className="ml-2 opacity-60">{filter.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-3.5 mb-6">
          <div className="w-9 h-9 rounded-full border border-black/20 flex items-center justify-center text-[13px] font-medium flex-shrink-0">
            05
          </div>
          <div className="text-[11px] text-muted uppercase tracking-wider leading-relaxed">
            <div className="font-medium text-foreground">FEATURED DEPLOYMENTS</div>
            REAL TEAMS · REAL CORPORA
            <br />
            BUILDING TRUST
            <br />
            THROUGH CITATION
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {USE_CASES.map((u) => (
            <a
              key={u.number}
              href="#contact"
              className="bg-white border border-black/[0.08] rounded-sm overflow-hidden flex flex-col transition-transform hover:-translate-y-1"
            >
              <div className={`relative aspect-[4/5] grid place-items-center overflow-hidden ${u.bg}`}>
                <span className="absolute top-2 left-2 bg-white/90 px-2 py-0.5 text-[10px] font-medium">
                  {u.type}
                </span>
                <span className="absolute top-2 right-2 w-4 h-4 bg-white/90 border border-black/20" />
                <span className="font-serif italic text-[64px] text-accent/50 leading-none">{u.glyph}</span>
              </div>
              <div className="p-3">
                <div className="flex justify-between text-[10px] text-muted mb-1.5">
                  <span>{u.number}</span>
                  <span>{u.year}</span>
                </div>
                <h3 className="font-display font-medium text-[13px] mb-1">{u.title}</h3>
                <p className="text-[11.5px] text-muted leading-relaxed">{u.description}</p>
              </div>
            </a>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`h-0.5 w-8 ${i <= 2 ? "bg-accent" : "bg-black/10"}`} />
            ))}
          </div>
          <a href="#" className="text-sm text-accent hover:underline flex items-center gap-2">
            05 / 24 DEPLOYMENTS · VIEW FULL ARCHIVE
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
