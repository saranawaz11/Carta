"use client";

import { useId, useRef, useState, type PointerEvent } from "react";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { PenLine } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

// The drawing is 400 x 300 and the card is 4:3, so pointer position maps straight onto it
const W = 400;
const H = 300;
const REST = { x: 172, y: 170 };

type Stroke = { id: number; d: string };

// Smooth a list of points into one path
function toPath(pts: [number, number][]) {
  const f = (n: number) => n.toFixed(1);
  if (pts.length < 2) return `M${f(pts[0][0])} ${f(pts[0][1])}l0.01 0`;
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    d += ` Q${f(x0)} ${f(y0)} ${f((x0 + x1) / 2)} ${f((y0 + y1) / 2)}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L${f(last[0])} ${f(last[1])}`;
}

const LINES = [0, 1, 2, 3, 4, 5];
const PETALS = [0, 60, 120, 180, 240, 300];
const MOTES: { x: number; y: number; r: number; d: number; t: number }[] = [
  { x: 300, y: 118, r: 1.6, d: 0, t: 6 },
  { x: 326, y: 140, r: 1.2, d: 1.4, t: 7.5 },
  { x: 280, y: 150, r: 1.4, d: 2.8, t: 6.5 },
  { x: 346, y: 118, r: 1, d: 0.8, t: 8 },
  { x: 258, y: 120, r: 1.2, d: 3.6, t: 7 },
];

export function ClosingDesk() {
  const reduce = useReducedMotion();
  const clipId = `desk-clip-${useId().replace(/:/g, "")}`;
  const coneId = `desk-cone-${useId().replace(/:/g, "")}`;

  const drawing = useRef<[number, number][] | null>(null);
  const nextId = useRef(0);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [live, setLive] = useState("");
  const [hovering, setHovering] = useState(false);
  const [writing, setWriting] = useState(false);
  const [touched, setTouched] = useState(false);

  // Pen follows the pointer (stiff spring so the nib stays on the ink)
  const penX = useMotionValue(REST.x);
  const penY = useMotionValue(REST.y);
  const sx = useSpring(penX, { stiffness: 700, damping: 40, mass: 0.4 });
  const sy = useSpring(penY, { stiffness: 700, damping: 40, mass: 0.4 });

  // Lamp light drifts toward the pointer, like moving the lamp over the page
  const lightX = useMotionValue(80);
  const lightY = useMotionValue(18);
  const slx = useSpring(lightX, { stiffness: 90, damping: 20 });
  const sly = useSpring(lightY, { stiffness: 90, damping: 20 });
  const glow = useMotionTemplate`radial-gradient(52% 62% at ${slx}% ${sly}%, color-mix(in oklab, var(--carta-brand) 40%, transparent), transparent 70%)`;

  // Gentle parallax: notebook and lamp shift in opposite directions
  const nx = useMotionValue(0);
  const ny = useMotionValue(0);
  const snx = useSpring(nx, { stiffness: 80, damping: 20 });
  const sny = useSpring(ny, { stiffness: 80, damping: 20 });
  const bookX = useTransform(snx, (v) => v * -8);
  const bookY = useTransform(sny, (v) => v * -6);
  const lampX = useTransform(snx, (v) => v * 10);
  const lampY = useTransform(sny, (v) => v * 6);

  const point = (e: PointerEvent<HTMLDivElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
  };

  const rest = () => {
    penX.set(REST.x);
    penY.set(REST.y);
    lightX.set(80);
    lightY.set(18);
    nx.set(0);
    ny.set(0);
  };

  const finish = () => {
    const pts = drawing.current;
    drawing.current = null;
    setWriting(false);
    setLive("");
    if (pts && pts.length > 1) {
      const id = nextId.current++;
      setStrokes((s) => [...s.slice(-13), { id, d: toPath(pts) }]);
    }
  };

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduce) return;
    const [x, y] = point(e);
    penX.set(x);
    penY.set(y);
    lightX.set((x / W) * 100);
    lightY.set((y / H) * 100);
    nx.set(x / W - 0.5);
    ny.set(y / H - 0.5);
    if (drawing.current) {
      drawing.current.push([x, y]);
      setLive(toPath(drawing.current));
    }
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (reduce || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = point(e);
    drawing.current = [p];
    setLive(toPath([p, p]));
    setWriting(true);
    setTouched(true);
  };

  const onLeave = () => {
    setHovering(false);
    finish();
    rest();
  };

  const stillWriting = writing;
  const penAnimate = reduce
    ? undefined
    : stillWriting
      ? { x: [0, 0.9, 0], y: [0, -1.2, 0] }
      : hovering
        ? { x: 0, y: 0 }
        : { y: [0, -2.5, 0] };
  const penTransition = stillWriting
    ? { duration: 0.2, repeat: Infinity }
    : hovering
      ? { duration: 0.2 }
      : { duration: 3.6, repeat: Infinity, ease: "easeInOut" as const };

  return (
    <div
      className="absolute inset-0 touch-pan-y select-none overflow-hidden bg-art-ground"
      onPointerEnter={() => setHovering(true)}
      onPointerMove={onMove}
      onPointerDown={onDown}
      onPointerUp={finish}
      onPointerCancel={finish}
      onPointerLeave={onLeave}
      aria-hidden="true"
    >
      {/* Lamp light */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{ background: glow }}
        animate={{ opacity: hovering ? 1 : 0.8 }}
        transition={{ duration: 0.6 }}
      />

      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
        <defs>
          <clipPath id={clipId}>
            <g transform="rotate(-4 200 170)">
              <path d="M62 98 L200 110 L200 232 L62 220 Z" />
              <path d="M338 98 L200 110 L200 232 L338 220 Z" />
            </g>
          </clipPath>
          <linearGradient id={coneId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: "var(--carta-brand)", stopOpacity: 0.32 }} />
            <stop offset="1" style={{ stopColor: "var(--carta-brand)", stopOpacity: 0 }} />
          </linearGradient>
        </defs>

        {/* Desk */}
        <rect
          x="0"
          y="165"
          width="400"
          height="135"
          style={{ fill: "color-mix(in oklab, var(--carta-art-ground) 86%, black)" }}
        />
        <line x1="0" y1="165" x2="400" y2="165" className="stroke-art-stitch" strokeWidth="1" />

        {/* Lamp */}
        <motion.g style={{ x: lampX, y: lampY }}>
          <motion.path
            d="M298 90 L350 102 L330 205 L120 190 Z"
            fill={`url(#${coneId})`}
            animate={reduce ? undefined : { opacity: [0.75, 1, 0.75] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
          <ellipse cx="360" cy="170" rx="24" ry="5" className="fill-art-stem" opacity="0.9" />
          <path
            d="M360 168 L350 120 L322 78"
            fill="none"
            className="stroke-art-stem"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="350" cy="120" r="3.2" className="fill-art-stitch" />
          <path d="M306 66 L342 78 L350 100 L298 86 Z" className="fill-art-petal" />
          <ellipse cx="324" cy="93" rx="9" ry="3" fill="white" opacity="0.85" />
        </motion.g>

        {/* Mug and steam */}
        <g>
          <rect x="18" y="148" width="32" height="28" rx="6" className="fill-art-paper stroke-art-stitch" strokeWidth="1.5" />
          <path d="M50 154 q11 3 0 15" fill="none" className="stroke-art-stitch" strokeWidth="2.4" strokeLinecap="round" />
          <ellipse cx="34" cy="150" rx="14" ry="3" className="fill-art-petal" opacity="0.55" />
          {[28, 34, 40].map((x, i) => (
            <motion.path
              key={x}
              d={`M${x} 142 q-3 -5 0 -9 t0 -9`}
              fill="none"
              className="stroke-art-stitch"
              strokeWidth="1.5"
              strokeLinecap="round"
              initial={reduce ? false : { opacity: 0, y: 0 }}
              animate={reduce ? undefined : { opacity: [0, 0.6, 0], y: [0, -9] }}
              transition={{ duration: 3.2, repeat: Infinity, delay: i * 0.9, ease: "easeOut" }}
            />
          ))}
        </g>

        {/* Notebook */}
        <motion.g style={{ x: bookX, y: bookY }}>
          <g transform="rotate(-4 200 170)">
            <ellipse cx="200" cy="238" rx="150" ry="9" fill="black" opacity="0.12" />
            <path d="M62 98 L200 110 L200 232 L62 220 Z" className="fill-art-paper stroke-art-stitch" strokeWidth="1.5" />
            <path d="M338 98 L200 110 L200 232 L338 220 Z" className="fill-art-paper stroke-art-stitch" strokeWidth="1.5" />
            <line x1="200" y1="110" x2="200" y2="232" className="stroke-art-stitch" strokeWidth="1.5" />

            {LINES.map((i) => (
              <g key={i} className="stroke-art-stitch" strokeWidth="1">
                <path d={`M74 ${124 + i * 16} L190 ${134 + i * 16}`} fill="none" />
                <path d={`M210 ${134 + i * 16} L326 ${124 + i * 16}`} fill="none" />
              </g>
            ))}

            {/* Handwriting that writes itself in */}
            <g transform="rotate(4.9 74 124)" className="stroke-art-stem" fill="none" strokeWidth="1.8" strokeLinecap="round">
              {[
                "M76 121 q4 -7 8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0",
                "M76 137 q4 -7 8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0",
                "M76 153 q4 -7 8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0",
              ].map((d, i) => (
                <motion.path
                  key={i}
                  d={d}
                  initial={reduce ? false : { pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 1.1, delay: 0.5 + i * 0.55, ease }}
                />
              ))}
            </g>

            {/* Doodle on the right page */}
            <g transform="rotate(-4.9 210 134)">
              <g transform="translate(272 152)">
                {PETALS.map((r) => (
                  <ellipse key={r} cx="0" cy="-9" rx="4.5" ry="9" className="fill-art-petal" transform={`rotate(${r})`} />
                ))}
                <circle r="3" className="fill-art-stem" />
              </g>
              <g className="stroke-art-stem" fill="none" strokeWidth="1.6" strokeLinecap="round">
                <path d="M222 182 q4 -6 8 0 t8 0 t8 0 t8 0 t8 0" />
                <path d="M222 198 q4 -6 8 0 t8 0 t8 0" />
              </g>
            </g>
          </g>
        </motion.g>

        {/* Your handwriting, clipped to the pages and fading after a few seconds */}
        <g clipPath={`url(#${clipId})`} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" className="stroke-art-petal">
          {strokes.map((s) => (
            <motion.path
              key={s.id}
              d={s.d}
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ delay: 5, duration: 2.5 }}
              onAnimationComplete={() => setStrokes((all) => all.filter((x) => x.id !== s.id))}
            />
          ))}
          {live && <path d={live} />}
        </g>

        {/* Dust in the lamplight */}
        {MOTES.map((m, i) => (
          <motion.circle
            key={i}
            cx={m.x}
            cy={m.y}
            r={m.r}
            fill="white"
            initial={{ opacity: 0 }}
            animate={reduce ? { opacity: 0.4 } : { y: [0, -16], opacity: [0, 0.8, 0] }}
            transition={{ duration: m.t, repeat: Infinity, delay: m.d, ease: "easeInOut" }}
          />
        ))}

        {/* Pen */}
        <motion.g style={{ x: sx, y: sy }}>
          <ellipse cx="14" cy="7" rx="26" ry="3" fill="black" opacity="0.14" />
          <motion.g animate={penAnimate} transition={penTransition}>
            <g transform="rotate(-38)">
              <rect x="7" y="-3.4" width="108" height="6.8" rx="3.4" className="fill-art-stem" />
              <rect x="7" y="-3.4" width="22" height="6.8" className="fill-art-petal-inner" />
              <rect x="86" y="-3.4" width="29" height="6.8" rx="3.4" className="fill-art-petal" />
              <rect x="84" y="-3.9" width="2.4" height="7.8" className="fill-art-stitch" />
              <path d="M0 0 L8 -2.6 L8 2.6 Z" className="fill-art-stitch" />
            </g>
          </motion.g>
        </motion.g>
      </svg>

      {/* Hint */}
      <AnimatePresence>
        {!touched && !reduce && (
          <motion.span
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.5, delay: 1.2, ease }}
            className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-[10px] text-white/85 backdrop-blur-md"
          >
            <PenLine size={11} />
            Try writing on the page
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}