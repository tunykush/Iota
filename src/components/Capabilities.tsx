import Link from "next/link";

const capabilities = [
  {
    number: "01",
    label: "PARSERS",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeWidth={1.5} d="M4 4h12l4 4v12H4z M16 4v4h4" />
      </svg>
    ),
    title: "Any file,",
    subtitle: "parsed",
    description: "PDF, DOCX, PPTX, XLSX, Markdown, HTML, EPUB. Tables and figures preserved with layout-aware OCR.",
  },
  {
    number: "02",
    label: "CRAWL",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx={12} cy={12} r={9} strokeWidth={1.5} />
        <path strokeWidth={1.5} d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
      </svg>
    ),
    title: "Live website",
    subtitle: "crawl",
    description: "Point iota at a sitemap or URL pattern. It crawls, respects robots.txt, and re-syncs on a schedule.",
  },
  {
    number: "03",
    label: "VECTORS",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx={12} cy={12} r={3} strokeWidth={1.5} />
        <circle cx={12} cy={12} r={9} strokeWidth={1.5} strokeDasharray="2 3" />
      </svg>
    ),
    title: "Vector index,",
    subtitle: "incremental",
    description: "1536-d embeddings on pgvector. Re-embed only what changed — your index stays fresh and cheap.",
  },
  {
    number: "04",
    label: "BYOK",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeWidth={1.5}
          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.74 5.74L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.59a1 1 0 01.29-.7l5.97-5.97A6 6 0 1121 9z"
        />
      </svg>
    ),
    title: "BYOK",
    subtitle: "at every layer",
    description: "Claude, GPT-4, Llama, Mistral, your self-hosted vLLM — paste a baseUrl + key per workspace, ship.",
  },
];

export default function Capabilities() {
  return (
    <section className="py-20 px-4 md:px-8" id="capabilities">
      <div className="max-w-6xl mx-auto mb-12">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted border-b border-black/10 pb-4 tracking-wider uppercase">
          <span className="font-serif italic text-accent text-lg normal-case tracking-normal">II.</span>
          <span>CAPABILITIES · INGEST · INDEX · ANSWER</span>
          <span className="text-accent font-medium">+</span>
          <span>4 PILLARS / 1 LOOP</span>
          <span>003 / 008</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left: Terminal */}
          <div className="order-2 lg:order-1">
            <div className="iota-term" aria-hidden="true">
              <div className="iota-term-head">
                <span />
                <span />
                <span />
              </div>
              <div className="iota-term-line">
                <span className="pr">$</span> pnpm iota-dev
              </div>
              <div className="iota-term-line">
                <span className="gr">→ scanning sources…</span>
              </div>
              <div className="iota-term-line">
                <span className="ok">✓</span> 14 pdfs parsed <span className="gr">(2.4 GB)</span>
              </div>
              <div className="iota-term-line">
                <span className="ok">✓</span> 3 sitemaps crawled <span className="gr">(842 pages)</span>
              </div>
              <div className="iota-term-line">
                <span className="ok">✓</span> postgres · public schema · 12 tables
              </div>
              <div className="iota-term-line">
                <span className="gr">→ embedding…</span>
              </div>
              <div className="iota-term-line">
                <span className="ok">✓</span> 18,442 chunks · <span className="vv">1536-d vectors</span>
              </div>
              <div className="iota-term-line">
                <span className="gr">→ ready on</span> http://localhost:4242
              </div>
              <div className="iota-term-line">
                <span className="pr">$</span> _
              </div>
            </div>
            <div className="mt-3.5 flex items-center justify-between text-[11px] text-muted font-mono tracking-wider uppercase">
              <span>iota daemon · running</span>
              <span className="text-accent">CAPABILITIES · MATRIX · IO/26</span>
            </div>
          </div>

          {/* Right: Content */}
          <div className="order-1 lg:order-2">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-6 h-px bg-accent" />
              <span className="section-label">Capabilities</span>
              <span className="text-muted text-xs">· N° 03</span>
            </div>

            <h2 className="text-3xl md:text-4xl font-display font-medium leading-[1.15] tracking-tight mb-5">
              Parsers, embeddings, and retrieval{" "}
              <span className="font-serif italic text-accent">for any kind</span> of knowledge
              <span className="text-accent">.</span>
            </h2>

            <p className="text-lg text-foreground/80 mb-8">
              Everything you need to ship a grounded, cited chatbot — without stitching together six SaaS tools.
            </p>

            <div className="grid sm:grid-cols-2 gap-3.5">
              {capabilities.map((cap) => (
                <Link
                  key={cap.number}
                  href="#contact"
                  className="group bg-white border border-black/10 rounded-sm p-4 hover:border-accent/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-serif italic text-accent text-lg">{cap.number}</span>
                    <span className="text-[10px] text-muted font-medium tracking-wider">{cap.label}</span>
                  </div>
                  <div className="mb-2 text-muted">{cap.icon}</div>
                  <h3 className="font-display font-medium text-[17px] leading-tight">
                    {cap.title}
                    <br />
                    {cap.subtitle}
                  </h3>
                  <p className="text-xs text-muted mt-2.5 leading-relaxed">{cap.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
