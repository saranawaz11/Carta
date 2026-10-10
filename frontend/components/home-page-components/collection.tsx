import { Fraunces } from "next/font/google";
import { Archive, Download, Trash2 } from "lucide-react";

import { Reveal } from "@/components/home-page-components/reveal";

const display = Fraunces({ subsets: ["latin"], display: "swap", axes: ["opsz"] });

const eyebrow = "font-mono text-[10px] uppercase tracking-[0.2em] text-red-800";

const ITEMS = [
  {
    icon: Archive,
    title: "Set it aside, not away.",
    text: "Archive notes that aren't for right now. Restore them when their moment comes.",
    flow: "Archive > Restore",
  },
  {
    icon: Trash2,
    title: "Room to reconsider.",
    text: "Move a note to Trash, restore it, or permanently delete it when you're ready.",
    flow: "Trash > Restore or delete",
  },
  {
    icon: Download,
    title: "Take a copy with you.",
    text: "Export notes from Archive or Trash as JSON, for a copy outside Carta.",
    flow: "Archive / Trash > Export JSON",
  },
];

export function Collection() {
  return (
    <section
      id="collection"
      className="scroll-mt-8 border-t border-red-900/10 bg-[#f7eeea] text-[#1f1a1a]"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid items-end gap-8 md:grid-cols-[1.4fr_1fr]">
          <Reveal>
            <p className={eyebrow}>Keep a little breathing room</p>
            <h2
              className={`${display.className} mt-6 text-4xl font-light leading-[1.05] tracking-tight sm:text-6xl`}
            >
              A collection, not a clutter.
            </h2>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="max-w-xs text-sm leading-relaxed text-gray-600 md:ml-auto">
              Keep your present in view without losing the thoughts you might return to.
            </p>
          </Reveal>
        </div>

        <ul className="mt-12 grid gap-4 md:grid-cols-3">
          {ITEMS.map(({ icon: Icon, title, text, flow }, i) => (
            <Reveal
              as="li"
              key={title}
              delay={i * 0.08}
              lift
              className="flex flex-col rounded-2xl border border-red-900/10 bg-[#fffaf8] p-6 transition-[box-shadow,border-color] duration-300 hover:border-red-300 hover:shadow-lg hover:shadow-red-900/5"
            >
              <Icon size={18} strokeWidth={1.5} className="text-red-800" aria-hidden="true" />
              <h3 className={`${display.className} mt-6 text-2xl font-normal leading-snug tracking-tight`}>
                {title}
              </h3>
              <p className="mt-3 text-xs leading-relaxed text-gray-600">{text}</p>
              <p className="mt-5 font-mono text-[9px] tracking-[0.04em] text-red-800">{flow}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}