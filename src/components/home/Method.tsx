type Step = {
  number: string;
  title: string;
  description: string;
  vis: React.ReactNode;
  hasArrow?: boolean;
};

const steps: Step[] = [
  {
    number: "01",
    title: "Ingest",
    description:
      "Upload PDFs, point at a sitemap, paste a Postgres connection. iota parses, OCRs and de-duplicates everything in one pass.",
    hasArrow: true,
    vis: (
      <svg viewBox="0 0 200 200">
        <g fill="none" stroke="#1A1A1A" strokeWidth={1.4}>
          <rect x={20} y={40} width={50} height={64} />
          <rect x={80} y={30} width={50} height={64} />
          <rect x={140} y={44} width={40} height={56} />
          <line x1={20} y1={140} x2={180} y2={140} strokeDasharray="3 3" opacity={0.4} />
        </g>
        <text x={40} y={170} fontFamily="JetBrains Mono, monospace" fontSize={9} fill="#1A1A1A">
          PDF
        </text>
        <text x={92} y={170} fontFamily="JetBrains Mono, monospace" fontSize={9} fill="#1A1A1A">
          DOCX
        </text>
        <text x={148} y={170} fontFamily="JetBrains Mono, monospace" fontSize={9} fill="#1A1A1A">
          URL
        </text>
        <circle cx={100} cy={180} r={8} fill="#D96C4E" />
        <text
          x={100}
          y={184}
          textAnchor="middle"
          fontFamily="Playfair Display, serif"
          fontStyle="italic"
          fill="#fff"
          fontSize={12}
        >
          ι
        </text>
      </svg>
    ),
  },
  {
    number: "02",
    title: "Embed",
    description:
      "Each chunk becomes a 1536-d vector and lands in your private pgvector index. Re-embed incrementally on every change.",
    hasArrow: true,
    vis: (
      <svg viewBox="0 0 200 200">
        <g fill="none" stroke="#1A1A1A" strokeDasharray="2 4" opacity={0.5}>
          <circle cx={100} cy={100} r={70} />
          <circle cx={100} cy={100} r={48} />
        </g>
        <g fill="#1A1A1A">
          <circle cx={100} cy={100} r={3} />
          <circle cx={76} cy={78} r={2} />
          <circle cx={128} cy={84} r={2} />
          <circle cx={120} cy={124} r={2} />
          <circle cx={80} cy={130} r={2} />
          <circle cx={140} cy={110} r={2} />
          <circle cx={64} cy={106} r={2} />
        </g>
        <g fill="#D96C4E">
          <circle cx={56} cy={60} r={2} />
          <circle cx={148} cy={62} r={2} />
          <circle cx={152} cy={146} r={2} />
        </g>
      </svg>
    ),
  },
  {
    number: "03",
    title: "Retrieve",
    description:
      "At question-time iota fetches the top-k passages by cosine similarity and grounds the LLM with them. No RAG, no answer.",
    hasArrow: true,
    vis: (
      <svg viewBox="0 0 200 200">
        <g fill="none" stroke="#1A1A1A" strokeWidth={1.4}>
          <circle cx={40} cy={100} r={20} />
        </g>
        <text
          x={40}
          y={106}
          textAnchor="middle"
          fontFamily="Inter Tight, sans-serif"
          fontWeight={500}
          fontSize={20}
          fill="#1A1A1A"
        >
          ?
        </text>
        <line x1={64} y1={100} x2={100} y2={100} stroke="#1A1A1A" strokeDasharray="2 3" opacity={0.5} />
        <g transform="translate(108,68)">
          <rect width={80} height={64} fill="none" stroke="#1A1A1A" />
          <line x1={0} y1={20} x2={80} y2={20} stroke="#D96C4E" strokeWidth={6} opacity={0.7} />
          <line x1={0} y1={34} x2={80} y2={34} stroke="#D96C4E" strokeWidth={6} opacity={0.4} />
          <line x1={0} y1={48} x2={80} y2={48} stroke="#D96C4E" strokeWidth={6} opacity={0.2} />
        </g>
      </svg>
    ),
  },
  {
    number: "04",
    title: "Cite",
    description:
      "Every claim links back to the exact passage in the source document. Click a citation — jump straight to the page.",
    vis: (
      <svg viewBox="0 0 200 200">
        <g fill="none" stroke="#1A1A1A" strokeWidth={1.4}>
          <rect x={40} y={30} width={120} height={140} />
          <line x1={56} y1={58} x2={144} y2={58} />
          <line x1={56} y1={78} x2={144} y2={78} />
          <line x1={56} y1={98} x2={120} y2={98} />
          <line x1={56} y1={118} x2={144} y2={118} />
        </g>
        <rect x={56} y={92} width={40} height={14} fill="#D96C4E" opacity={0.3} />
        <text x={60} y={103} fontFamily="JetBrains Mono, monospace" fontSize={8} fill="#D96C4E" fontWeight={500}>
          [2]
        </text>
      </svg>
    ),
  },
];

export default function Method() {
  return (
    <section className="py-20 px-4 md:px-8" id="method">
      <div className="max-w-6xl mx-auto mb-12">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted border-b border-black/10 pb-4 tracking-wider uppercase">
          <span className="font-serif italic text-accent text-lg normal-case tracking-normal">III.</span>
          <span>METHOD / LOOP</span>
          <span className="text-accent font-medium">+</span>
          <span>04 STAGES, ITERATIVE</span>
          <span>004 / 008</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <span className="w-6 h-px bg-accent" />
          <span className="section-label">Method</span>
          <span className="text-muted text-xs">· N° 04</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-medium leading-[1.15] tracking-tight">
            From <span className="font-serif italic text-accent">raw files</span> to cited answers
            <span className="text-accent">.</span>
          </h2>
          <div className="text-sm text-muted max-w-xs">
            <span className="text-accent font-medium">+</span>
            <p className="mt-2">
              Every stage is iterative, observable and file-based — composable scripts, not opaque prompts.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((step) => (
            <div key={step.number} className="flex flex-col gap-3.5">
              <div className="font-serif italic text-4xl text-accent border-b border-black/10 pb-2 leading-none">
                {step.number}
              </div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-medium text-lg">{step.title}</h3>
                {step.hasArrow && (
                  <svg className="w-3.5 h-3.5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                )}
              </div>
              <p className="text-[13px] text-muted leading-relaxed">{step.description}</p>
              <div className="image-frame">
                <div className="relative aspect-square grid place-items-center">{step.vis}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-6 mt-12 border-t border-black/10">
          <div className="flex items-center gap-3 text-xs text-muted uppercase tracking-wider">
            <div className="w-6 h-6 rounded-full border border-black/20" />
            <span>RETRIEVAL INFORMS EVERY ANSWER. CITATIONS MAKE IT TRUSTABLE.</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <a href="#" className="font-mono hover:text-accent transition-colors">
              DOCS.IOTA.IO
            </a>
            <span className="text-muted">· APACHE-2.0</span>
          </div>
        </div>
      </div>
    </section>
  );
}
