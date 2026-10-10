"use client";

import { useEffect, useRef, useState } from "react";
import { Fraunces } from "next/font/google";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Check, CircleCheck, FileText, Plus, RotateCcw, Sparkles } from "lucide-react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const display = Fraunces({ subsets: ["latin"], display: "swap", axes: ["opsz"] });
const ease = [0.22, 1, 0.36, 1] as const;

const QUESTION = "What kind of weekend have I been wanting to make room for?";
const ANSWER =
  "Your notes point toward a slower weekend: a walk without a destination, time to finish a book, and a visit to a bookshop. Less filling the day, more paying attention to it.";
const WORDS = ANSWER.split(" ");
const SOURCES = ["A slower Sunday", "The bookshop idea"];
const CHANGES = ["Stop by the bookshop on the way home.", "Leave an hour for the book on the bedside table."];

const HEADING = ["Your", "thoughts.", "A", "new", "way", "to", "see", "them."];

const POINTS = [
  {
    icon: Sparkles,
    title: "Start a note with a little help",
    text: "Ask Carta to create a note from your prompt.",
  },
  {
    icon: CircleCheck,
    title: "The final word stays yours",
    text: "Review and confirm proposed updates, archive actions, or deletions before they apply.",
  },
];

type Decision = "confirmed" | "kept" | null;

export function Ask() {
  const root = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(cardRef, { once: true, amount: 0.35 });

  const [phase, setPhase] = useState(0); // 0 idle, 1 question, 2 thinking, 3 answering, 4 proposal
  const [shown, setShown] = useState(0);
  const [decision, setDecision] = useState<Decision>(null);
  const [runId, setRunId] = useState(0);

  // The conversation plays itself once the card scrolls into view (and again on "Replay")
  useEffect(() => {
    if (!inView) return;
    setDecision(null);

    if (reduce) {
      setPhase(4);
      setShown(WORDS.length);
      return;
    }

    setPhase(0);
    setShown(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let interval: ReturnType<typeof setInterval> | undefined;

    timers.push(setTimeout(() => setPhase(1), 300));
    timers.push(setTimeout(() => setPhase(2), 1400));
    timers.push(
      setTimeout(() => {
        setPhase(3);
        let n = 0;
        interval = setInterval(() => {
          n += 1;
          setShown(n);
          if (n >= WORDS.length) {
            if (interval) clearInterval(interval);
            timers.push(setTimeout(() => setPhase(4), 450));
          }
        }, 45);
      }, 2500),
    );

    return () => {
      timers.forEach(clearTimeout);
      if (interval) clearInterval(interval);
    };
  }, [inView, runId, reduce]);

  // GSAP: heading mask reveal and a gentle parallax on the card
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
            stagger: 0.07,
            scrollTrigger: { trigger: "[data-head]", start: "top 85%", once: true },
          },
        );

        gsap.fromTo(
          "[data-card]",
          { yPercent: 4 },
          {
            yPercent: -4,
            ease: "none",
            scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: 0.8 },
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

  return (
    <section ref={root} id="ask" data-cursor-light className="scroll-mt-8 bg-[#7a1c28] text-[#fff1ee]">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-2 lg:gap-20">
        {/* Example conversation */}
        <div data-card className="order-2 will-change-transform lg:order-1">
          <motion.div
            ref={cardRef}
            initial={reduce ? false : { opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.1, ease }}
            className="rounded-[1.75rem] bg-[#fffaf6] p-5 text-[#1f1a1a] shadow-2xl shadow-black/30 sm:p-7"
          >
            <div className="flex items-center justify-between gap-3 border-b border-red-900/10 pb-4">
              <p className={`${display.className} flex items-center gap-2 text-2xl font-normal`}>
                <Sparkles size={18} className="text-red-800" />
                Ask Carta AI
              </p>
              <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-gray-500">
                Example conversation
              </span>
            </div>

            <div className="min-h-[360px] space-y-5 pt-5">
              {/* You */}
              <AnimatePresence>
                {phase >= 1 && (
                  <motion.div
                    initial={reduce ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease }}
                    className="rounded-xl bg-[#f9e6e1] p-4"
                  >
                    <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-red-800">You</p>
                    <p className="mt-1.5 text-xs leading-relaxed">{QUESTION}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Carta */}
              {phase >= 2 && (
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-red-800">Carta</p>

                  {phase === 2 && (
                    <div className="mt-3 flex gap-1.5" role="status">
                      <span className="sr-only">Thinking</span>
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                          className="size-1.5 rounded-full bg-red-800"
                        />
                      ))}
                    </div>
                  )}

                  {phase >= 3 && (
                    <p className="mt-1.5 grid text-xs leading-relaxed">
                      <span className="sr-only">{ANSWER}</span>
                      <span aria-hidden="true" className="invisible col-start-1 row-start-1">
                        {ANSWER}
                      </span>
                      <span aria-hidden="true" className="col-start-1 row-start-1">
                        {WORDS.slice(0, shown).join(" ")}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {/* Sources + proposal */}
              <AnimatePresence>
                {phase >= 4 && (
                  <motion.div
                    initial={reduce ? false : { opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease }}
                    className="space-y-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] text-gray-500">From your notes:</span>
                      {SOURCES.map((source, i) => (
                        <motion.span
                          key={source}
                          initial={reduce ? false : { opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 + i * 0.12 }}
                          className="inline-flex items-center gap-1.5 rounded-full border border-red-900/15 bg-white px-3 py-1 text-[10px] text-red-900"
                        >
                          <FileText size={10} />
                          {source}
                        </motion.span>
                      ))}
                    </div>

                    <div className="rounded-xl border border-red-900/10 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-medium">
                          {decision === "confirmed" ? "Applied" : "Proposed update"} · A slower Sunday
                        </p>
                        <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-red-800">
                          {decision === null ? "Waiting on you" : decision === "confirmed" ? "Updated" : "No change"}
                        </span>
                      </div>

                      <ul className="mt-3 space-y-1.5">
                        {CHANGES.map((change) => (
                          <li
                            key={change}
                            className={`flex items-start gap-2 text-[11px] leading-relaxed transition-[color,opacity] duration-500 ${
                              decision === "kept" ? "text-gray-400 line-through" : "text-gray-700"
                            }`}
                          >
                            <Plus size={11} className="mt-0.5 shrink-0 text-red-800" />
                            {change}
                          </li>
                        ))}
                      </ul>

                      <div className="mt-4 flex min-h-8 flex-wrap items-center gap-4">
                        <AnimatePresence mode="wait" initial={false}>
                          {decision === null ? (
                            <motion.div
                              key="choices"
                              exit={{ opacity: 0, y: -6 }}
                              transition={{ duration: 0.2 }}
                              className="flex items-center gap-4"
                            >
                              <motion.button
                                type="button"
                                onClick={() => setDecision("confirmed")}
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                className="inline-flex h-8 items-center rounded-full bg-red-800 px-4 text-[11px] font-medium text-white transition-colors duration-300 hover:bg-red-900"
                              >
                                Confirm update
                              </motion.button>
                              <button
                                type="button"
                                onClick={() => setDecision("kept")}
                                className="text-[11px] text-gray-600 transition-colors duration-300 hover:text-red-800"
                              >
                                Keep as is
                              </button>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="result"
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.4, ease }}
                              className="flex flex-wrap items-center gap-4"
                            >
                              <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-700">
                                <Check size={12} className="text-red-800" />
                                {decision === "confirmed"
                                  ? "Done. Your note was updated."
                                  : "Kept as is. Nothing was changed."}
                              </span>
                              <button
                                type="button"
                                onClick={() => setRunId((r) => r + 1)}
                                className="inline-flex items-center gap-1 text-[11px] text-red-800 transition-opacity duration-300 hover:opacity-70"
                              >
                                <RotateCcw size={11} />
                                Replay
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* Copy */}
        <div data-head className="order-1 lg:order-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-red-200">A second look</p>
          <h2
            aria-label="Your thoughts. A new way to see them."
            className={`${display.className} mt-6 max-w-md text-4xl font-light leading-[1.08] tracking-tight text-white sm:text-5xl`}
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

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.9, delay: 0.15, ease }}
            className="mt-7 max-w-md text-sm leading-relaxed text-[#f0cfc9]"
          >
            Ask questions of your own notes. Carta AI helps you find connections, with answers
            grounded in what you&apos;ve written and links back to the source.
          </motion.p>

          <ul className="mt-8 space-y-5">
            {POINTS.map(({ icon: Icon, title, text }, i) => (
              <motion.li
                key={title}
                initial={reduce ? false : { opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.8, delay: 0.25 + i * 0.15, ease }}
                className="flex max-w-md gap-4"
              >
                <Icon size={16} className="mt-0.5 shrink-0 text-red-200" />
                <div>
                  <p className="text-sm font-medium text-white">{title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#f0cfc9]">{text}</p>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}