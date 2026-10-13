import Link from "next/link";
import { Fraunces } from "next/font/google";
import { Archive, ArrowUpRight, CircleCheck, Plus, Sparkles } from "lucide-react";

import { Ask } from "@/components/home-page-components/ask";
import { LandingHero } from "@/components/home-page-components/landing-hero";
import { Manifesto } from "@/components/home-page-components/manifesto";
import { Mind } from "@/components/home-page-components/mind";
import { Rhythm } from "@/components/home-page-components/rhythm";
import { LandingShowcase } from "@/components/home-page-components/landing-showcase";
import { Tasks } from "@/components/home-page-components/tasks";
import { Reveal } from "@/components/home-page-components/reveal";
import { CursorDot } from "./cursor-dot";
import { Collection } from "./collection";
import { MoveForward } from "./move-forward";
import { Closing } from "./closing";
import { SiteFooter } from "./site-footer";

const display = Fraunces({ subsets: ["latin"], display: "swap", axes: ["opsz"] });

const FEATURES = [
  {
    icon: Plus,
    title: "Capture in seconds",
    text: "Type a thought and Carta decides whether it's a note or a task, with the due date already filled in.",
  },
  {
    icon: Sparkles,
    title: "Ask your notes",
    text: "Chat with an assistant that answers from your own notes and shows you which ones it used.",
  },
  {
    icon: CircleCheck,
    title: "Stay on top of tasks",
    text: "See what's due today, what's coming up and what's done, all in one clear view.",
  },
  {
    icon: Archive,
    title: "Nothing lost by accident",
    text: "Archive what you're finished with. Deleted notes wait in Trash until you restore them.",
  },
];

const eyebrow = "font-mono text-[10px] uppercase tracking-[0.2em] text-brand";

export function LandingPage() {
  return (
    <div className="min-h-dvh overflow-x-clip bg-page text-ink">
      <CursorDot/>
      <LandingHero />
      <LandingShowcase />
      <Manifesto />
      <Mind />
      <Rhythm />
      <Tasks />
      <Ask />
      <Collection/>
      <MoveForward/>
      <Closing/>
      <SiteFooter/>
    </div>
  );
}