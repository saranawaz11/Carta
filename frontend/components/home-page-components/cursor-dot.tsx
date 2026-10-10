"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const INTERACTIVE = "a, button, [role='tab'], [role='button'], input, textarea, select, label, summary";
const RED = "#dc2626";
const PALE = "#ffd9d3";

export function CursorDot() {
  const dot = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();

    // Mouse devices only, and not for people who prefer reduced motion
    mm.add("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
      const el = dot.current;
      if (!el) return;

      const xTo = gsap.quickTo(el, "x", { duration: 0.45, ease: "power3.out" });
      const yTo = gsap.quickTo(el, "y", { duration: 0.45, ease: "power3.out" });

      let seen = false;
      let inside = true;
      let hovering = false;
      let pressed = false;
      let light = false;

      const render = () => {
        gsap.to(el, {
          autoAlpha: seen && inside ? (hovering ? 0.4 : 1) : 0,
          scale: pressed ? 0.7 : hovering ? 3 : 1,
          backgroundColor: light ? PALE : RED,
          duration: 0.3,
          ease: "power3.out",
          overwrite: "auto",
        });
      };

      const onMove = (e: PointerEvent) => {
        if (e.pointerType === "touch") return;
        let changed = false;

        if (!seen) {
          gsap.set(el, { x: e.clientX, y: e.clientY });
          seen = true;
          changed = true;
        }
        if (!inside) {
          inside = true;
          changed = true;
        }

        xTo(e.clientX);
        yTo(e.clientY);

        const target = e.target as Element | null;
        const nextHover = Boolean(target?.closest?.(INTERACTIVE));
        const nextLight = Boolean(target?.closest?.("[data-cursor-light]"));
        if (nextHover !== hovering || nextLight !== light) {
          hovering = nextHover;
          light = nextLight;
          changed = true;
        }

        if (changed) render();
      };

      const onLeave = () => {
        inside = false;
        render();
      };
      const onEnter = () => {
        inside = true;
        render();
      };
      const onDown = () => {
        pressed = true;
        render();
      };
      const onUp = () => {
        pressed = false;
        render();
      };

      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerdown", onDown);
      window.addEventListener("pointerup", onUp);
      document.documentElement.addEventListener("mouseleave", onLeave);
      document.documentElement.addEventListener("mouseenter", onEnter);

      return () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointerup", onUp);
        document.documentElement.removeEventListener("mouseleave", onLeave);
        document.documentElement.removeEventListener("mouseenter", onEnter);
      };
    });

    return () => mm.revert();
  });

  return (
    <div
      ref={dot}
      aria-hidden="true"
      className="pointer-events-none invisible fixed left-0 top-0 z-[100] -ml-[5px] -mt-[5px] size-2.5 rounded-full bg-red-600 opacity-0"
    />
  );
}