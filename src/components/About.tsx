"use client";

import { useEffect, useRef, useState } from "react";

type Source = { ix: string; nm: string; meta: string };

const SCRIPT: { type: "user" | "bot"; text: string; sources?: Source[] }[] = [
  { type: "user", text: "What did Q3 customer interviews say about onboarding?" },
  {
    type: "bot",
    text:
      "Across the 14 interviews indexed, three themes recur:\n\n• onboarding feels long after step 4 [1]\n• users skip the sample data and import their own [2]\n• \"what does iota do?\" is asked again at day 3 [3]\n\nQ3 NPS rose 12 pts after the day-2 reminder email [4].",
    sources: [
      { ix: "[1]", nm: "Interview · Maya K. — Q3-W7.pdf", meta: "p. 3" },
      { ix: "[2]", nm: "Interview · Daniel O. — Q3-W9.pdf", meta: "p. 2" },
      { ix: "[3]", nm: "Sales sync notes — 2025-09-14", meta: "§3" },
      { ix: "[4]", nm: "NPS dashboard — q3-summary.csv", meta: "row 84" },
    ],
  },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function citeText(s: string) {
  return s.replace(/\[(\d+)\]/g, '<span class="cite">[$1]</span>');
}

export default function About() {
  const cardRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLSpanElement>(null);
  const [hasRun, setHasRun] = useState(false);

  useEffect(() => {
    if (!cardRef.current || hasRun) return;
    const node = cardRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !hasRun) {
            setHasRun(true);
            observer.disconnect();
            void run();
          }
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasRun]);

  const renderUser = (m: { text: string }) => {
    if (!bodyRef.current) return;
    const d = document.createElement("div");
    d.className = "msg msg-user";
    d.innerHTML = `<div class="avatar">U</div><div class="bubble">${m.text}</div>`;
    bodyRef.current.appendChild(d);
  };

  const renderBot = async (m: { text: string; sources?: Source[] }) => {
    if (!bodyRef.current) return;
    const d = document.createElement("div");
    d.className = "msg msg-bot";
    d.innerHTML = '<div class="avatar">ι</div><div class="bubble"><span class="stream"></span></div>';
    bodyRef.current.appendChild(d);
    const stream = d.querySelector(".stream") as HTMLElement;
    let buf = "";
    for (let i = 0; i < m.text.length; i++) {
      buf += m.text[i];
      stream.innerHTML = citeText(buf).replace(/\n/g, "<br/>");
      await sleep(8 + Math.random() * 14);
    }
    if (m.sources) {
      const wrap = document.createElement("div");
      wrap.className = "sources";
      for (const src of m.sources) {
        const r = document.createElement("div");
        r.className = "source";
        r.innerHTML = `<span class="ix">${src.ix}</span><div><span class="nm">${src.nm}</span><br/><span>${src.meta}</span></div>`;
        wrap.appendChild(r);
      }
      d.querySelector(".bubble")?.appendChild(wrap);
    }
  };

  const typePrompt = async (t: string) => {
    if (!fieldRef.current) return;
    fieldRef.current.textContent = "";
    for (const c of t) {
      fieldRef.current.textContent += c;
      await sleep(28 + Math.random() * 40);
    }
  };

  const deleteText = async () => {
    if (!fieldRef.current) return;
    while (fieldRef.current.textContent && fieldRef.current.textContent.length) {
      fieldRef.current.textContent = fieldRef.current.textContent.slice(0, -1);
      await sleep(14);
    }
  };

  const run = async () => {
    await sleep(700);
    await deleteText();
    await typePrompt(SCRIPT[0].text);
    await sleep(350);
    renderUser(SCRIPT[0]);
    await deleteText();
    if (fieldRef.current) fieldRef.current.textContent = "thinking…";
    await sleep(450);
    if (fieldRef.current) fieldRef.current.textContent = "";
    await renderBot(SCRIPT[1]);
    await sleep(2500);
    if (fieldRef.current) fieldRef.current.textContent = "Ask another question…";
  };

  return (
    <section className="py-20 px-4 md:px-8" id="about">
      <div className="max-w-6xl mx-auto mb-12">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted border-b border-black/10 pb-4 tracking-wider uppercase">
          <span className="font-serif italic text-accent text-lg normal-case tracking-normal">I.</span>
          <span>ABOUT / MANIFESTO</span>
          <span className="text-accent font-medium">+</span>
          <span>IOTA / VOLUME 01</span>
          <span>002 / 008</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <span className="w-6 h-px bg-accent" />
          <span className="section-label">About iota</span>
          <span className="text-muted text-xs">· N° 02</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-medium leading-[1.15] tracking-tight mb-6">
              We treat <span className="font-serif italic text-accent">your knowledge</span> as a sovereign{" "}
              <span className="font-serif italic text-accent">corpus,</span> not a training set
              <span className="text-accent">.</span>
            </h2>

            <p className="text-lg text-foreground/80 mb-7 max-w-lg">
              Every PDF, every page, every database row stays inside your perimeter. iota chunks, embeds and
              retrieves — your LLM only ever sees passages you authorize, and never gets to memorize what it
              read. Run locally with{" "}
              <code className="font-mono text-sm bg-black/5 px-1.5 py-0.5 rounded">pnpm iota-dev</code>, deploy
              to your own VPC, BYOK at every layer.
            </p>

            <a
              href="#method"
              className="inline-flex items-center gap-2 border border-black/20 rounded-full px-5 py-2.5 text-sm hover:bg-black/5 transition-colors"
            >
              Read our approach
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>

            <div className="flex items-start gap-4 mt-12 pt-6 border-t border-black/10">
              <div className="w-8 h-8 rounded-full border border-black/20 flex items-center justify-center flex-shrink-0">
                <span className="font-serif italic text-sm">ι</span>
              </div>
              <div className="text-[11px] text-muted tracking-wider uppercase leading-relaxed">
                INGEST · EMBED · RETRIEVE
                <br />
                REPEAT
              </div>
              <div className="ml-auto text-right text-[11px] uppercase tracking-wider">
                <div className="text-accent font-medium">PRIVATE</div>
                <div className="text-accent font-medium">BY DEFAULT</div>
                <div className="text-muted mt-1">EST. MMXXVI</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="image-frame">
              <div className="chat-card" ref={cardRef}>
                <div className="chat-head">
                  <span className="dot" />
                  <span>iota · live retrieval</span>
                  <span className="src">
                    <span>14 PDF</span>
                    <span>3 SITES</span>
                    <span>1 DB</span>
                  </span>
                </div>
                <div className="chat-body" ref={bodyRef} />
                <div className="chat-input">
                  <div className="field">
                    <span ref={fieldRef}>Ask anything from your knowledge base</span>
                    <span className="cur" />
                  </div>
                  <div className="send" aria-hidden="true">
                    ⏎
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
