"use client";

import { useEffect, useRef, useState } from "react";
import { Fraunces } from "next/font/google";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Check, Plus, Search } from "lucide-react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const display = Fraunces({ subsets: ["latin"], display: "swap", axes: ["opsz"] });
const ease = [0.22, 1, 0.36, 1] as const;

const STEPS = [
  {
    n: "01",
    title: "Catch it while it\u2019s here.",
    text: "Quick capture for the passing thought. Inscribe a note when you want a little more room.",
    label: "Quick capture",
    icon: Plus,
    sample: "An idea for the first chapter\u2026",
    delay: 300,
  },
  {
    n: "02",
    title: "Let the thought unfold.",
    text: "Keep writing. Changes save as you pause, so your attention can stay with the thought.",
    label: "All changes saved",
    icon: Check,
    sample: "What if the story begins at the end?",
    delay: 900,
  },
  {
    n: "03",
    title: "Come back with purpose.",
    text: "Search your title or content. Revisit a note, or give the next step a place in your tasks.",
    label: "Find your thread",
    icon: Search,
    sample: "first chapter",
    delay: 1500,
  },
];

const HEADING = ["A", "rhythm,", "not", "a", "routine."];

function Typing({ text, start, delay }: { text: string; start: boolean; delay: number }) {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!start) return;
    if (reduce) {
      setCount(text.length);
      return;
    }
    let i = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    const timer = setTimeout(() => {
      interval = setInterval(() => {
        i += 1;
        setCount(i);
        if (i >= text.length && interval) clearInterval(interval);
      }, 50);
    }, delay);
    return () => {
      clearTimeout(timer);
      if (interval) clearInterval(interval);
    };
  }, [start, text, delay, reduce]);

  const typing = start && count < text.length;

  return (
    <span className="min-w-0">
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{text.slice(0, count)}</span>
      {typing && (
        <motion.span
          aria-hidden="true"
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.9, repeat: Infinity }}
          className="ml-0.5 inline-block h-3 w-px translate-y-0.5 bg-red-800"
        />
      )}
    </span>
  );
}

function Step({ step, index }: { step: (typeof STEPS)[number]; index: number }) {
  const ref = useRef<HTMLLIElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -80px 0px" });
  const reduce = useReducedMotion();
  const Icon = step.icon;

  return (
    <motion.li
      ref={ref}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.9, delay: index * 0.14, ease }}
    >
      <div className="flex items-center gap-4">
        <span className="font-mono text-[10px] text-brand">{step.n}</span>
        <span data-line className="h-px flex-1 origin-left bg-red-900/20" />
      </div>
      <h3 className={`${display.className} mt-6 text-2xl font-normal leading-snug`}>{step.title}</h3>
      <p className="mt-3 max-w-xs text-xs leading-relaxed text-gray-600">{step.text}</p>

      <motion.div
        whileHover={{ y: -3, transition: { type: "spring", stiffness: 300, damping: 20 } }}
        className="mt-6 rounded-xl border border-line bg-panel p-4 shadow-sm shadow-red-900/5"
      >
        <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-gray-500">{step.label}</p>
        <p className="mt-2.5 flex items-center gap-2.5 text-xs text-gray-800">
          <motion.span
            initial={reduce ? false : { scale: 0, rotate: -40 }}
            animate={inView ? { scale: 1, rotate: 0 } : undefined}
            transition={{ type: "spring", stiffness: 320, damping: 15, delay: 0.5 + index * 0.15 }}
            className="shrink-0 text-brand"
          >
            <Icon size={14} />
          </motion.span>
          <Typing text={step.sample} start={inView} delay={step.delay} />
        </p>
      </motion.div>
    </motion.li>
  );
}

export function Rhythm() {
  const root = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  // GSAP: heading mask reveal, then the three connecting lines draw across
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
          "[data-line]",
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 1.4,
            ease: "expo.out",
            stagger: 0.18,
            scrollTrigger: { trigger: "[data-grid]", start: "top 82%", once: true },
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
    <section ref={root} id="rhythm" className="scroll-mt-8 border-y border-line bg-sand text-ink">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div data-head className="grid gap-4 md:grid-cols-[1.5fr_1fr] md:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand">
              From fleeting to found
            </p>
            <h2
              aria-label="A rhythm, not a routine."
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
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.9, delay: 0.2, ease }}
            className="text-xs text-gray-600 md:text-right"
          >
            Begin anywhere. Return when you&apos;re ready.
          </motion.p>
        </div>

        <ol data-grid className="mt-14 grid gap-12 md:grid-cols-3 md:gap-8">
          {STEPS.map((step, i) => (
            <Step key={step.n} step={step} index={i} />
          ))}
        </ol>
      </div>
    </section>
  );
}