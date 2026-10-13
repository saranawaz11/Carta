"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type PointerEvent, type ReactNode } from "react";
import { ClerkLoading } from "@clerk/nextjs";
import { Fraunces } from "next/font/google";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowUpRight, Check, CircleCheck, FileText, Search, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/home-page-components/theme-toggle";

const display = Fraunces({ subsets: ["latin"], display: "swap", axes: ["opsz"] });
const ease = [0.22, 1, 0.36, 1] as const;

const eyebrow = "font-mono text-[10px] uppercase tracking-[0.2em] text-brand";

const COPY = {
  "sign-in": {
    eyebrow: "A home for your inner world",
    lead: "Your thoughts.",
    accent: "Right where you left them.",
    blurb: "A calm place to return to. Pick up a thought, revisit an idea, and find your thread again.",
    formEyebrow: "Your space awaits",
    title: "Welcome back.",
    sub: "Sign in to pick up where you left off.",
    topText: "New to Carta?",
    topLabel: "Sign up",
    topHref: "/sign-up",
    switchText: "New to Carta?",
    switchLabel: "Make a space of your own",
    switchHref: "/sign-up",
  },
  "sign-up": {
    eyebrow: "A blank page is a beginning",
    lead: "A little space.",
    accent: "All your own.",
    blurb:
      "For the passing thought, the unfinished idea, and everything you might return to. Make a little room for it in Carta.",
    formEyebrow: "Made for you",
    title: "Begin with Carta.",
    sub: "Create your account. The first line is yours.",
    topText: "Already have a space?",
    topLabel: "Sign in",
    topHref: "/sign-in",
    switchText: "Already have a space?",
    switchLabel: "Sign in",
    switchHref: "/sign-in",
  },
} as const;

const THOUGHTS = [
  { text: "Maybe the small things are the big things.", stamp: "Today · 10:42" },
  { text: "What would I make if I stopped trying to make it perfect?", stamp: "Yesterday · 21:08" },
  { text: "Fewer plans. More room.", stamp: "Oct 5 · 18:40" },
];

function Line({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <span className="-mb-[0.12em] block overflow-hidden pb-[0.12em]">
      <motion.span
        className={`block ${className}`}
        initial={reduce ? false : { y: "110%" }}
        animate={{ y: 0 }}
        exit={reduce ? undefined : { y: "-110%" }}
        transition={{ duration: 0.7, delay, ease }}
      >
        {children}
      </motion.span>
    </span>
  );
}

function Preview({
  winStyle,
  cardStyle,
}: {
  winStyle: Record<string, unknown>;
  cardStyle: Record<string, unknown>;
}) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setI((v) => (v + 1) % THOUGHTS.length), 5200);
    return () => window.clearInterval(id);
  }, [reduce]);

  const thought = THOUGHTS[i];

  return (
    <div className="relative mt-7 hidden max-w-md md:block" aria-hidden="true">
      <motion.div style={winStyle}>
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-xl shadow-red-900/10">
          <div className="flex items-center gap-1.5 border-b border-line bg-chrome px-3 py-2">
            {[0, 1, 2].map((n) => (
              <span key={n} className="size-1.5 rounded-full bg-line-strong" />
            ))}
            <span className="ml-auto font-mono text-[8px] uppercase tracking-[0.18em] text-gray-500">
              Carta / notes
            </span>
          </div>
          <div className="flex">
            <div className="w-24 shrink-0 border-r border-line p-3">
              <p className={`${display.className} text-base leading-none text-brand`}>Carta</p>
              <ul className="mt-3 space-y-1 text-[10px]">
                <li className="flex items-center gap-1.5 rounded-md bg-red-100 px-2 py-1.5 font-medium text-brand">
                  <FileText size={10} /> Notes
                </li>
                <li className="flex items-center gap-1.5 px-2 py-1.5 text-gray-600">
                  <CircleCheck size={10} /> Tasks
                </li>
                <li className="flex items-center gap-1.5 px-2 py-1.5 text-gray-600">
                  <Sparkles size={10} /> Ask Carta
                </li>
              </ul>
            </div>
            <div className="min-w-0 flex-1 space-y-2 p-3 pr-28">
              <p className={`${display.className} text-sm`}>Your notes</p>
              <div className="flex items-center gap-1.5 rounded-full border border-line bg-panel px-2.5 py-1.5 text-[9px] text-gray-400">
                <Search size={9} /> Search title or content
              </div>
              <div className="rounded-lg border border-tint-edge bg-tint p-2.5">
                <p className={`${display.className} text-[11px]`}>A slower Sunday</p>
                <p className="mt-0.5 line-clamp-2 text-[9px] leading-snug text-gray-600">
                  More noticing. Less rushing. A few things I want to make room for...
                </p>
              </div>
              <div className="rounded-lg border border-line bg-panel p-2.5">
                <p className={`${display.className} text-[11px]`}>The bookshop idea</p>
                <p className="mt-0.5 line-clamp-1 text-[9px] leading-snug text-gray-600">
                  A place for stories, coffee, and conversations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div style={cardStyle} className="absolute -right-3 top-8 w-40">
        <motion.div
          animate={reduce ? undefined : { y: [0, -7, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="rounded-xl border border-line bg-panel p-3 shadow-xl shadow-red-900/10"
        >
          <p className="flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.18em] text-brand">
            <Sparkles size={9} /> A passing thought
          </p>
          <div className="mt-2 min-h-[72px]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={i}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.4, ease }}
              >
                <p className={`${display.className} text-[15px] leading-snug`}>{thought.text}</p>
                <p className="mt-1.5 text-[9px] text-gray-500">{thought.stamp}</p>
              </motion.div>
            </AnimatePresence>
          </div>
          <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[9px] text-brand">
            <Check size={9} /> A thought, kept
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}

export function AuthShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const mode = pathname.startsWith("/sign-up") ? "sign-up" : "sign-in";
  const c = COPY[mode];

  // Soft pointer parallax for the preview
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 70, damping: 18, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 70, damping: 18, mass: 0.6 });
  const winX = useTransform(sx, (v) => v * -10);
  const winY = useTransform(sy, (v) => v * -8);
  const cardX = useTransform(sx, (v) => v * 18);
  const cardY = useTransform(sy, (v) => v * 14);

  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip bg-page text-ink">
      {/* Ambient glow */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-16 size-[460px] rounded-full bg-red-200/40 dark:bg-red-500/10 blur-3xl"
        animate={reduce ? undefined : { x: [0, 40, 0], y: [0, 24, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 bottom-0 size-[380px] rounded-full bg-orange-100/70 blur-3xl"
        animate={reduce ? undefined : { x: [0, -30, 0], y: [0, -20, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Logo and switch link, no navbar */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-4 pt-5 sm:px-6"
      >
        <Link href="/" className={`${display.className} text-2xl leading-none tracking-tight text-brand`}>
          Carta
        </Link>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-3"
          >
            <span className="hidden text-[11px] text-gray-500 sm:inline">{c.topText}</span>
            <Link
              href={c.topHref}
              className="rounded-full border border-line-strong bg-panel px-3.5 py-1.5 text-[11px] font-medium text-brand transition-[background-color,border-color,transform] duration-300 hover:border-red-300 hover:bg-red-50 active:scale-95"
            >
              {c.topLabel}
            </Link>
            <ThemeToggle/>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Main */}
      <main
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        className="relative z-10 mx-auto grid w-full max-w-5xl flex-1 items-start gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 lg:pt-10"
      >
        {/* Left: copy + preview */}
        <div className="min-w-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <motion.p
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease }}
                className={eyebrow}
              >
                {c.eyebrow}
              </motion.p>
              <h1
                className={`${display.className} mt-4 text-3xl font-light leading-[1.08] tracking-tight sm:text-4xl lg:text-[2.75rem]`}
              >
                <Line delay={0.05}>{c.lead}</Line>
                <Line delay={0.15} className="text-brand">
                  {c.accent}
                </Line>
              </h1>
              <motion.p
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25, ease }}
                className="mt-4 max-w-sm text-sm leading-relaxed text-gray-600"
              >
                {c.blurb}
              </motion.p>
            </motion.div>
          </AnimatePresence>

          <Preview
            winStyle={{ x: winX, y: winY }}
            cardStyle={{ x: cardX, y: cardY }}
          />
        </div>

        {/* Right: form */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1, ease }}
          className="w-full max-w-md justify-self-center lg:justify-self-end"
        >
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-2xl shadow-red-900/10 sm:p-7">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mode}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.35, ease }}
              >
                <p className={eyebrow}>{c.formEyebrow}</p>
                <h2 className={`${display.className} mt-2 text-2xl font-normal tracking-tight sm:text-3xl`}>
                  {c.title}
                </h2>
                <p className="mt-1.5 text-xs text-gray-600">{c.sub}</p>
              </motion.div>
            </AnimatePresence>

            <motion.div
              key={pathname}
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease }}
              className="mt-5 min-h-[16rem]"
            >
              <ClerkLoading>
                <div className="space-y-3" aria-hidden="true">
                  {[0, 1, 2].map((n) => (
                    <div key={n} className="h-10 animate-pulse rounded-xl bg-line" />
                  ))}
                  <div className="h-11 animate-pulse rounded-full bg-line" />
                </div>
              </ClerkLoading>
              {children}
            </motion.div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={mode}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="mt-4 text-center text-[11px] text-gray-600"
              >
                {c.switchText}{" "}
                <Link
                  href={c.switchHref}
                  className="group inline-flex items-center gap-0.5 font-medium text-brand transition-colors duration-300 hover:text-brand-strong"
                >
                  {c.switchLabel}
                  <ArrowUpRight
                    size={11}
                    className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </Link>
              </motion.p>
            </AnimatePresence>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-line">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <p className="text-[10px] text-gray-500">© {new Date().getFullYear()} Carta</p>
          <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-gray-500">
            For the thoughts that make you, you.
          </p>
        </div>
      </footer>
    </div>
  );
}