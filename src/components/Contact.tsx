export default function Contact() {
  return (
    <section className="py-20 px-4 md:px-8" id="contact">
      <div className="max-w-6xl mx-auto mb-12">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted border-b border-black/10 pb-4 tracking-wider uppercase">
          <span className="font-serif italic text-accent text-lg normal-case tracking-normal">V.</span>
          <span>CONTACT / GET STARTED</span>
          <span className="text-accent font-medium">+</span>
          <span>FREE TO TRY</span>
          <span>006 / 008</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <span className="w-6 h-px bg-accent" />
          <span className="section-label">Get started</span>
          <span className="text-muted text-xs">· N° 06</span>
        </div>

        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-12 items-end">
          <div>
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-display font-medium leading-[1] tracking-tight mb-5">
              Give your files
              <br />a <span className="font-serif italic text-accent">voice</span>
              <span className="text-accent">.</span>
            </h2>
            <p className="text-lg text-foreground/70 max-w-md">
              Spin up your first iota workspace in under five minutes. Free forever for solo use, no card
              required, no data leaves your VPC.
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <a
              href="#"
              className="flex justify-between items-center px-6 py-4 rounded-full bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors"
            >
              <span>Start free — pnpm iota-dev</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
            <a
              href="#"
              className="flex justify-between items-center px-6 py-4 rounded-full border border-black/15 text-sm font-medium hover:bg-black/[0.04] transition-colors"
            >
              <span>Book a 30-min demo</span>
              <span>→</span>
            </a>
            <a
              href="#"
              className="flex justify-between items-center px-6 py-4 rounded-full border border-black/15 text-sm font-medium hover:bg-black/[0.04] transition-colors"
            >
              <span>Read the docs</span>
              <span>→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
