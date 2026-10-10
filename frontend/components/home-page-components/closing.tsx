import Link from "next/link";
import { Fraunces } from "next/font/google";
import { ArrowUpRight } from "lucide-react";

import { Reveal } from "@/components/home-page-components/reveal";

const display = Fraunces({ subsets: ["latin"], display: "swap", axes: ["opsz"] });

export function Closing() {
  return (
    <section className="border-t border-red-900/10 bg-[#f9eeea] px-4 py-20 text-center text-[#1f1a1a] sm:px-6 sm:py-28">
      <Reveal>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-red-800">
          A blank page is a beginning
        </p>
        <h2
          className={`${display.className} mx-auto mt-8 max-w-3xl text-5xl font-light leading-[1.05] tracking-tight sm:text-7xl`}
        >
          There&apos;s something <span className="text-red-800">only you can write.</span>
        </h2>
        <p className="mx-auto mt-8 max-w-sm text-sm leading-relaxed text-gray-600">
          Not a perfect thought. Not a finished idea. Just the first line. Make a little space for it in
          Carta.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
          <Link
            href="/sign-up"
            className="group inline-flex h-11 items-center gap-2.5 rounded-full bg-red-800 px-6 text-xs font-medium text-white shadow-lg shadow-red-900/20 transition-[background-color,box-shadow] duration-300 hover:bg-red-900 hover:shadow-xl hover:shadow-red-900/25"
          >
            Get started with Carta
            <ArrowUpRight
              size={14}
              className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </Link>
          <Link
            href="/sign-in"
            className="text-xs text-red-800 underline-offset-4 transition-colors duration-300 hover:text-red-900 hover:underline"
          >
            Already have a space? Sign in
          </Link>
        </div>
      </Reveal>
    </section>
  );
}