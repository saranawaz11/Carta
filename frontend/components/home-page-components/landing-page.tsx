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

const eyebrow = "font-mono text-[10px] uppercase tracking-[0.2em] text-red-800";

export function LandingPage() {
  return (
    <div className="min-h-dvh overflow-x-clip bg-[#fff6f3] text-[#1f1a1a]">
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

      {/* Capabilities */}
      <section id="capabilities" className="mx-auto w-full max-w-6xl scroll-mt-8 px-4 py-20 sm:px-6 sm:py-28">
        <Reveal>
          <p className={eyebrow}>Capabilities</p>
          <h2 className={`${display.className} mt-5 max-w-2xl text-4xl font-light leading-tight tracking-tight sm:text-5xl`}>
            Small tools, <span className="text-red-800">working together.</span>
          </h2>
        </Reveal>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }, i) => (
            <Reveal
              as="li"
              key={title}
              delay={i * 0.08}
              lift
              className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm transition-[box-shadow,border-color] duration-300 hover:border-red-300 hover:shadow-lg hover:shadow-red-100/60"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-red-50 text-red-800">
                <Icon size={18} />
              </span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{text}</p>
            </Reveal>
          ))}
        </ul>
      </section>

      {/* Closing call to action */}
      <section className="border-t border-red-900/10 px-4 py-20 text-center sm:px-6 sm:py-28">
        <Reveal>
          <h2 className={`${display.className} mx-auto max-w-2xl text-4xl font-light leading-tight tracking-tight sm:text-6xl`}>
            Make room for <span className="text-red-800">your thoughts.</span>
          </h2>
          <Link
            href="/sign-up"
            className="group mt-8 inline-flex h-12 items-center gap-3 rounded-full bg-red-800 px-8 text-sm font-medium text-white shadow-lg shadow-red-900/20
              transition-[background-color,box-shadow] duration-300 hover:bg-red-900 hover:shadow-xl hover:shadow-red-900/25"
          >
            Start writing
            <ArrowUpRight
              size={15}
              className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </Link>
        </Reveal>
      </section>

      <Closing/>
      <SiteFooter/>
    </div>
  );
}