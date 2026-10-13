"use client";

import { useRef, useState } from "react";
import { Fraunces } from "next/font/google";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Check, ChevronLeft, ChevronRight, Plus } from "lucide-react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const display = Fraunces({ subsets: ["latin"], display: "swap", axes: ["opsz"] });
const ease = [0.22, 1, 0.36, 1] as const;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Fixed "today" so server and browser always render the same thing
const TODAY = 9;

type Task = { id: string; title: string; date: number; done: boolean };

const INITIAL: Task[] = [
  { id: "draft", title: "Write a first-page draft", date: 9, done: false },
  { id: "bookshop", title: "Visit the little bookshop", date: 10, done: false },
  { id: "sunday", title: "Make room for Sunday", date: 11, done: true },
];

const EXTRA: Omit<Task, "done">[] = [
  { id: "bank", title: "Call the bank", date: 12 },
  { id: "letter", title: "Write the thank-you letter", date: 14 },
  { id: "plants", title: "Water the plants", date: 15 },
];

const HEADING = ["For", "the", "thoughts", "that", "want", "to", "become", "things."];
const CHIPS = ["Due dates", "Calendar", "Progress"];

function dateLabel(task: Task) {
  const base =
    task.date === TODAY
      ? `Today \u00B7 Oct ${task.date}`
      : task.date === TODAY + 1
        ? `Tomorrow \u00B7 Oct ${task.date}`
        : `Oct ${task.date}`;
  return task.done ? `Oct ${task.date} \u00B7 Completed` : base;
}

function monthGrid(offset: number) {
  const first = new Date(2026, 9 + offset, 1);
  const year = first.getFullYear();
  const month = first.getMonth();
  const lead = (first.getDay() + 6) % 7; // Monday first
  const days = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const total = Math.ceil((lead + days) / 7) * 7;
  const cells = Array.from({ length: total }, (_, i) => {
    const d = i - lead + 1;
    if (d < 1) return { day: prevDays + d, current: false };
    if (d > days) return { day: d - days, current: false };
    return { day: d, current: true };
  });
  return { cells, label: `${MONTHS[month]} ${year}` };
}

export function Tasks() {
  const root = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const [tasks, setTasks] = useState<Task[]>(INITIAL);
  const [added, setAdded] = useState(0);
  const [offset, setOffset] = useState(0);
  const [dir, setDir] = useState(1);

  const done = tasks.filter((t) => t.done).length;
  const pct = Math.round((done / tasks.length) * 100);
  const { cells, label } = monthGrid(offset);
  const marks = new Map(tasks.map((t) => [t.date, t.done ? "done" : "open"] as const));

  const message =
    done === 0
      ? "Nothing yet. Start small."
      : done === tasks.length
        ? "All done. Well done."
        : done === 1
          ? "One step taken. Keep going."
          : `${done} steps taken. Keep going.`;

  function toggle(id: string) {
    setTasks((current) => current.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function addTask() {
    const next = EXTRA[added];
    if (!next) return;
    setTasks((current) => [...current, { ...next, done: false }]);
    setAdded((n) => n + 1);
  }

  function go(step: number) {
    setDir(step);
    setOffset((o) => Math.max(-2, Math.min(2, o + step)));
  }

  // GSAP: headline mask reveal and a soft parallax on the pink plate
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
          "[data-plate]",
          { yPercent: 6 },
          {
            yPercent: -6,
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
    <section ref={root} id="tasks" className="mx-auto w-full max-w-6xl scroll-mt-8 px-4 py-20 sm:px-6 sm:py-28">
      <div className="grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        {/* Copy */}
        <div data-head>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand">
            Make a little headway
          </p>
          <h2
            aria-label="For the thoughts that want to become things."
            className={`${display.className} mt-6 max-w-sm text-4xl font-light leading-[1.05] tracking-tight sm:text-5xl`}
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
            className="mt-7 max-w-sm text-sm leading-relaxed text-gray-600"
          >
            Give the next step its own task. Set a due date, see it on your calendar, and mark it
            complete. Progress doesn&apos;t have to be dramatic to be real.
          </motion.p>
          <motion.ul
            initial={reduce ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.9, delay: 0.3, ease }}
            className="mt-6 flex flex-wrap gap-2"
          >
            {CHIPS.map((chip) => (
              <li key={chip} className="rounded-full bg-[var(--carta-chip)] px-3 py-1.5 text-[10px] text-gray-600">
                {chip}
              </li>
            ))}
          </motion.ul>
        </div>

        {/* Interactive tasks card */}
        <div data-plate className="will-change-transform">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 50, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.1, ease }}
            className="rounded-[2rem] bg-[var(--carta-plate)] p-4 sm:p-8"
          >
            <div className="rounded-2xl bg-panel p-5 shadow-xl shadow-red-900/10 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <h3 className={`${display.className} text-2xl font-normal sm:text-[1.7rem]`}>
                  A little forward.
                </h3>
                <motion.button
                  type="button"
                  onClick={addTask}
                  disabled={added >= EXTRA.length}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--carta-button)] px-3.5 text-[11px] font-medium text-white transition-[background-color,opacity] duration-300 hover:bg-[var(--carta-button-hover)] disabled:opacity-40"
                >
                  <Plus size={12} />
                  Add task
                </motion.button>
              </div>

              <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_210px]">
                {/* Task list */}
                <div className="min-w-0">
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-brand">This week</p>
                  <ul className="mt-3">
                    <AnimatePresence initial={false}>
                      {tasks.map((task) => (
                        <motion.li
                          key={task.id}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          transition={{ duration: 0.5, ease }}
                          className="overflow-hidden border-b border-line last:border-b-0"
                        >
                          <button
                            type="button"
                            onClick={() => toggle(task.id)}
                            aria-pressed={task.done}
                            className="flex w-full items-center gap-3 py-3.5 text-left"
                          >
                            <motion.span
                              whileTap={{ scale: 0.8 }}
                              className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition-[background-color,border-color] duration-300 ${
                                task.done ? "border-red-800 bg-red-800" : "border-gray-300 bg-panel"
                              }`}
                            >
                              <AnimatePresence initial={false}>
                                {task.done && (
                                  <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0 }}
                                    transition={{ type: "spring", stiffness: 420, damping: 18 }}
                                  >
                                    <Check size={11} className="text-white" />
                                  </motion.span>
                                )}
                              </AnimatePresence>
                            </motion.span>
                            <span className="min-w-0">
                              <span
                                className={`block truncate text-xs font-medium transition-colors duration-300 ${
                                  task.done ? "text-gray-400 line-through" : "text-gray-900"
                                }`}
                              >
                                {task.title}
                              </span>
                              <span className="mt-0.5 block text-[10px] text-gray-500">{dateLabel(task)}</span>
                            </span>
                          </button>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </div>

                {/* Calendar */}
                <div className="rounded-xl bg-[var(--carta-wash)] p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium">{label}</span>
                    <span className="flex items-center gap-1 text-gray-500">
                      <button
                        type="button"
                        onClick={() => go(-1)}
                        disabled={offset <= -2}
                        aria-label="Previous month"
                        className="rounded p-0.5 transition-colors hover:text-brand disabled:opacity-30"
                      >
                        <ChevronLeft size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => go(1)}
                        disabled={offset >= 2}
                        aria-label="Next month"
                        className="rounded p-0.5 transition-colors hover:text-brand disabled:opacity-30"
                      >
                        <ChevronRight size={13} />
                      </button>
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-7 text-center" aria-hidden="true">
                    {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                      <span key={i} className="pb-1 text-[9px] font-semibold text-gray-400">
                        {d}
                      </span>
                    ))}
                  </div>

                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={offset}
                      initial={reduce ? false : { opacity: 0, x: dir * 14 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={reduce ? undefined : { opacity: 0, x: dir * -14 }}
                      transition={{ duration: 0.25, ease }}
                      className="grid grid-cols-7 text-center"
                    >
                      {cells.map((cell, i) => {
                        const isToday = offset === 0 && cell.current && cell.day === TODAY;
                        const mark = offset === 0 && cell.current ? marks.get(cell.day) : undefined;
                        return (
                          <span key={i} className="relative flex h-7 items-center justify-center text-[10px]">
                            <span
                              className={`flex size-6 items-center justify-center rounded-full tabular-nums transition-colors duration-300 ${
                                isToday
                                  ? "bg-[var(--carta-button)] font-semibold text-white"
                                  : cell.current
                                    ? "text-gray-700"
                                    : "text-gray-300"
                              }`}
                            >
                              {cell.day}
                            </span>
                            {mark && !isToday && (
                              <span
                                className={`absolute bottom-0 size-1 rounded-full ${
                                  mark === "open" ? "bg-[var(--carta-button)]" : "bg-gray-300"
                                }`}
                              />
                            )}
                          </span>
                        );
                      })}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Progress */}
              <div className="mt-6">
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-gray-600">{message}</span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-brand tabular-nums">
                    {done} of {tasks.length} complete
                  </span>
                </div>
                <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-red-100">
                  <motion.div
                    initial={false}
                    animate={{ width: `${pct}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 20 }}
                    className="h-full rounded-full bg-red-800"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}