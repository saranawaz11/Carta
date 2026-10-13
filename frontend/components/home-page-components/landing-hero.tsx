"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { Fraunces } from "next/font/google";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowDown, ArrowUpRight, Check, Feather } from "lucide-react";

import logo from "@/public/assets/logo.png";
import { ThemeToggle } from "./theme-toggle";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const display = Fraunces({ subsets: ["latin"], display: "swap", axes: ["opsz"] });

const ease = [0.22, 1, 0.36, 1] as const;

// Drop a photo into /public/assets and set it here (e.g. "/assets/hero.jpg") to replace the illustration
const HERO_IMAGE: StaticImageData | string | null = null;

const NAV = [
  { label: "A space for you", href: "#inside" },
  { label: "How it works", href: "#how" },
  { label: "Ask Carta", href: "#ask" },
  { label: "Capabilities", href: "#capabilities" },
];

const HEADLINE = [
  { words: ["A", "little", "space."], accent: false },
  { words: ["A", "lot", "of", "possibility."], accent: true },
];

const STRIP = ["Capture a thought", "Find your thread", "Follow it through"];

// Framer Motion: staggered rise for the copy around the headline
const rise: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, delay: 0.1 + i * 0.12, ease },
  }),
};

function ArchArt() {
  const leaves: [number, number, number, string][] = [
    [322, 150, -30, "#c2512b"],
    [338, 185, 25, "#d9733a"],
    [312, 215, -40, "#a63a22"],
    [334, 245, 30, "#d9733a"],
    [308, 275, -35, "#c2512b"],
    [326, 300, 28, "#a63a22"],
  ];
  return (
    <svg
      viewBox="0 0 400 520"
      preserveAspectRatio="xMidYMid slice"
      className="size-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="desk" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ecd3ca" />
          <stop offset="1" stopColor="#d8b2a6" />
        </linearGradient>
        <linearGradient id="light" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="400" height="520" fill="url(#desk)" />
      <polygon points="0,0 260,0 120,520 0,520" fill="url(#light)" />
      <g transform="rotate(-12 200 340)">
        <rect x="70" y="280" width="140" height="150" rx="6" fill="#f3e6cc" />
        <rect x="205" y="272" width="140" height="150" rx="6" fill="#fbf4e4" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line
            key={i}
            x1="222"
            x2="330"
            y1={296 + i * 18}
            y2={296 + i * 18}
            stroke="#dccaa6"
            strokeWidth="1.5"
          />
        ))}
      </g>
      <g transform="rotate(35 130 200)">
        <rect x="40" y="195" width="190" height="9" rx="4.5" fill="#5b1620" />
        <rect x="40" y="195" width="22" height="9" rx="3" fill="#c9a24a" />
      </g>
      <path
        d="M330 120 C310 200, 330 260, 300 335"
        fill="none"
        stroke="#7a4a32"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {leaves.map(([cx, cy, rot, fill], i) => (
        <ellipse
          key={i}
          cx={cx}
          cy={cy}
          rx="9"
          ry="20"
          fill={fill}
          transform={`rotate(${rot} ${cx} ${cy})`}
        />
      ))}
    </svg>
  );
}

export function LandingHero() {
  const root = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  // GSAP: headline mask reveal, floating note card, scroll parallax
  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          "[data-word]",
          { yPercent: 115, opacity: 1 },
          { yPercent: 0, duration: 1.3, ease: "expo.out", stagger: 0.09, delay: 0.2 },
        );

        gsap.to("[data-float]", {
          y: -12,
          duration: 3.4,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          delay: 1.8,
        });

        gsap.to("[data-art]", {
          yPercent: 7,
          scale: 1.1,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "bottom top",
            scrub: 0.8,
          },
        });

        gsap.to("[data-copy]", {
          y: -48,
          opacity: 0.25,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "bottom top",
            scrub: 0.8,
          },
        });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set("[data-word]", { opacity: 1 });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative bg-page text-ink">
      {/* Nav */}
      <motion.header
        initial={reduce ? false : { opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease }}
        className="border-b border-line"
      >
        <div className="mx-auto grid h-16 w-full max-w-6xl grid-cols-2 items-center px-4 sm:h-20 sm:px-6 md:grid-cols-[1fr_auto_1fr]">
          <Link href="/" className="flex items-center gap-2">
            <Image src={logo} alt="" width={30} height={30} />
            <span className={`${display.className} text-2xl font-normal tracking-tight text-brand text-[var(--carta-brand)]`}>
              Carta
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Sections">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="relative text-xs text-gray-700 transition-colors duration-300 hover:text-brand
                  after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-left after:scale-x-0 
                  after:transition-transform after:duration-300 hover:after:scale-x-100"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center justify-self-end gap-4">
            <Link
              href="/sign-in"
              className="text-xs text-gray-700 transition-colors duration-300 hover:text-brand"
            >
              Sign in
            </Link>
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}>
              <Link
                href="/sign-up"
                className="group inline-flex items-center gap-2 rounded-full bg-[var(--carta-button)] px-4 py-2 text-xs font-medium text-white transition-colors duration-300 hover:bg-red-900"
              >
                Get started
                <ArrowUpRight
                  size={13}
                  className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Link>
              <ThemeToggle className="ml-4" />
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Hero */}
      <div className="mx-auto grid w-full max-w-6xl items-center gap-16 px-4 pb-24 pt-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:pb-28 lg:pt-10">
        <div data-copy>
          <motion.div initial="hidden" animate="show" className="flex flex-col items-start">
            <motion.p
              variants={rise}
              custom={0}
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand"
            >
              A home for your inner world
            </motion.p>

            <h1
              aria-label="A little space. A lot of possibility."
              className={`${display.className} mt-7 text-[2.9rem] font-light leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl`}
            >
              {HEADLINE.map((line, li) => (
                <span
                  key={li}
                  aria-hidden="true"
                  className={`block ${line.accent ? "text-brand" : "text-ink"}`}
                >
                  {line.words.map((word, wi) => (
                    <span key={wi}>
                      <span className="-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-top">
                        <span data-word className="inline-block opacity-0 will-change-transform">
                          {word}
                        </span>
                      </span>{" "}
                    </span>
                  ))}
                </span>
              ))}
            </h1>

            <motion.p
              variants={rise}
              custom={4}
              className="mt-8 max-w-md text-sm leading-relaxed text-gray-600 sm:text-[15px]"
            >
              For the thought on the way home. The idea worth following. The plan taking shape.
              Carta helps you keep it all—and make something of it.
            </motion.p>

            <motion.div variants={rise} custom={5} className="mt-8 flex flex-wrap items-center gap-6">
              <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/sign-up"
                  className="group inline-flex h-11 items-center gap-3 rounded-full bg-[var(--carta-button)] px-6 text-xs font-medium text-white shadow-lg shadow-red-900/20 transition-[background-color,box-shadow] duration-300 hover:bg-[var(--carta-button)] hover:shadow-xl hover:shadow-red-900/25"
                >
                  Make room for your thoughts
                  <ArrowUpRight
                    size={14}
                    className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </Link>
              </motion.div>

              <a
                href="#inside"
                className="inline-flex items-center gap-2 text-xs font-medium text-[var(--carta-brand)] transition-opacity duration-300 hover:opacity-70"
              >
                Take a look inside
                <motion.span
                  animate={reduce ? undefined : { y: [0, 3, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                >
                  <ArrowDown size={13} />
                </motion.span>
              </a>
            </motion.div>

            <motion.p variants={rise} custom={6} className="mt-8 text-[11px] text-gray-500">
              Your notes, tasks, and a little help connecting the dots.
            </motion.p>
          </motion.div>
        </div>

        {/* Arch + floating note */}
        <div className="relative mx-auto w-full max-w-[460px] lg:ml-auto">
          <motion.div
            initial={reduce ? false : { clipPath: "inset(100% 0% 0% 0%)" }}
            animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
            transition={{ duration: 1.5, delay: 0.25, ease }}
            className="relative aspect-[4/5] w-full overflow-hidden rounded-b-[2.25rem] rounded-t-[999px] bg-[#e6c8be] shadow-2xl shadow-red-900/10"
          >
            <div data-art className="absolute inset-0 will-change-transform">
              {HERO_IMAGE ? (
                <Image src={HERO_IMAGE} alt="" fill priority sizes="460px" className="object-cover" />
              ) : (
                <ArchArt />
              )}
            </div>
          </motion.div>

          <div className="absolute -bottom-8 -left-3 w-[82%] sm:-left-14 sm:w-[78%]">
            <div data-float>
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 60, rotate: -8 }}
                animate={{ opacity: 1, y: 0, rotate: -3 }}
                transition={{ type: "spring", stiffness: 70, damping: 16, delay: 1.0 }}
                whileHover={{
                  rotate: 0,
                  scale: 1.03,
                  transition: { type: "spring", stiffness: 260, damping: 18 },
                }}
                className="rounded-2xl bg-panel p-5 shadow-xl shadow-red-900/10"
              >
                <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-brand">
                  <Feather size={11} />
                  A thought to keep
                </p>
                <p className={`${display.className} mt-3 text-2xl font-normal leading-tight sm:text-[1.7rem]`}>
                  Maybe the small things are the big things.
                </p>
                <p className="mt-4 text-[10px] text-gray-500">Today on the walk home</p>
              </motion.div>
            </div>
          </div>

          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.6, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 16, delay: 2 }}
            className="absolute -bottom-5 right-3 inline-flex items-center gap-2 rounded-full bg-panel px-4 py-2 text-[11px] text-gray-700 shadow-lg shadow-red-900/10 sm:right-6"
          >
            <Check size={13} className="text-brand" />
            A thought, kept.
          </motion.div>
        </div>
      </div>

      {/* Bottom strip */}
      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.4 }}
        className="border-t border-line"
      >
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500 sm:px-6">
          <span>Personal notes. Purposeful days.</span>
          <ul className="hidden items-center gap-6 sm:flex">
            {STRIP.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="size-1 rounded-full bg-red-800" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </motion.div>
    </section>
  );
}