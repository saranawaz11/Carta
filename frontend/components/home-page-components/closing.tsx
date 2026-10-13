import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { Fraunces } from "next/font/google";
import { ArrowUpRight, PenLine, Plus, Sparkles, SquarePen } from "lucide-react";

import { Reveal } from "@/components/home-page-components/reveal";
import { ClosingDesk } from "./closing-desk";

const display = Fraunces({ subsets: ["latin"], display: "swap", axes: ["opsz"] });

// Put a photo in /public/assets and set it here (e.g. "/assets/closing.jpg") to replace the drawing
const CLOSING_IMAGE: StaticImageData | string | null = null;

const CHIPS = [
  { icon: Sparkles, label: "Ask questions about your notes" },
  { icon: SquarePen, label: "Review proposed updates" },
  { icon: Plus, label: "Quick Capture" },
];

export function Closing() {
  return (
    <section className="relative overflow-hidden border-t border-line bg-band-warm text-ink">
      {/* Soft glow behind the picture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 55% at 18% 35%, color-mix(in oklab, var(--carta-brand) 14%, transparent), transparent 70%)",
        }}
      />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
        {/* Picture and capability card */}
        <div className="order-2 lg:order-1">
          <Reveal y={40}>
            <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-line-strong bg-art-ground shadow-2xl shadow-black/20">
              {CLOSING_IMAGE ? (
                <div className="absolute inset-0 transition-transform duration-[1400ms] ease-out group-hover:scale-105">
                  <Image
                    src={CLOSING_IMAGE}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 560px, 100vw"
                    className="object-cover"
                  />
                </div>
              ) : (
                <ClosingDesk />
              )}

              {/* Darken the bottom so the caption always reads */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgb(0 0 0 / 0.6), rgb(0 0 0 / 0.05) 55%, rgb(0 0 0 / 0.2))",
                }}
              />

              <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-[10px] text-white backdrop-blur-md">
                <PenLine size={11} className="text-wine-soft" />
                AI-assisted writing
              </span>

              <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-xl border border-white/10 bg-black/45 p-3.5 backdrop-blur-md">
                <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/60">Personal notes</p>
                <p className="mt-1 text-xs leading-relaxed text-white/90">
                  Grounded answers, reviewed updates, and quick capture.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal y={24} delay={0.12} className="mt-4">
            <div className="flex items-start gap-3.5 rounded-2xl border border-line bg-panel/60 p-4 backdrop-blur-sm">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-button text-white">
                <SquarePen size={15} />
              </span>
              <div className="min-w-0">
                <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-brand">AI capabilities</p>
                <p className="mt-1 text-xs font-medium">Ask questions, review updates, and capture ideas quickly.</p>
                <p className="mt-1 text-[11px] leading-relaxed text-gray-600">
                  Carta AI helps you connect ideas, propose note changes, and keep your thoughts moving
                  without leaving the flow.
                </p>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Copy */}
        <div className="order-1 lg:order-2">
          <Reveal>
            <p className="inline-flex rounded-md border border-line-strong bg-panel/40 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-brand">
              A blank page is a beginning
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <h2
              className={`${display.className} mt-6 max-w-lg text-4xl font-light leading-[1.05] tracking-tight sm:text-6xl`}
            >
              There&apos;s something <span className="block">only you can write.</span>
            </h2>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-gray-600">
              Not a perfect thought. Not a finished idea. Just the first line. Make a little space for it in
              Carta.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link
                href="/sign-up"
                className="group inline-flex h-11 items-center gap-2.5 rounded-full bg-button px-6 text-xs font-medium text-white shadow-lg shadow-red-900/20 transition-[background-color,box-shadow,transform] duration-300 hover:bg-button-hover hover:shadow-xl hover:shadow-red-900/25 active:scale-[0.98]"
              >
                Get started with Carta
                <ArrowUpRight
                  size={14}
                  className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Link>
              <Link
                href="/sign-in"
                className="text-xs text-gray-700 underline-offset-4 transition-colors duration-300 hover:text-brand hover:underline"
              >
                Already have a space? Sign in
              </Link>
            </div>

            <ul className="mt-7 flex flex-wrap gap-2">
              {CHIPS.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-panel/50 px-3 py-1.5 text-[10px] text-gray-700 transition-[border-color,background-color] duration-300 hover:border-red-300 hover:bg-panel"
                >
                  <Icon size={11} className="text-brand" />
                  {label}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}