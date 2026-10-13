import Link from "next/link";
import { Fraunces } from "next/font/google";
import { ArrowUp } from "lucide-react";

const display = Fraunces({ subsets: ["latin"], display: "swap", axes: ["opsz"] });

const heading = "font-mono text-[9px] uppercase tracking-[0.18em] text-brand";
const linkClass = "text-[11px] text-gray-700 transition-colors duration-300 hover:text-brand";

// Same-page anchors. Match these to the ids on your sections.
const EXPLORE = [
  { label: "A space for you", href: "#inside" },
  { label: "How it works", href: "#move-forward" },
  { label: "Ask Carta AI", href: "#ask" },
  { label: "Capabilities", href: "#capabilities" },
];

export function SiteFooter() {
  return (
    <footer className="bg-page text-ink">
      <div className="mx-auto w-full max-w-6xl px-4 pb-8 pt-6 sm:px-6 sm:pt-20">
        <div className="flex flex-col gap-12 md:flex-row md:items-end md:justify-between">
          <div>
            <p className={`${display.className} text-7xl font-normal leading-none tracking-tight text-brand sm:text-8xl`}>
              Carta.
            </p>
            <p className="mt-5 text-[11px] text-gray-600">A little space. A lot of possibility.</p>
          </div>

          <div className="flex gap-16">
            <nav aria-label="Explore">
              <h3 className={heading}>Explore</h3>
              <ul className="mt-4 space-y-3">
                {EXPLORE.map(({ label, href }) => (
                  <li key={label}>
                    <a href={href} className={linkClass}>
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Your Carta">
              <h3 className={heading}>Your Carta</h3>
              <ul className="mt-4 space-y-3">
                <li>
                  <Link href="/sign-up" className={linkClass}>
                    Get started
                  </Link>
                </li>
                <li>
                  <Link href="/sign-in" className={linkClass}>
                    Sign in
                  </Link>
                </li>
                <li>
                  <a href="#top" className="inline-flex items-center gap-1.5 text-[11px] text-brand transition-colors duration-300 hover:text-brand-strong">
                    Back to the beginning
                    <ArrowUp size={11} aria-hidden="true" />
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <p className="text-[10px] text-gray-500">© {new Date().getFullYear()} Carta</p>
          <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-gray-500">
            For the thoughts that make you, you.
          </p>
        </div>
      </div>
    </footer>
  );
}