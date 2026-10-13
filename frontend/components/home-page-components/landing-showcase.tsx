"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Fraunces } from "next/font/google";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Check, MoreHorizontal, Plus, Search, Sparkles, Trash2 } from "lucide-react";

import { Reveal } from "@/components/home-page-components/reveal";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const display = Fraunces({ subsets: ["latin"], display: "swap", axes: ["opsz"] });
const ease = [0.22, 1, 0.36, 1] as const;

type PreviewNote = {
  id: string;
  title: string;
  preview: string;
  stamp: string;
  meta: string;
  body: string[];
  closing: string;
  summary: string;
  points: string[];
  links: string[];
};

// Everything in the preview comes from here
const NOTES: PreviewNote[] = [
  {
    id: "slower",
    title: "A slower Sunday",
    preview: "More noticing. Less rushing. A few things I want to make room for...",
    stamp: "Today · 10:42",
    meta: "October 9 · A note to myself",
    body: [
      "I don't need to fill every hour for a day to feel full.",
      "This weekend, I want to leave a little room. For the market. For a long walk with no destination. For a book I've been meaning to finish.",
      "A few things to come back to:\n— Make breakfast, not just coffee.\n— Take the long way through the park.\n— Write down one thing I noticed.",
      "Maybe a good day is one I actually pay attention to.",
    ],
    closing: "Just a little more present.",
    summary:
      "A reminder that a full day doesn't need a full schedule. Leave room for the market, a long walk and a book.",
    points: ["Leave a little room this weekend", "Take the long way through the park", "Write down one thing you noticed"],
    links: ["october", "remember"],
  },
  {
    id: "bookshop",
    title: "The bookshop idea",
    preview: "A place for stories, coffee, and conversations that run a little long.",
    stamp: "Yesterday · 16:20",
    meta: "October 8 · An idea worth following",
    body: [
      "A small shop with more chairs than shelves.",
      "Stories on one wall, a coffee counter at the back, and a table big enough for strangers to end up talking.\nNothing on the menu that takes more than two minutes to make, so nobody rushes.",
      "First step: visit three shops I love and write down what makes me stay.",
    ],
    closing: "Start small. Start with the chairs.",
    summary:
      "A bookshop built around conversation, with more seating than shelving. The first step is studying what makes you linger in the shops you already love.",
    points: ["More chairs than shelves", "Simple coffee, nothing rushed", "Visit three favourite shops first"],
    links: ["remember", "question"],
  },
  {
    id: "remember",
    title: "Things worth remembering",
    preview: "The light in the kitchen at six. That thing Mum said on the phone.",
    stamp: "Oct 7 · 09:15",
    meta: "October 7 · Small things",
    body: [
      "The light in the kitchen at six, when everything turns the colour of honey.",
      "That thing Mum said on the phone, and how we both laughed a second too long.",
      "The smell of the bookshop on the corner after rain.",
    ],
    closing: "Some days are just a list of small things.",
    summary: "Three small moments worth keeping: the kitchen light, a phone call, and the smell of a bookshop after rain.",
    points: ["Kitchen light at six", "A phone call with Mum", "The bookshop after rain"],
    links: ["slower", "bookshop"],
  },
  {
    id: "question",
    title: "A question for later",
    preview: "What would I make if I stopped trying to make it perfect?",
    stamp: "Oct 6 · 21:08",
    meta: "October 6 · To revisit",
    body: [
      "What would I make if I stopped trying to make it perfect?",
      "Maybe something smaller. Maybe something I'd actually finish.\nMaybe the point was never the finished thing.",
      "Come back to this on a slow morning.",
    ],
    closing: "No answer needed yet.",
    summary: "An open question about perfectionism, parked for a slow morning rather than answered today.",
    points: ["Smaller might be better", "Finishing beats perfecting", "Revisit on a slow morning"],
    links: ["slower", "bookshop"],
  },
  {
    id: "october",
    title: "Small plans for October",
    preview: "Two long walks, one letter to write, and one empty Saturday left on purpose.",
    stamp: "Oct 5 · 18:40",
    meta: "October 5 · Plans",
    body: [
      "Two long walks, ideally with no phone.",
      "One letter to write to someone I've been meaning to thank.",
      "And one Saturday left completely empty, on purpose.",
    ],
    closing: "Fewer plans. More room.",
    summary: "A short list of gentle plans for the month, including a day deliberately left empty.",
    points: ["Two long walks", "One letter to write", "An empty Saturday"],
    links: ["slower", "question"],
  },
  {
    id: "soup",
    title: "The soup I keep making",
    preview: "Onions, a bay leaf, and patience. Better on the second day.",
    stamp: "Oct 3 · 12:05",
    meta: "October 3 · Kitchen",
    body: [
      "Onions, slowly, until they give up. A bay leaf. Stock. Salt at the end, not the start.",
      "Better on the second day, which is a good rule for most things.",
    ],
    closing: "Patience tastes like this.",
    summary: "A simple soup recipe and a reminder that some things improve when you leave them alone.",
    points: ["Cook the onions slowly", "Salt at the end", "Better on day two"],
    links: ["remember", "october"],
  },
  {
    id: "words",
    title: "Words I keep coming back to",
    preview: "Unhurried. Threshold. Tend. Quietly.",
    stamp: "Sep 30 · 22:30",
    meta: "September 30 · Collecting",
    body: ["Unhurried.", "Threshold.", "Tend.", "Quietly."],
    closing: "A small collection.",
    summary: "A short list of words worth keeping close.",
    points: ["Unhurried", "Threshold", "Tend"],
    links: ["slower", "question"],
  },
];

const HEADLINE = ["Less", "noise.", "More", "of", "you."];

function useIsDesktop() {
  const [value, setValue] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setValue(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return value;
}

export function LandingShowcase() {
  const root = useRef<HTMLElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const isDesktop = useIsDesktop();

  const [activeId, setActiveId] = useState(NOTES[0].id);
  const [query, setQuery] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);

  const active = NOTES.find((n) => n.id === activeId) ?? NOTES[0];
  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      q
        ? NOTES.filter((n) => `${n.title} ${n.preview} ${n.body.join(" ")}`.toLowerCase().includes(q))
        : NOTES,
    [q],
  );

  useEffect(() => {
    editorRef.current?.scrollTo({ top: 0 });
  }, [activeId]);

  // GSAP: headline mask reveal, frame tilt-in on scroll, soft cursor dot
  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          "[data-w]",
          { yPercent: 115, opacity: 1 },
          {
            yPercent: 0,
            duration: 1.2,
            ease: "expo.out",
            stagger: 0.08,
            scrollTrigger: { trigger: "[data-head]", start: "top 85%", once: true },
          },
        );

        gsap.fromTo(
          "[data-frame]",
          { y: 90, scale: 0.93, rotateX: 9, transformOrigin: "50% 100%" },
          {
            y: 0,
            scale: 1,
            rotateX: 0,
            ease: "none",
            scrollTrigger: {
              trigger: "[data-frame]",
              start: "top 92%",
              end: "top 38%",
              scrub: 0.8,
            },
          },
        );
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set("[data-w]", { opacity: 1 });
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  const asideMotion = isDesktop
    ? {
        initial: { width: 0, opacity: 0 },
        animate: { width: 272, opacity: 1 },
        exit: { width: 0, opacity: 0 },
      }
    : {
        initial: { height: 0, opacity: 0 },
        animate: { height: "auto", opacity: 1 },
        exit: { height: 0, opacity: 0 },
      };

  const eyebrow = "font-mono text-[10px] uppercase tracking-[0.2em] text-brand";

  return (
    <section
      ref={root}
      id="inside"
      className="relative scroll-mt-8 border-t border-line bg-page text-ink"
    >
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
        {/* Heading */}
        <div className="grid items-end gap-8 md:grid-cols-[1.4fr_1fr]">
          <div data-head>
            <p className={eyebrow}>The space itself</p>
            <h2
              aria-label="Less noise. More of you."
              className={`${display.className} mt-6 text-4xl font-light leading-[1.05] tracking-tight sm:text-6xl`}
            >
              {HEADLINE.map((word, i) => (
                <span key={i} aria-hidden="true">
                  <span className="-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-top">
                    <span data-w className="inline-block opacity-0 will-change-transform">
                      {word}
                    </span>
                  </span>{" "}
                </span>
              ))}
            </h2>
          </div>
          <Reveal delay={0.15}>
            <p className="max-w-sm text-sm leading-relaxed text-gray-600 md:ml-auto">
              A calm place to inscribe a note, revisit an idea, and pick up exactly where you left off.
            </p>
          </Reveal>
        </div>

        {/* Product preview */}
        <div className="mt-12 [perspective:1400px]">
          <div
            data-frame
            className="overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl shadow-red-900/10 will-change-transform"
          >
            {/* Window bar */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-line bg-chrome px-4 py-2.5">
              <div className="flex gap-1.5" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="size-2 rounded-full bg-line-strong" />
                ))}
              </div>
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-gray-500">
                carta / notes
              </span>
              <span className="justify-self-end font-mono text-[9px] uppercase tracking-[0.18em] text-gray-500">
                Product preview
              </span>
            </div>

            <div className="flex flex-col md:h-[540px] md:flex-row">
              {/* Notes list (scrolls on its own) */}
              <div className="flex min-h-0 flex-col border-b border-line md:w-[260px] md:shrink-0 md:border-b-0 md:border-r">
                <div className="px-4 pb-3 pt-5">
                  <div className="flex items-baseline justify-between">
                    <h3 className={`${display.className} text-xl font-normal`}>Your notes</h3>
                    <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-gray-500">
                      {visible.length} {visible.length === 1 ? "note" : "notes"}
                    </span>
                  </div>
                  <label className="mt-3 flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-2 transition-[border-color,box-shadow] duration-300 focus-within:border-red-300 focus-within:ring-4 focus-within:ring-red-100">
                    <Search size={13} className="shrink-0 text-gray-400" />
                    <span className="sr-only">Search title or content</span>
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search title or content"
                      className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-gray-400"
                    />
                  </label>
                </div>

                <ul className="max-h-64 min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-4 [scrollbar-color:var(--carta-scroll)_transparent] [scrollbar-width:thin] md:max-h-none">
                  {visible.length === 0 && (
                    <li className="px-2 py-8 text-center text-xs text-gray-500">No notes match.</li>
                  )}
                  {visible.map((note, i) => {
                    const selected = note.id === activeId;
                    return (
                      <motion.li
                        key={note.id}
                        initial={reduce ? false : { opacity: 0, y: 14 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7, delay: Math.min(i, 5) * 0.07, ease }}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveId(note.id)}
                          aria-current={selected ? "true" : undefined}
                          className={`block w-full rounded-xl border p-3.5 text-left transition-[background-color,border-color,transform,box-shadow] duration-300 ease-out ${
                            selected
                              ? "border-tint-edge bg-tint shadow-sm"
                              : "border-line bg-panel hover:-translate-y-0.5 hover:border-red-300 hover:shadow-md hover:shadow-red-900/5"
                          }`}
                        >
                          <span className={`${display.className} block text-[15px] leading-snug`}>
                            {note.title}
                          </span>
                          <span className="mt-1 line-clamp-2 block text-[11px] leading-relaxed text-gray-600">
                            {note.preview}
                          </span>
                          <span className="mt-2 block text-[10px] text-gray-500">{note.stamp}</span>
                        </button>
                      </motion.li>
                    );
                  })}
                </ul>
              </div>

              {/* Editor */}
              <div className="flex min-w-0 flex-1 flex-col md:min-h-0">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-500">
                    <Check size={12} className="text-brand" />
                    All changes saved
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSummaryOpen((v) => !v)}
                      aria-expanded={summaryOpen}
                      className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-[11px] font-medium transition-[background-color,border-color,color,transform] duration-300 active:scale-95 ${
                        summaryOpen
                          ? "border-red-800 bg-red-800 text-white hover:bg-red-900"
                          : "border-line-strong bg-panel text-gray-700 hover:border-red-300 hover:text-brand"
                      }`}
                    >
                      <Sparkles size={12} />
                      Summary
                    </button>
                    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}>
                      <Link
                        href="/sign-up"
                        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--carta-button)] px-3.5 text-[11px] font-medium text-white transition-colors duration-300 hover:bg-[var(--carta-button-hover)]"
                      >
                        <Plus size={12} />
                        Inscribe Note
                      </Link>
                    </motion.div>
                  </div>
                </div>

                <div ref={editorRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-7 sm:px-10">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.article
                      key={active.id}
                      initial={reduce ? false : { opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? undefined : { opacity: 0, y: -10 }}
                      transition={{ duration: 0.4, ease }}
                    >
                      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-gray-500">
                        {active.meta}
                      </p>
                      <h3
                        className={`${display.className} mt-5 text-3xl font-normal leading-tight tracking-tight sm:text-[2rem]`}
                      >
                        {active.title}
                      </h3>
                      <div className="mt-6 space-y-4 text-[13px] leading-relaxed text-gray-800">
                        {active.body.map((p, i) => (
                          <p key={i} className="whitespace-pre-line">
                            {p}
                          </p>
                        ))}
                      </div>
                      <div className="mt-8 flex items-center justify-between text-[11px] text-gray-500">
                        <span>{active.closing}</span>
                        <span className="flex items-center gap-3" aria-hidden="true">
                          <Trash2 size={13} />
                          <MoreHorizontal size={14} />
                        </span>
                      </div>
                    </motion.article>
                  </AnimatePresence>
                </div>
              </div>

              {/* Summary panel */}
              <AnimatePresence initial={false}>
                {summaryOpen && (
                  <motion.aside
                    key="summary"
                    {...asideMotion}
                    transition={reduce ? { duration: 0 } : { duration: 0.55, ease }}
                    aria-label="Note summary"
                    className="shrink-0 overflow-hidden border-t border-line bg-panel md:border-l md:border-t-0"
                  >
                    <div className="w-full p-5 md:h-full md:w-[272px] md:overflow-y-auto">
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-full bg-red-800 text-white">
                          <Sparkles size={13} />
                        </span>
                        <p className="text-sm font-semibold">Summary</p>
                      </div>

                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                          key={active.id}
                          initial={reduce ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={reduce ? undefined : { opacity: 0 }}
                          transition={{ duration: 0.3, ease }}
                          className="mt-4 space-y-5"
                        >
                          <p className="text-xs leading-relaxed text-gray-700">{active.summary}</p>

                          <div>
                            <h4 className="font-mono text-[9px] uppercase tracking-[0.18em] text-gray-500">
                              Key points
                            </h4>
                            <ol className="mt-2.5 space-y-2.5">
                              {active.points.map((point, i) => (
                                <li key={point} className="flex gap-2.5 text-xs text-gray-700">
                                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-red-100 text-[9px] font-semibold text-brand">
                                    {i + 1}
                                  </span>
                                  {point}
                                </li>
                              ))}
                            </ol>
                          </div>

                          <div>
                            <h4 className="font-mono text-[9px] uppercase tracking-[0.18em] text-gray-500">
                              Connected notes
                            </h4>
                            <ul className="mt-2.5 space-y-2">
                              {active.links.map((id) => {
                                const linked = NOTES.find((n) => n.id === id);
                                if (!linked) return null;
                                return (
                                  <li key={id}>
                                    <button
                                      type="button"
                                      onClick={() => setActiveId(id)}
                                      className="block w-full rounded-lg border border-line p-2.5 text-left transition-[border-color,background-color,transform] duration-300 hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-50"
                                    >
                                      <span className="block truncate text-xs font-medium">{linked.title}</span>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </motion.aside>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Ask Carta */}
        <Reveal y={24} className="mt-18">
          <div
            id="ask"
            className="flex scroll-mt-8 items-start gap-4 rounded-2xl border border-line bg-panel p-5 shadow-sm"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-800 text-white">
              <Sparkles size={14} />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-brand">Ask Carta</p>
              <p className={`${display.className} mt-1.5 text-lg`}>What did I write about slower days?</p>
              <p className="mt-2 text-xs leading-relaxed text-gray-600">
                It came up in two notes: &ldquo;A slower Sunday&rdquo; and &ldquo;Small plans for
                October&rdquo;. Both ask for fewer plans and more room to notice things.
              </p>
            </div>
          </div>
        </Reveal>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-gray-500">
            A note doesn&apos;t have to be important yet. It just needs somewhere to begin.
          </p>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand">
            01 / Your notes, in view
          </span>
        </div>
      </div>
    </section>
  );
}