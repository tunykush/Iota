import Link from "next/link";
import { FOOTER_LINKS } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="bg-background text-foreground/85 pt-16 pb-8 px-4 md:px-8 border-t border-black/10">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-[1.6fr_1fr_1fr_1fr] gap-12 pb-12 border-b border-black/10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full border border-black/20 flex items-center justify-center">
                <span className="font-serif italic text-sm text-foreground">ι</span>
              </div>
              <span className="font-display font-medium text-lg text-foreground">iota</span>
            </Link>
            <div className="font-serif italic text-lg leading-snug max-w-xs mt-3.5 text-foreground/70">
              "The smallest light still names the sky."
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section}>
              <h6 className="text-[11px] tracking-[0.18em] uppercase text-foreground mb-3.5 font-mono font-medium">
                {section}
              </h6>
              <ul className="flex flex-col gap-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-foreground/60 hover:text-accent transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-between gap-3 pt-6 text-[11px] tracking-wider uppercase text-muted font-mono">
          <div>© 2026 iota — ι orionis labs · Apache-2.0</div>
          <div>Made with paper, vectors &amp; coffee</div>
        </div>
      </div>
    </footer>
  );
}
