import Link from "next/link";

export default function Hero() {
  return (
    <section className="pt-32 md:pt-40 pb-12 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <span className="w-6 h-px bg-accent" />
          <span className="section-label">Private knowledge engine</span>
          <span className="text-muted text-xs">· N° 01</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-medium leading-[1.05] tracking-tight mb-7">
              Your <span className="font-serif italic text-accent">private</span> knowledge,{" "}
              <span className="font-serif italic text-accent">searched</span>, cited, and{" "}
              <span className="font-serif italic text-accent">answered</span>
              <span className="text-accent">.</span>
            </h1>

            <p className="text-lg text-foreground/80 mb-7 max-w-xl">
              Drop in your PDFs, scrape your sites, plug your database — iota turns every document you own
              into a single chatbot that cites its sources. Built on retrieval-augmented generation with a
              private vector index.
            </p>

            <div className="flex flex-wrap gap-4 mb-10">
              <Link href="#contact" className="btn-primary hero-cta-btn hero-cta-primary">
                Start ingesting — free
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <Link href="#method" className="btn-secondary hero-cta-btn hero-cta-secondary">
                See how it works
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs text-muted border-t border-black/10 pt-5 tracking-wider">
              <div className="flex items-center gap-2">
                <span className="font-mono">PNPM IOTA-DEV</span>
                <span>·</span>
                <span>3 COMMANDS TO START</span>
              </div>
              <div className="flex items-center gap-2">
                <span>10.7626° N</span>
                <span>·</span>
                <span>106.6602° E</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <IotaSketch />

            <div className="flex flex-wrap gap-2.5 mt-3.5">
              <div className="bg-white border border-black/10 rounded-sm px-3.5 py-2.5">
                <div className="text-[22px] font-display font-medium leading-none">42</div>
                <div className="text-[10px] text-muted font-medium mt-1">file types</div>
                <div className="text-[10px] text-muted">parsed</div>
              </div>
              <div className="bg-white border border-black/10 rounded-sm px-3.5 py-2.5">
                <div className="text-[22px] font-display font-medium leading-none">2.8s</div>
                <div className="text-[10px] text-muted font-medium mt-1">avg. answer</div>
                <div className="text-[10px] text-muted">cited</div>
              </div>
              <div className="bg-white border border-black/10 rounded-sm px-3.5 py-2.5">
                <div className="text-[22px] font-display font-medium leading-none">98%</div>
                <div className="text-[10px] text-muted font-medium mt-1">retrieval</div>
                <div className="text-[10px] text-muted">precision</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function IotaSketch() {
  return (
    <div className="iota-wrap relative">
      <span className="reg reg-tl" aria-hidden="true" />
      <span className="reg reg-tr" aria-hidden="true" />
      <span className="reg reg-bl" aria-hidden="true" />
      <span className="reg reg-br" aria-hidden="true" />
      <div
        className="iota-sketch relative aspect-square overflow-hidden"
        role="img"
        aria-label="Iota / sheet 04 — composition study with Orion constellation"
      >
      <div className="iota-grain absolute inset-0 pointer-events-none" />
      <div className="iota-vignette absolute inset-0 pointer-events-none" />

      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <defs>
          <filter id="rough" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={3} />
            <feDisplacementMap in="SourceGraphic" scale={1.6} />
          </filter>
          <filter id="roughHard" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves={2} seed={7} />
            <feDisplacementMap in="SourceGraphic" scale={2.6} />
          </filter>
          <filter id="brush" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.025 0.06" numOctaves={2} seed={11} />
            <feDisplacementMap in="SourceGraphic" scale={22} />
          </filter>
          <radialGradient id="sunFill" cx="40%" cy="38%" r="70%">
            <stop offset="0%" stopColor="#e87158" stopOpacity={0.95} />
            <stop offset="55%" stopColor="#d96047" stopOpacity={0.82} />
            <stop offset="100%" stopColor="#b94a35" stopOpacity={0.55} />
          </radialGradient>

          <symbol id="spark" viewBox="-10 -10 20 20" overflow="visible">
            <path d="M 0 -8 L 1.6 -1.6 L 8 0 L 1.6 1.6 L 0 8 L -1.6 1.6 L -8 0 L -1.6 -1.6 Z" />
          </symbol>
          <symbol id="sparkS" viewBox="-10 -10 20 20" overflow="visible">
            <path d="M 0 -5 L 1 -1 L 5 0 L 1 1 L 0 5 L -1 1 L -5 0 L -1 -1 Z" />
          </symbol>

          <g id="dotcol">
            <circle cx={0} cy={0} r={1.6} />
            <circle cx={0} cy={14} r={1.6} />
            <circle cx={0} cy={28} r={1.6} />
            <circle cx={0} cy={42} r={1.6} />
            <circle cx={0} cy={56} r={1.6} />
            <circle cx={0} cy={70} r={1.6} />
            <circle cx={0} cy={84} r={1.6} />
          </g>
        </defs>

        <g opacity={0.75} transform="translate(70,70)" fill="#1f1d1a">
          <use href="#dotcol" />
          <use href="#dotcol" x={14} />
          <use href="#dotcol" x={28} />
          <use href="#dotcol" x={42} />
          <use href="#dotcol" x={56} />
          <use href="#dotcol" x={70} />
          <use href="#dotcol" x={84} />
          <use href="#dotcol" x={98} />
          <use href="#dotcol" x={112} />
        </g>

        <g filter="url(#brush)">
          <circle cx={470} cy={360} r={240} fill="url(#sunFill)" />
          <path
            d="M 470 120 A 240 240 0 0 1 710 360 L 710 470 A 200 200 0 0 0 470 270 Z"
            fill="#efe7d8"
            opacity={0.55}
          />
        </g>
        <g opacity={0.7} filter="url(#brush)">
          <path d="M 240 360 a 230 230 0 0 1 460 0" fill="none" stroke="#b94a35" strokeWidth={6} opacity={0.35} />
          <path d="M 280 540 q 90 60 200 50" fill="none" stroke="#b94a35" strokeWidth={3} opacity={0.4} />
        </g>

        <g className="draft" filter="url(#rough)">
          <circle cx={470} cy={360} r={266} strokeDasharray="2 5" />
          <circle cx={470} cy={360} r={220} strokeDasharray=".5 4" />
          <circle cx={230} cy={780} r={120} />
          <circle cx={330} cy={800} r={160} strokeDasharray="3 4" />
          <circle cx={180} cy={720} r={60} strokeDasharray=".5 3" />
          <g className="ink">
            <circle cx={230} cy={780} r={2} />
            <circle cx={330} cy={800} r={2} />
            <circle cx={180} cy={720} r={2} />
            <circle cx={290} cy={760} r={2} />
          </g>
          <path d="M 130 760 L 410 800" strokeDasharray="1 3" />
        </g>

        <g className="pen dot" filter="url(#rough)">
          <line x1={690} y1={80} x2={690} y2={900} />
        </g>
        <g className="pen thin" filter="url(#roughHard)">
          <path d="M 100 880 L 940 700" />
          <path d="M 100 884 L 940 704" opacity={0.4} />
        </g>

        <circle cx={800} cy={860} r={34} fill="#c98a26" opacity={0.88} filter="url(#brush)" />
        <circle cx={800} cy={860} r={34} className="pen thin" />

        <g transform="translate(470,420)">
          <g className="draft" filter="url(#rough)">
            <ellipse cx={0} cy={20} rx={170} ry={210} strokeDasharray="1 4" />
            <ellipse cx={0} cy={20} rx={120} ry={160} strokeDasharray=".5 5" opacity={0.5} />
            <line x1={-180} y1={20} x2={180} y2={20} strokeDasharray="1 6" />
            <line x1={0} y1={-200} x2={0} y2={240} strokeDasharray="1 6" />
          </g>

          <g className="pen dash" strokeWidth={1.1} opacity={0.85} filter="url(#rough)">
            <line x1={-95} y1={-150} x2={95} y2={-130} />
            <line x1={-95} y1={-150} x2={-40} y2={0} />
            <line x1={95} y1={-130} x2={55} y2={20} />
            <line x1={-40} y1={0} x2={8} y2={10} />
            <line x1={8} y1={10} x2={55} y2={20} />
            <line x1={-40} y1={0} x2={-110} y2={170} />
            <line x1={55} y1={20} x2={110} y2={180} />
            <line x1={8} y1={10} x2={0} y2={70} />
            <line x1={0} y1={70} x2={-4} y2={105} />
            <line x1={-4} y1={105} x2={-10} y2={138} />
            <line x1={-95} y1={-150} x2={0} y2={-220} />
            <line x1={0} y1={-220} x2={95} y2={-130} />
          </g>
          <g className="pen faint dash" filter="url(#rough)">
            <path d="M -150 -90 Q -180 -10 -150 90" />
            <path d="M 150 -50 Q 175 30 150 110" opacity={0.7} />
          </g>

          <g className="star">
            <use href="#spark" x={-95} y={-150} width={22} height={22} />
            <use href="#spark" x={95} y={-130} width={26} height={26} />
            <use href="#spark" x={-40} y={0} width={20} height={20} />
            <use href="#spark" x={8} y={10} width={22} height={22} />
            <use href="#spark" x={55} y={20} width={20} height={20} />
            <use href="#spark" x={-110} y={170} width={22} height={22} />
            <use href="#spark" x={110} y={180} width={28} height={28} />
            <use href="#sparkS" x={0} y={-220} width={14} height={14} />
            <use href="#sparkS" x={0} y={70} width={14} height={14} />
            <use href="#sparkS" x={-4} y={105} width={12} height={12} />
          </g>

          <g>
            <circle cx={-10} cy={138} r={14} fill="none" stroke="#d96047" strokeWidth={1.2} filter="url(#rough)" />
            <circle cx={-10} cy={138} r={22} fill="none" stroke="#d96047" strokeWidth={0.6} strokeDasharray="2 3" opacity={0.7} />
            <use href="#spark" x={-10} y={138} width={20} height={20} fill="#d96047" />
            <path className="pen thin" d="M -10 138 L -120 230 L -200 230" filter="url(#rough)" />
            <text x={-205} y={226} textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize={10} letterSpacing={2.4} fill="#d96047" fontWeight={500}>
              ι ORIONIS
            </text>
            <text x={-205} y={240} textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize={8} letterSpacing={2} fill="#1f1d1a" opacity={0.7}>
              HATSYA · 02
            </text>
          </g>

          <g className="star" opacity={0.55}>
            <use href="#sparkS" x={-170} y={-60} width={8} height={8} />
            <use href="#sparkS" x={160} y={-200} width={8} height={8} />
            <use href="#sparkS" x={-200} y={100} width={8} height={8} />
            <use href="#sparkS" x={180} y={60} width={8} height={8} />
            <use href="#sparkS" x={40} y={-180} width={8} height={8} />
            <use href="#sparkS" x={-60} y={-90} width={6} height={6} />
            <use href="#sparkS" x={70} y={-60} width={6} height={6} />
            <use href="#sparkS" x={-130} y={60} width={6} height={6} />
            <use href="#sparkS" x={130} y={100} width={6} height={6} />
            <use href="#sparkS" x={-20} y={200} width={8} height={8} />
            <use href="#sparkS" x={80} y={-260} width={6} height={6} />
            <use href="#sparkS" x={-160} y={-180} width={6} height={6} />
          </g>

          <g className="label labelDim" filter="url(#rough)">
            <text x={-110} y={-158}>BELLATRIX</text>
            <text x={115} y={-138}>BETELGEUSE</text>
            <text x={-58} y={-6}>MINTAKA</text>
            <text x={14} y={2}>ALNILAM</text>
            <text x={62} y={14}>ALNITAK</text>
            <text x={-128} y={190}>SAIPH</text>
            <text x={120} y={200}>RIGEL</text>
          </g>

          <g className="pen faint" filter="url(#roughHard)">
            <path d="M 110 180 q 30 30 80 20" />
            <path d="M 190 195 l -8 -3 m 8 3 l -3 8" />
          </g>
        </g>

        <g fontFamily="Playfair Display, serif" fontStyle="italic" fill="#1f1d1a" opacity={0.75}>
          <text x={160} y={200} fontSize={13} transform="rotate(-4 160 200)">construction — do not erase</text>
          <text x={540} y={120} fontSize={13} transform="rotate(2 540 120)">ø 240 · sun</text>
          <text x={120} y={900} fontSize={12} opacity={0.5}>fig. ι · orion sword</text>
        </g>

      </svg>

      <div className="iota-meta tl">
        <b>iota / sheet 04</b>
        <br />
        <span className="dim">composition study · pencil, ink</span>
      </div>
      <div className="iota-meta tr">
        <b>RA 05ʰ 35ᵐ</b>
        <br />
        <span className="dim">dec −05° 54′ ori</span>
      </div>
      <div className="iota-meta bl">
        <span className="dim">plate</span> <b>iota·orionis</b>
      </div>
      <div className="iota-meta br">
        <span className="dim">scale 1 : 1</span> &nbsp; <b>2026</b>
      </div>

      <div className="iota-callout">
        “the smallest light
        <br />
        still names the sky.”
        <small>iota · fig. 04</small>
      </div>

      <div className="iota-cap">ι · STAR</div>
      <div className="iota-mark">ι</div>
      </div>
    </div>
  );
}
