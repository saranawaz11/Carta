"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

export function Reveal({
  children,
  delay = 0,
  y = 28,
  lift = false,
  as = "div",
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  lift?: boolean;
  as?: "div" | "li";
  className?: string;
}) {
  const reduce = useReducedMotion();
  const Tag = motion[as] as typeof motion.div;

  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, delay, ease }}
      whileHover={
        lift && !reduce
          ? { y: -4, transition: { type: "spring", stiffness: 300, damping: 20 } }
          : undefined
      }
    >
      {children}
    </Tag>
  );
}