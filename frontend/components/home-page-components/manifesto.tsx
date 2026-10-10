"use client";

import Image, { type StaticImageData } from "next/image";
import { useRef } from "react";
import { Fraunces } from "next/font/google";
import { motion, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const display = Fraunces({
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
});
const ease = [0.22, 1, 0.36, 1] as const;

// Put a photo in /public/assets and set it here (e.g. "/assets/manifesto.jpg") to replace the drawing
const MANIFESTO_IMAGE: StaticImageData | string | null = null;

const STATEMENT =
  "Not everything you write needs to become something. Some things just need to be kept.";

// Fixed positions (not computed with Math.cos/sin) so server and browser render identical HTML
const STAMENS: [number, number][] = [
  [4.5, 0],
  [3.64, 2.65],
  [1.39, 4.28],
  [-1.39, 4.28],
  [-3.64, 2.65],
  [-4.5, 0],
  [-3.64, -2.65],
  [-1.39, -4.28],
  [1.39, -4.28],
  [3.64, -2.65],
];
function Stitched() {
  return (
    <svg
      viewBox="0 0 250 200"
      preserveAspectRatio="xMidYMid slice"
      className="size-full"
      aria-hidden="true"
    >
      <rect width="250" height="200" fill="#efe3dc" />
      <rect x="14" y="14" width="222" height="172" rx="8" fill="#f6ece6" />
      <rect
        x="22"
        y="22"
        width="206"
        height="156"
        rx="6"
        fill="none"
        stroke="#d9bfb5"
        strokeWidth="1.5"
        strokeDasharray="3 4"
      />
      {/* stem + leaves */}
      <path
        d="M150 104 C140 132 118 152 92 178"
        fill="none"
        stroke="#3d2a22"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M128 140 C118 134 106 136 98 144"
        fill="none"
        stroke="#3d2a22"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M138 120 C150 118 160 124 166 134"
        fill="none"
        stroke="#3d2a22"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M112 160 C104 158 96 160 90 166"
        fill="none"
        stroke="#3d2a22"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* flower */}
      <g transform="translate(150 78)">
        {Array.from({ length: 8 }, (_, i) => (
          <ellipse
            key={i}
            cx="0"
            cy="-22"
            rx="11"
            ry="22"
            fill="#a3262f"
            transform={`rotate(${i * 45})`}
          />
        ))}
        {Array.from({ length: 8 }, (_, i) => (
          <ellipse
            key={i}
            cx="0"
            cy="-16"
            rx="5"
            ry="13"
            fill="#bd3640"
            transform={`rotate(${i * 45 + 22.5})`}
          />
        ))}
        <circle r="7" fill="#4a1a1c" />
        {STAMENS.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="1" fill="#e5b84a" />
        ))}
      </g>
    </svg>
  );
}

export function Manifesto() {
  const root = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  // GSAP: the statement "reads in" as you scroll, and the picture drifts slowly
  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          "[data-m]",
          { opacity: 0.16 },
          {
            opacity: 1,
            ease: "none",
            stagger: 0.12,
            scrollTrigger: {
              trigger: "[data-statement]",
              start: "top 82%",
              end: "bottom 58%",
              scrub: 0.6,
            },
          },
        );

        gsap.fromTo(
          "[data-img]",
          { yPercent: 9, scale: 1.18 },
          {
            yPercent: -9,
            ease: "none",
            scrollTrigger: {
              trigger: root.current,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.8,
            },
          },
        );
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set("[data-m]", { opacity: 1 });
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="border-y border-red-900/10 bg-[#f6efe9] text-[#1f1a1a]"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 md:grid-cols-[230px_1fr] md:gap-16">
        {/* Left: label, picture, caption */}
        <div className="flex flex-col">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, ease }}
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-red-800"
          >
            A small manifesto
          </motion.p>

          <motion.div
            initial={reduce ? false : { clipPath: "inset(100% 0% 0% 0%)" }}
            whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 1.3, delay: 0.1, ease }}
            className="mt-6 aspect-[5/4] w-full max-w-[230px] overflow-hidden rounded-xl border border-red-900/10 bg-[#efe3dc]"
          >
            <div data-img className="size-full will-change-transform">
              {MANIFESTO_IMAGE ? (
                <Image
                  src={MANIFESTO_IMAGE}
                  alt=""
                  fill
                  sizes="230px"
                  className="object-cover"
                />
              ) : (
                <Stitched />
              )}
            </div>
          </motion.div>

          <motion.p
            initial={reduce ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.9, delay: 0.6, ease }}
            className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-red-800"
          >
            Keep what moves you.
          </motion.p>
        </div>

        {/* Right: statement */}
        <div>
          <h2
            data-statement
            aria-label={STATEMENT}
            className={`${display.className} max-w-3xl text-3xl font-light leading-[1.15] tracking-tight sm:text-5xl`}
          >
            {STATEMENT.split(" ").map((word, i) => (
              <span key={i} aria-hidden="true">
                <span data-m className="inline-block opacity-[0.16]">
                  {word}
                </span>{" "}
              </span>
            ))}
          </h2>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.9, delay: 0.2, ease }}
            className="mt-8 max-w-xl text-sm leading-relaxed text-gray-600"
          >
            A note can be a beginning, a reminder, or a way to hear yourself
            think. Carta makes room for all of it. Not to turn your life into a
            system—but to help you find your own thread.
          </motion.p>
        </div>
      </div>
    </section>
  );
}
