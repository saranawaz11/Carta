"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { useTheme } from "next-themes";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown, Monitor, Moon, Search, Sun, X } from "lucide-react";

import { useDismiss } from "@/lib/use-dismiss";

const ease = [0.22, 1, 0.36, 1] as const;

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

function placeholderFor(pathname: string) {
  if (pathname.startsWith("/archive")) return "Search archive";
  if (pathname.startsWith("/deleted")) return "Search trash";
  return "Search notes";
}

function crumbFor(pathname: string) {
  if (pathname.startsWith("/archive")) return "Archive";
  if (pathname.startsWith("/deleted")) return "Trash";
  if (pathname.startsWith("/tasks")) return "Tasks";
  if (pathname.startsWith("/ask")) return "Ask Carta AI";
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/profile")) return "Profile";
  if (pathname.startsWith("/notes/")) return "Note";
  return "Notes";
}

type ViewTransitionDoc = Document & { startViewTransition?: (cb: () => void) => unknown };

function AppearanceMenu() {
  const { theme, setTheme } = useTheme();
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const close = useCallback(() => setOpen(false), []);
  const wrapper = useDismiss(open, close);

  // Focus the current option when the menu opens
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() =>
      panel.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus(),
    );
    return () => cancelAnimationFrame(id);
  }, [open]);

  const current = mounted ? (theme ?? "system") : "system";
  const active = THEMES.find((t) => t.value === current) ?? THEMES[2];
  const ActiveIcon = active.icon;

  function choose(next: string) {
    setOpen(false);
    trigger.current?.focus();
    if (next === theme) return;
    const doc = document as ViewTransitionDoc;
    if (reduce || !doc.startViewTransition) {
      setTheme(next);
      return;
    }
    doc.startViewTransition(() => {
      flushSync(() => setTheme(next));
    });
  }

  function onMenuKeys(e: KeyboardEvent) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(panel.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? []);
    if (!items.length) return;
    const i = items.indexOf(document.activeElement as HTMLElement);
    const next = e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    items[next]?.focus();
  }

  return (
    <div ref={wrapper} className="relative justify-self-end">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Appearance: ${active.label}`}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-line-strong bg-tint/60 px-3 text-xs font-medium text-ink
          transition-[background-color,border-color,transform] duration-200 hover:border-red-300 hover:bg-tint active:scale-[0.98] sm:px-3.5"
      >
        <ActiveIcon size={14} className="text-brand" />
        <span className="hidden sm:inline">Appearance</span>
        <span className="hidden font-normal text-gray-500 sm:inline">{active.label}</span>
        <ChevronDown
          size={13}
          className={`text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panel}
            role="menu"
            aria-label="Appearance"
            onKeyDown={onMenuKeys}
            initial={reduce ? false : { opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18, ease }}
            className="absolute right-0 top-full z-30 mt-2 w-52 origin-top-right rounded-xl border border-line-strong bg-panel p-1.5 shadow-2xl shadow-black/20"
          >
            <p className="px-2.5 pb-1.5 pt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-gray-500">
              Appearance
            </p>
            {THEMES.map(({ value, label, icon: Icon }) => {
              const selected = value === current;
              return (
                <button
                  key={value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  onClick={() => choose(value)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs outline-none
                    transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-red-300
                    ${selected ? "bg-tint text-ink" : "text-gray-700 hover:bg-tint/60"}`}
                >
                  <Icon size={14} className={selected ? "text-brand" : "text-gray-500"} />
                  <span className="flex-1">{label}</span>
                  {selected && <Check size={13} className="text-brand" />}
                </button>
              );
            })}
            <p className="px-2.5 pb-1 pt-2 text-[10px] text-gray-500">System follows your device.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TopBar({ standalone = false }: { standalone?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const urlQuery = params.get("q") ?? "";
  const [value, setValue] = useState(urlQuery);
  const [isMac, setIsMac] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  // Sync the input when the URL changes (e.g. navigating to another route clears q)
  useEffect(() => setValue(urlQuery), [urlQuery]);

  // Debounced write to the URL
  useEffect(() => {
    if (value === urlQuery) return;
    const timer = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set("q", value);
      else next.delete("q");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 250);
    return () => clearTimeout(timer);
  }, [value, urlQuery, params, pathname, router]);

  // Cmd/Ctrl + K focuses the search
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.userAgent));
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
        input.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function onInputKeys(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Escape") return;
    if (value) setValue("");
    else input.current?.blur();
  }

  return (
    <div
      className={`sticky z-20 grid h-14 shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line bg-surface/80 px-4 backdrop-blur
        sm:px-6 md:static md:grid-cols-[1fr_minmax(0,36rem)_1fr] md:gap-4 ${standalone ? "top-0" : "top-14"}`}
    >
      <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-2 text-xs md:flex">
        <span className="shrink-0 text-gray-500">Your space</span>
        <span aria-hidden="true" className="text-gray-400">
          /
        </span>
        <span className="truncate font-medium text-ink">{crumbFor(pathname)}</span>
      </nav>

      <label className="group relative block w-full">
        <span className="sr-only">{placeholderFor(pathname)}</span>
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors duration-200 group-focus-within:text-brand"
        />
        <input
          ref={input}
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onInputKeys}
          placeholder={placeholderFor(pathname)}
          className="h-10 w-full rounded-xl border border-line-strong bg-panel/60 pl-10 pr-12 text-sm text-ink outline-none
            transition-[background-color,border-color,box-shadow] duration-200
            placeholder:text-gray-500 focus:border-red-300 focus:bg-panel focus:ring-4 focus:ring-red-100
            md:pr-24 [&::-webkit-search-cancel-button]:hidden"
        />
        <kbd
          aria-hidden="true"
          className={`pointer-events-none absolute top-1/2 hidden -translate-y-1/2 items-center gap-0.5 font-mono text-[10px] text-gray-500
            transition-[right] duration-200 md:flex ${value ? "right-10" : "right-3.5"}`}
        >
          {isMac ? "⌘" : "Ctrl"} K
        </kbd>
        <button
          type="button"
          onClick={() => {
            setValue("");
            input.current?.focus();
          }}
          aria-label="Clear search"
          tabIndex={value ? 0 : -1}
          className={`absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 transition-all duration-200 hover:bg-tint hover:text-brand
            ${value ? "scale-100 opacity-100" : "pointer-events-none scale-75 opacity-0"}`}
        >
          <X size={14} />
        </button>
      </label>

      <AppearanceMenu />
    </div>
  );
}