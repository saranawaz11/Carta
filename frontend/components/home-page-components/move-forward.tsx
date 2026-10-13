import { Fraunces } from "next/font/google";
import { Plus, Sparkles, SquarePen } from "lucide-react";

import { Reveal } from "@/components/home-page-components/reveal";

const display = Fraunces({ subsets: ["latin"], display: "swap", axes: ["opsz"] });

const eyebrow = "font-mono text-[10px] uppercase tracking-[0.2em] text-brand";

const CARDS = [
  {
    icon: Sparkles,
    title: "Ask the LLM questions about your notes",
    tag: "Note intelligence",
    text: "Ask Carta AI to summarize what you've written, connect ideas across notes, or help you remember what you were thinking. Answers are grounded in your own writing, with source links back to the original notes.",
    points: [
      "Answers are built from the notes you've already written.",
      "Source links take you back to the exact notes that informed the answer.",
    ],
    boxed: true,
  },
  {
    icon: SquarePen,
    title: "Let the LLM perform note CRUD operations",
    tag: "Assisted note actions",
    text: "The LLM can create notes from prompts, propose updates to existing notes, and help with archive or deletion actions. Review proposed updates, archive actions, and deletions before they apply—the final word stays yours.",
    points: [
      "Create notes from a prompt in your Carta AI conversation.",
      "Review proposed updates, archive actions, and deletions before they apply.",
    ],
    boxed: true,
  },
  {
    icon: Plus,
    title: "Quick Capture",
    tag: "Fast note entry",
    text: "Quick Capture is the fastest way to turn a passing thought into a note. It lives in the sidebar, so you can start writing immediately without losing your place in the workspace.",
    points: [
      "Start a new note from the sidebar without leaving your current view.",
      "Capture a thought before it slips away, then refine it later.",
    ],
    boxed: false,
  },
];

export function MoveForward() {
  return (
    <section
      id="move-forward"
      className="scroll-mt-8 border-t border-line bg-band text-ink"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid items-end gap-8 md:grid-cols-[1.4fr_1fr]">
          <Reveal>
            <p className={eyebrow}>What Carta can do</p>
            <h2
              className={`${display.className} mt-6 max-w-xl text-4xl font-light leading-[1.05] tracking-tight sm:text-6xl`}
            >
              Three ways Carta helps you move forward.
            </h2>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="max-w-sm text-sm leading-relaxed text-gray-600 md:ml-auto">
              Ask questions about your notes, let the LLM perform note operations, and capture ideas
              quickly. Each capability is designed to help you keep your thoughts, follow them, and turn
              them into something useful.
            </p>
          </Reveal>
        </div>

        <ul className="mt-12 grid items-start gap-4 md:grid-cols-3">
          {CARDS.map(({ icon: Icon, title, tag, text, points, boxed }, i) => (
            <Reveal
              as="li"
              key={title}
              delay={i * 0.08}
              lift
              className="rounded-2xl border border-line bg-surface p-5 transition-[box-shadow,border-color] duration-300 hover:border-red-300 hover:shadow-lg hover:shadow-red-900/5"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-brand">
                  <Icon size={14} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className={`${display.className} text-xl font-normal leading-snug tracking-tight`}>
                    {title}
                  </h3>
                  <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.18em] text-brand">
                    {tag}
                  </p>
                </div>
              </div>

              <p className="mt-5 text-xs leading-relaxed text-gray-600">{text}</p>

              <ul className="mt-5 space-y-2">
                {points.map((point) => (
                  <li
                    key={point}
                    className={`flex gap-2.5 text-[11px] leading-relaxed text-gray-700 ${
                      boxed ? "rounded-lg border border-line bg-panel px-3 py-2.5" : "px-1"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="mt-[0.45rem] size-1 shrink-0 rounded-full bg-red-800"
                    />
                    {point}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}