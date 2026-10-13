"use client";

import Link from "next/link";
import { Fraunces } from "next/font/google";
import { useRouter, useSearchParams } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Check,
  ChevronDown,
  FileText,
  LayoutGrid,
  List,
  Loader2,
  MoreHorizontal,
  PenLine,
  Pin,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Note, NoteStatus, useNoteActions, useNotes } from "@/lib/notes";
import { useDismiss } from "@/lib/use-dismiss";

const display = Fraunces({ subsets: ["latin"], display: "swap", axes: ["opsz"] });
const ease = [0.22, 1, 0.36, 1] as const;
const VIEW_KEY = "notes-view";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const META: Record<NoteStatus, { title: string; description: string }> = {
  active: {
    title: "Your notes",
    description: "Your evolving archive of thoughts, ideas and drafts, all gathered in one place.",
  },
  archived: {
    title: "Archive",
    description: "Notes you've set aside, kept safe and out of the way until you need them again.",
  },
  deleted: {
    title: "Trash",
    description: "Deleted notes wait here. Restore the ones you miss, or remove the rest for good.",
  },
};

type View = "grid" | "list";
type Sort = "updated-desc" | "updated-asc" | "title";
type Filter = "all" | "pinned";

const SORTS: { value: Sort; label: string }[] = [
  { value: "updated-desc", label: "Last updated ↓" },
  { value: "updated-asc", label: "Oldest updated ↑" },
  { value: "title", label: "Title A–Z" },
];

/* ---------- Note details ----------
 * Pin, collection and dates are read if your Note has them (common field names are checked).
 * Anything missing is simply left out of the UI. */
type Extras = {
  pinned?: boolean;
  isPinned?: boolean;
  collection?: string | null;
  folder?: string | null;
  updatedAt?: string | number | Date | null;
  updated_at?: string | number | Date | null;
  createdAt?: string | number | Date | null;
  created_at?: string | number | Date | null;
};

function toDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  const d = new Date(value as string | number | Date);
  return Number.isNaN(d.getTime()) ? null : d;
}

function details(note: Note) {
  const x = note as Note & Extras;
  const words = (note.content ?? "").trim().split(/\s+/).filter(Boolean).length;
  return {
    hasPinField: "pinned" in x || "isPinned" in x,
    pinned: Boolean(x.pinned ?? x.isPinned),
    collection: x.collection ?? x.folder ?? null,
    updated: toDate(x.updatedAt ?? x.updated_at ?? x.createdAt ?? x.created_at),
    words,
  };
}

function stamp(d: Date) {
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase();
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  if (diff === 0) return `Today, ${time}`;
  if (diff === 1) return `Yesterday, ${time}`;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  const date = d.toLocaleDateString([], sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
  return `${date}, ${time}`;
}

function sortNotes(notes: Note[], sort: Sort, floatPinned: boolean) {
  const copy = [...notes];
  const title = (n: Note) => n.title.trim() || "Untitled";
  if (sort === "title") copy.sort((a, b) => title(a).localeCompare(title(b)));
  else {
    const dir = sort === "updated-desc" ? -1 : 1;
    copy.sort((a, b) => ((details(a).updated?.getTime() ?? 0) - (details(b).updated?.getTime() ?? 0)) * dir);
  }
  if (floatPinned) copy.sort((a, b) => Number(details(b).pinned) - Number(details(a).pinned));
  return copy;
}

/* ---------- Pieces ---------- */

function NoteActions({ note }: { note: Note }) {
  const { restoreNote, purgeNote } = useNoteActions();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: (note: Note) => Promise<unknown>) {
    setPending(true);
    setError(null);
    try {
      await action(note);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update note");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-line px-5 py-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => void run(restoreNote)}>
          Restore
        </Button>
        <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={() => void run(purgeNote)}>
          Delete permanently
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-brand">
          {error}
        </p>
      )}
    </div>
  );
}

/** The "..." menu on list rows */
function RowMenu({ note, status }: { note: Note; status: NoteStatus }) {
  const { restoreNote, purgeNote } = useNoteActions();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);

  async function run(action: (note: Note) => Promise<unknown>) {
    setPending(true);
    setError(null);
    try {
      await action(note);
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update note");
    } finally {
      setPending(false);
    }
  }

  const item =
    "flex w-full items-center rounded-lg px-2.5 py-2 text-left text-xs text-gray-700 outline-none transition-colors duration-150 hover:bg-tint/60 focus-visible:ring-2 focus-visible:ring-red-300 disabled:opacity-50";

  return (
    <div ref={ref} className="relative justify-self-end">
      <button
        type="button"
        aria-label={`More actions for ${note.title.trim() || "Untitled"}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex size-9 items-center justify-center rounded-lg text-gray-500 transition-colors duration-200 hover:bg-tint hover:text-brand"
      >
        <MoreHorizontal size={16} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15, ease }}
            className="absolute right-0 top-full z-20 mt-1 w-48 origin-top-right rounded-xl border border-line-strong bg-panel p-1.5 shadow-2xl shadow-black/20"
          >
            <Link href={`/notes/${note.id}`} role="menuitem" className={item}>
              Open note
            </Link>
            {status === "deleted" && (
              <>
                <button type="button" role="menuitem" disabled={pending} onClick={() => void run(restoreNote)} className={item}>
                  Restore
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={pending}
                  onClick={() => void run(purgeNote)}
                  className={`${item} text-red-700 dark:text-brand`}
                >
                  Delete permanently
                </button>
              </>
            )}
            {error && (
              <p role="alert" className="px-2.5 pb-1 pt-1.5 text-[11px] text-red-700 dark:text-brand">
                {error}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SortMenu({ sort, onChange }: { sort: Sort; onChange: (s: Sort) => void }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const current = SORTS.find((s) => s.value === sort) ?? SORTS[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-gray-600 transition-colors duration-200 hover:text-ink"
      >
        {current.label}
        <ChevronDown size={12} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15, ease }}
            className="absolute left-0 top-full z-20 mt-2 w-44 origin-top-left rounded-xl border border-line-strong bg-panel p-1.5 shadow-2xl shadow-black/20"
          >
            {SORTS.map((s) => (
              <button
                key={s.value}
                type="button"
                role="menuitemradio"
                aria-checked={s.value === sort}
                onClick={() => {
                  onChange(s.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-red-300 ${
                  s.value === sort ? "bg-tint text-ink" : "text-gray-700 hover:bg-tint/60"
                }`}
              >
                {s.label}
                {s.value === sort && <Check size={12} className="text-brand" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const pill = useId();
  const options = [
    { value: "grid" as const, label: "Gallery", icon: LayoutGrid },
    { value: "list" as const, label: "List", icon: List },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Layout"
      className="inline-flex items-center rounded-full border border-line-strong bg-panel/60 p-1"
    >
      {options.map(({ value, label, icon: Icon }) => {
        const active = view === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(value)}
            className={`relative inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition-colors duration-200 ${
              active ? "text-brand" : "text-gray-600 hover:text-ink"
            }`}
          >
            {active && (
              <motion.span
                layoutId={pill}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="absolute inset-0 rounded-full bg-tint"
              />
            )}
            <Icon size={14} className="relative" />
            <span className="relative">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function FilterTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`transition-colors duration-200 ${active ? "font-medium text-brand" : "text-gray-600 hover:text-ink"}`}
    >
      {children}
    </button>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-36 animate-pulse rounded-2xl bg-chrome" />
      ))}
    </div>
  );
}

function GridView({ notes, status }: { notes: Note[]; status: NoteStatus }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {notes.map((note, index) => {
        const d = details(note);
        return (
          <li
            key={note.id}
            style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
            className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-sm
              transition-[transform,box-shadow,border-color] duration-300 ease-out motion-safe:animate-fade-up
              hover:-translate-y-0.5 hover:border-red-300 hover:shadow-lg hover:shadow-red-900/5"
          >
            <Link
              href={`/notes/${note.id}`}
              className="flex flex-1 flex-col gap-2 p-5 outline-none focus-visible:ring-2 focus-visible:ring-red-300"
            >
              <div className="flex items-start justify-between gap-2">
                <h2
                  className={`${display.className} truncate text-xl font-normal leading-snug text-ink transition-colors duration-200 group-hover:text-brand`}
                >
                  {note.title.trim() || "Untitled"}
                </h2>
                {d.pinned && <Pin size={13} className="mt-1.5 shrink-0 text-brand" aria-label="Pinned" />}
              </div>
              {note.content ? (
                <p className="line-clamp-4 break-words text-sm leading-relaxed text-gray-600">{note.content}</p>
              ) : (
                <p className="text-sm italic text-gray-400">Empty note</p>
              )}
              {(d.collection || d.updated) && (
                <div className="mt-auto flex items-center justify-between gap-3 pt-3 text-[11px]">
                  <span className="truncate text-brand">{d.collection}</span>
                  {d.updated && <span className="shrink-0 text-gray-500">{stamp(d.updated)}</span>}
                </div>
              )}
            </Link>
            {status === "deleted" && <NoteActions note={note} />}
          </li>
        );
      })}
    </ul>
  );
}

function ListView({
  notes,
  status,
  sort,
}: {
  notes: Note[];
  status: NoteStatus;
  sort: Sort;
}) {
  const showCollection = notes.some((n) => details(n).collection);
  const cols = showCollection
    ? "md:grid-cols-[minmax(0,1fr)_160px_160px_40px]"
    : "md:grid-cols-[minmax(0,1fr)_160px_40px]";
  const label = "font-mono text-[9px] uppercase tracking-[0.18em] text-gray-500";

  return (
    <div className="rounded-2xl border border-line bg-panel/40">
      <div className={`hidden grid-cols-1 items-center gap-4 border-b border-line px-5 py-3 md:grid ${cols}`}>
        <span className={label}>Note</span>
        {showCollection && <span className={label}>Collection</span>}
        <span className={label}>Last updated{sort === "updated-desc" ? " ↓" : sort === "updated-asc" ? " ↑" : ""}</span>
        <span />
      </div>

      <ul>
        {notes.map((note, index) => {
          const d = details(note);
          return (
            <li
              key={note.id}
              style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              className={`group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-line px-5 py-4 transition-colors duration-200
                last:border-b-0 hover:bg-tint/30 motion-safe:animate-fade-up ${cols}`}
            >
              <Link
                href={`/notes/${note.id}`}
                className="min-w-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-red-300"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`${display.className} truncate text-xl font-normal leading-snug text-ink transition-colors duration-200 group-hover:text-brand`}
                  >
                    {note.title.trim() || "Untitled"}
                  </span>
                  {d.pinned && <Pin size={13} className="shrink-0 text-brand" aria-label="Pinned" />}
                </span>
                <span className="mt-1 block truncate text-xs text-gray-600">
                  {note.content || <span className="italic text-gray-400">Empty note</span>}
                </span>
              </Link>

              {showCollection && (
                <span className="hidden truncate text-xs text-brand md:block">{d.collection}</span>
              )}

              <span className="hidden md:block">
                {d.updated && <span className="block text-xs text-ink">{stamp(d.updated)}</span>}
                <span className="mt-0.5 block font-mono text-[10px] text-gray-500">
                  {d.words} {d.words === 1 ? "word" : "words"}
                </span>
              </span>

              <RowMenu note={note} status={status} />

              {/* Small screens: details drop under the title */}
              <span className="col-span-2 flex flex-wrap items-center gap-x-3 text-[11px] text-gray-500 md:hidden">
                {d.collection && <span className="text-brand">{d.collection}</span>}
                {d.updated && <span>{stamp(d.updated)}</span>}
                <span>
                  {d.words} {d.words === 1 ? "word" : "words"}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------- Page ---------- */

export function NoteList({ status }: { status: NoteStatus }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const query = useSearchParams().get("q") ?? "";
  const { data: notes, error, isLoading } = useNotes(status, query);
  const { createNote } = useNoteActions();

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [view, setView] = useState<View>("grid");
  const [sort, setSort] = useState<Sort>("updated-desc");
  const [filter, setFilter] = useState<Filter>("all");

  // Remember the chosen layout
  useIsoLayoutEffect(() => {
    const saved = localStorage.getItem(VIEW_KEY);
    if (saved === "grid" || saved === "list") setView(saved);
  }, []);

  function changeView(next: View) {
    setView(next);
    localStorage.setItem(VIEW_KEY, next);
  }

  const { title, description } = META[status];
  const total = notes?.length;
  const hasPinField = !!notes?.some((n) => details(n).hasPinField);
  const pinnedCount = notes?.filter((n) => details(n).pinned).length ?? 0;

  const visible = useMemo(() => {
    if (!notes) return [];
    const base = filter === "pinned" ? notes.filter((n) => details(n).pinned) : notes;
    return sortNotes(base, sort, status === "active" && hasPinField);
  }, [notes, filter, sort, status, hasPinField]);

  const countLabel =
    total === undefined
      ? ""
      : query
        ? `${total} ${total === 1 ? "result" : "results"} for “${query}”`
        : `${total} ${total === 1 ? "note" : "notes"}`;

  async function handleInscribe() {
    if (creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const note = await createNote();
      router.push(`/notes/${note.id}`);
      // Stay in the "creating" state until navigation completes to avoid a flash
    } catch (cause) {
      setCreateError(cause instanceof Error ? cause.message : "Unable to create note");
      setCreating(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-6xl">
      <header className="mb-8 flex flex-col gap-3 motion-safe:animate-fade-up">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand">
          Carta{countLabel && <span className="tabular-nums"> / {countLabel}</span>}
        </p>
        <h1 className={`${display.className} text-4xl font-light tracking-tight text-ink sm:text-5xl`}>{title}</h1>
        <p className="max-w-xl text-sm leading-relaxed text-gray-600 sm:text-base">{description}</p>
      </header>

      {notes && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            <FilterTab active={filter === "all"} onClick={() => setFilter("all")}>
              All {status === "active" ? "notes" : title.toLowerCase()} · {total}
            </FilterTab>
            {hasPinField && (
              <FilterTab active={filter === "pinned"} onClick={() => setFilter("pinned")}>
                Pinned · {pinnedCount}
              </FilterTab>
            )}
            <SortMenu sort={sort} onChange={setSort} />
          </div>

          <div className="flex items-center gap-3">
            <ViewToggle view={view} onChange={changeView} />
            {status === "active" && (
              <Button
                type="button"
                onClick={handleInscribe}
                disabled={creating}
                className="h-11 gap-2 rounded-full bg-button px-6 text-white shadow-sm
                  transition-[transform,box-shadow,background-color] duration-200 ease-out
                  hover:-translate-y-0.5 hover:bg-button-hover hover:shadow-lg hover:shadow-red-900/25
                  active:translate-y-0 active:scale-[0.98] disabled:opacity-80"
              >
                {creating ? <Loader2 size={16} className="animate-spin" /> : <PenLine size={16} />}
                {creating ? "Inscribing..." : "Inscribe Note"}
              </Button>
            )}
          </div>
        </div>
      )}

      {createError && (
        <p role="alert" className="-mt-3 mb-5 text-xs text-red-600 sm:text-right dark:text-brand">
          {createError}
        </p>
      )}

      {isLoading && <SkeletonGrid />}

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-line-strong bg-red-50 p-4 text-sm text-red-700 dark:text-brand"
        >
          {error.message}
        </p>
      )}

      {!isLoading && !error && notes && visible.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line-strong py-16 text-center motion-safe:animate-fade-up">
          <FileText className="text-brand/60" size={32} />
          <p className="text-sm text-gray-500">
            {query
              ? "No notes match your search."
              : filter === "pinned"
                ? "No pinned notes yet."
                : "No notes here yet."}
          </p>
        </div>
      )}

      {visible.length > 0 && (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease }}
          >
            {view === "grid" ? (
              <GridView notes={visible} status={status} />
            ) : (
              <ListView notes={visible} status={status} sort={sort} />
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </section>
  );
}