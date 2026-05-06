"use client";

import { useState } from "react";
import type { Citation } from "@/types";

type Props = {
  citations: Citation[];
};

const typeIcon: Record<string, string> = {
  pdf: "📄",
  url: "🔗",
  db: "🗃️",
};

export default function CitationPanel({ citations }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (citations.length === 0) return null;

  return (
    <div className="citation-panel">
      <div className="citation-panel-head">
        <span className="dot" />
        <span>Sources referenced</span>
        <span className="ml-auto font-mono text-[9px] tracking-wider opacity-60">
          {citations.length} SRC
        </span>
      </div>
      <div className="citation-panel-list">
        {citations.map((c) => {
          const citationId = `${c.index}-${c.title}-${c.detail}`;
          const snippetId = `${citationId}-snippet`;
          const isExpanded = expanded === citationId;

          return (
            <button
              key={citationId}
              type="button"
              className={`citation-item ${isExpanded ? "citation-item--open" : ""}`}
              onClick={() => setExpanded(isExpanded ? null : citationId)}
              aria-expanded={isExpanded ? "true" : "false"}
              aria-controls={c.snippet ? snippetId : undefined}
            >
              <div className="citation-item-row">
                <span className="citation-ix">[{c.index}]</span>
                <span className="citation-icon">{typeIcon[c.sourceType] ?? "📎"}</span>
                <div className="citation-info">
                  <span className="citation-title">{c.title}</span>
                  <span className="citation-detail">{c.detail}</span>
                </div>
                {c.score != null && (
                  <span className="citation-score">
                    {Math.round(c.score * 100)}%
                  </span>
                )}
                <svg
                  className={`citation-chevron ${isExpanded ? "citation-chevron--open" : ""}`}
                  width="12" height="12" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
              {isExpanded && c.snippet && (
                <div id={snippetId} className="citation-snippet">
                  "{c.snippet}"
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}