"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Fraunces } from "next/font/google";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { BookOpen, Check, PenLine, PenTool, Sparkles, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const display = Fraunces({ subsets: ["latin"], display: "swap", axes: ["opsz"] });
const ease = [0.22, 1, 0.36, 1] as const;

type CategoryId = "study" | "creative" | "everyday";

type Category = {
  id: CategoryId;
  label: string;
  short: string;
  icon: LucideIcon;
  headline: string;
  notes: { title: string; body: string; follow: string; tags: string }[];
  prompt: string;
  hint: string;
  ask: string;
  card: { title: string; example: string };
};

// All example content lives here
const CATEGORIES: Category[] = [
  {
    id: "study",
    label: "Study & learning",
    short: "Study",
    icon: BookOpen,
    headline: "Keep the question. Find the connection.",
    notes: [
      {
        title: "Why do we forget?",
        body: "Memory isn't a recording. Retrieval helps strengthen what we can recall.",
        follow: "Question: why does explaining an idea make it easier to remember?",
        tags: "Lecture notes · Cognitive science",
      },
      {
        title: "Reading: a room of one's own",
        body: "A room is more than a place. It is permission to think without interruption.",
        follow: "Follow up: connect this to the essay on attention.",
        tags: "Reading notes · Literature",
      },
    ],
    prompt: "What do I understand—and what am I still wondering?",
    hint: "Try it as the first line of a note. Leave room for the answer to change.",
    ask: "What connections are there between my reading notes?",
    card: { title: "For the thing you're trying to learn", example: "Example note: Why do we forget?" },
  },
  {
    id: "creative",
    label: "Creative work",
    short: "Creative",
    icon: PenTool,
    headline: "Keep the spark. Follow it somewhere.",
    notes: [
      {
        title: "Opening scene, second attempt",
        body: "She arrives before anyone else, and the room is still holding its breath.",
        follow: "Try: start with the sound, not the setting.",
        tags: "Draft notes · Short story",
      },
      {
        title: "A colour I can't name",
        body: "Somewhere between dust and rose. It keeps turning up in the things I'm drawn to.",
        follow: "Follow up: collect five objects in this colour.",
        tags: "Studio notes · Colour",
      },
    ],
    prompt: "What image or idea keeps coming back to me?",
    hint: "Write it down before you decide what it's for. Let it stay unfinished.",
    ask: "Which of my ideas keep coming back?",
    card: { title: "For the thing you want to make", example: "Example note: Opening scene, second attempt" },
  },
  {
    id: "everyday",
    label: "Everyday life",
    short: "Everyday",
    icon: Sun,
    headline: "Keep the small things. Notice the pattern.",
    notes: [
      {
        title: "Things for the weekend",
        body: "A slow breakfast, the market, a call to Mum.",
        follow: "Maybe: leave Saturday afternoon empty.",
        tags: "Weekend · Plans",
      },
      {
        title: "What helped this week",
        body: "Walking before work. Switching the phone off at nine. Soup on Sunday.",
        follow: "Follow up: do more of these.",
        tags: "Reflections · Habits",
      },
    ],
    prompt: "What would make today feel a little more like me?",
    hint: "Answer it in a line. Come back to it tomorrow and see what changed.",
    ask: "What helped me feel calmer last week?",
    card: { title: "For the life between the plans", example: "Example note: A few things for this weekend" },
  },
];

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};

const HEADING = ["What\u2019s", "on", "your", "mind?"];

export function Mind() {
  const root = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const [activeId, setActiveId] = useState<CategoryId>("study");

  const active = CATEGORIES.find((c) => c.id === activeId) ?? CATEGORIES[0];
  const others = CATEGORIES.filter((c) => c.id !== activeId);

  // GSAP: heading mask reveal + the big panel rising into place
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
            stagger: 0.09,
            scrollTrigger: { trigger: "[data-head]", start: "top 85%", once: true },
          },
        );

        gsap.from("[data-panel]", {
          y: 70,
          opacity: 0,
          duration: 1.2,
          ease: "expo.out",
          scrollTrigger: { trigger: "[data-panel]", start: "top 88%", once: true },
        });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set("[data-w]", { opacity: 1 });
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  function onTabKeys(e: KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = CATEGORIES.findIndex((c) => c.id === activeId);
    const step = e.key === "ArrowRight" ? 1 : CATEGORIES.length - 1;
    const next = CATEGORIES[(i + step) % CATEGORIES.length];
    setActiveId(next.id);
    document.getElementById(`mind-tab-${next.id}`)?.focus();
  }

  const eyebrow = "font-mono text-[10px] uppercase tracking-[0.2em] text-brand";

  return (
    <section ref={root} id="mind" className="mx-auto w-full max-w-6xl scroll-mt-8 px-4 py-10 sm:px-6 sm:py-20">
      {/* Heading */}
      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-end">
        <div data-head>
          <p className={eyebrow}>Different lives. Same blank page.</p>
          <h2
            aria-label="What’s on your mind?"
            className={`${display.className} mt-5 text-4xl font-light leading-[1.05] tracking-tight sm:text-6xl`}
          >
            {HEADING.map((word, i) => (
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

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.9, delay: 0.15, ease }}
          className="md:justify-self-end"
        >
          <p className="max-w-sm text-sm leading-relaxed text-gray-600">
            Start with what matters to you. Explore a few example notes and prompts for the way you
            think.
          </p>
          <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.18em] text-gray-500 md:text-right">
            Example notes · {active.short} selected
          </p>
        </motion.div>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Choose what's on your mind"
        onKeyDown={onTabKeys}
        className="mt-8 flex flex-wrap gap-3"
      >
        {CATEGORIES.map((c) => {
          const on = c.id === activeId;
          const Icon = c.icon;
          return (
            <motion.button
              key={c.id}
              id={`mind-tab-${c.id}`}
              role="tab"
              type="button"
              aria-selected={on}
              aria-controls="mind-panel"
              tabIndex={on ? 0 : -1}
              onClick={() => setActiveId(c.id)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.96 }}
              className="relative inline-flex h-11 items-center rounded-full border border-line-strong bg-panel px-5 text-xs font-medium"
            >
              {on && (
                <motion.span
                  layoutId="mind-pill"
                  transition={{ type: "spring", stiffness: 380, damping: 34 }}
                  className="absolute -inset-px rounded-full bg-[var(--carta-button)]"
                />
              )}
              <span
                className={`relative z-10 inline-flex items-center gap-2 transition-colors duration-300 ${
                  on ? "text-white" : "text-gray-800"
                }`}
              >
                <Icon size={14} />
                {c.label}
                {on && <Check size={13} />}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Big panel */}
      <div
        data-panel
        id="mind-panel"
        role="tabpanel"
        aria-labelledby={`mind-tab-${active.id}`}
        className="mt-8 rounded-3xl border border-red-900/5 bg-[var(--carta-blush)] p-5 sm:p-8"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active.id}
            variants={container}
            initial={reduce ? false : "hidden"}
            animate="show"
            exit={reduce ? undefined : { opacity: 0, y: -10, transition: { duration: 0.25 } }}
            className="grid gap-8 lg:grid-cols-[1.35fr_1fr]"
          >
            {/* Left: headline + example notes */}
            <div>
              <motion.div variants={item} className="flex flex-wrap items-start justify-between gap-3">
                <h3 className={`${display.className} max-w-md text-2xl font-normal leading-tight sm:text-3xl`}>
                  {active.headline}
                </h3>
                <span className="rounded-full bg-[var(--carta-blush-deep)] px-3 py-1 text-[10px] text-brand-strong">
                  {active.label}
                </span>
              </motion.div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {active.notes.map((note) => (
                  <motion.article
                    key={note.title}
                    variants={item}
                    whileHover={{ y: -4, transition: { type: "spring", stiffness: 300, damping: 20 } }}
                    className="flex flex-col rounded-2xl bg-panel p-5 shadow-sm shadow-red-900/5"
                  >
                    <PenLine size={14} className="text-brand" />
                    <h4 className={`${display.className} mt-4 text-xl font-normal leading-snug`}>
                      {note.title}
                    </h4>
                    <p className="mt-3 text-xs leading-relaxed text-gray-600">{note.body}</p>
                    <p className="mt-3 text-xs leading-relaxed text-gray-600">{note.follow}</p>
                    <p className="mt-auto pt-5 text-[10px] text-gray-500">{note.tags}</p>
                  </motion.article>
                ))}
              </div>
            </div>

            {/* Right: a place to begin */}
            <div className="flex flex-col">
              <motion.p variants={item} className={eyebrow}>
                A place to begin
              </motion.p>
              <motion.p
                variants={item}
                className={`${display.className} mt-4 text-2xl font-normal leading-snug text-brand sm:text-[1.7rem]`}
              >
                &ldquo;{active.prompt}&rdquo;
              </motion.p>
              <motion.p variants={item} className="mt-4 max-w-xs text-xs leading-relaxed text-gray-600">
                {active.hint}
              </motion.p>
              <motion.div
                variants={item}
                className="mt-6 rounded-xl border border-red-900/5 bg-[var(--carta-cream)] p-4 lg:mt-auto"
              >
                <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-gray-500">
                  <Sparkles size={11} className="text-brand" />
                  Or ask Carta AI
                </p>
                <p className="mt-2 text-xs leading-relaxed text-gray-800">{active.ask}</p>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* The other two lives */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeId}
          variants={container}
          initial={reduce ? false : "hidden"}
          animate="show"
          exit={reduce ? undefined : { opacity: 0, transition: { duration: 0.2 } }}
          className="mt-10 grid gap-4 md:grid-cols-2"
        >
          {others.map((c) => {
            const Icon = c.icon;
            return (
              <motion.button
                key={c.id}
                type="button"
                variants={item}
                onClick={() => setActiveId(c.id)}
                whileHover={{ y: -4, transition: { type: "spring", stiffness: 300, damping: 20 } }}
                whileTap={{ scale: 0.99 }}
                className="rounded-2xl border border-line bg-panel/60 p-5 text-left transition-[background-color,border-color,box-shadow] duration-300 hover:border-red-300 hover:bg-panel hover:shadow-lg hover:shadow-red-900/5"
              >
                <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-brand">
                  <Icon size={13} />
                  {c.label}
                </span>
                <span className={`${display.className} mt-3 block text-xl font-normal leading-snug`}>
                  {c.card.title}
                </span>
                <span className="mt-2 block text-[11px] text-gray-500">{c.card.example}</span>
                <span className="mt-3 block text-[11px] leading-relaxed text-brand">
                  &ldquo;{c.prompt}&rdquo;
                </span>
              </motion.button>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}