"use client";

import { useEffect, useId, useState } from "react";
import { flushSync } from "react-dom";
import { useTheme } from "next-themes";
import { motion, useReducedMotion } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

type ViewTransitionDoc = Document & { startViewTransition?: (cb: () => void) => unknown };

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const reduce = useReducedMotion();
  const pillId = useId();

  // The saved theme is unknown on the server, so only highlight after mount
  useEffect(() => setMounted(true), []);

  const change = (next: string) => {
    if (next === theme) return;
    const doc = document as ViewTransitionDoc;
    if (reduce || !doc.startViewTransition) {
      setTheme(next);
      return;
    }
    doc.startViewTransition(() => {
      flushSync(() => setTheme(next));
    });
  };

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={`relative inline-flex items-center rounded-full border border-line bg-panel p-0.5 ${className}`}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => change(value)}
            className={`relative flex size-7 items-center justify-center rounded-full transition-colors duration-300 ${
              active ? "text-white" : "text-gray-600 hover:text-brand"
            }`}
          >
            {active && (
              <motion.span
                layoutId={pillId}
                className="absolute inset-0 rounded-full bg-red-800"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <Icon size={13} className="relative" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}