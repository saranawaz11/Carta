"use client";

import { Fraunces } from "next/font/google";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  use,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  Clock,
  Fingerprint,
  FileText,
  KeyRound,
  Library,
  Loader2,
  PanelLeft,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { NotesPanel } from "@/components/notes-panel";
import { TagChip } from "@/components/tag-chip";
import { noteDates } from "@/lib/note-dates";
import { Note, useNote, useNoteActions } from "@/lib/notes";

const display = Fraunces({ subsets: ["latin"], display: "swap" });

/* ---------- STATIC placeholders: replace when the real logic exists ---------- */
const STATIC_TAGS = ["Philosophy", "Cognition"];

const STATIC_SUMMARY = {
  text: "A short summary of this note will appear here. It will capture the main idea in a few sentences so you can recall it at a glance.",
  points: [
    "First key point pulled from the note",
    "Second key point pulled from the note",
    "Third key point pulled from the note",
  ],
  connections: [
    { title: "A related note", reason: "Shares themes with this note" },
    { title: "Another related note", reason: "Mentions the same topic" },
  ],
};

const STATIC_PROVENANCE = {
  folio: "Volume IV, Leaf 42",
  cryptography: "Zero-knowledge token",
  security: "Encrypted with Argon2id & AES-GCM",
};

/* ---------- helpers ---------- */

function formatDate(value: string | undefined, withTime: boolean) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
  });
}

function useAutoResize(ref: RefObject<HTMLTextAreaElement | null>, value: string) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [ref, value]);
}

/* ---------- pieces ---------- */

function SaveStatus({
  saving,
  error,
  dirty,
}: {
  saving: boolean;
  error: string | null;
  dirty: boolean;
}) {
  const base = "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200";
  if (error)
    return (
      <span className={`${base} bg-red-100 text-red-700`} title={error}>
        <AlertCircle size={13} /> Save failed
      </span>
    );
  if (saving)
    return (
      <span className={`${base} bg-panel text-gray-600`}>
        <Loader2 size={13} className="animate-spin" /> Saving...
      </span>
    );
  if (dirty) return <span className={`${base} bg-panel text-gray-500`}>Unsaved changes</span>;
  return (
    <span className={`${base} bg-panel text-gray-600`}>
      <Check size={13} className="text-red-600" /> Saved
    </span>
  );
}

function SummaryPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300 xl:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        aria-label="Note summary"
        aria-hidden={!open}
        inert={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-[360px] max-w-[90vw] flex-col border-l border-red-100 bg-panel shadow-2xl
          transition-[transform,width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${open ? "translate-x-0" : "translate-x-full"}
          xl:static xl:z-auto xl:shrink-0 xl:translate-x-0 xl:overflow-hidden xl:shadow-none
          ${open ? "xl:w-[340px] xl:opacity-100" : "xl:w-0 xl:border-l-0 xl:opacity-0"}`}
      >
        <div className="flex min-h-0 w-[340px] max-w-[90vw] flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-red-100 px-5 py-4">
            <span className="flex size-8 items-center justify-center rounded-full bg-red-700 text-white">
              <Sparkles size={15} />
            </span>
            <h2 className="font-semibold text-gray-900">Summary</h2>
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
              Sample data
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close summary"
              className="ml-auto rounded-lg p-1.5 text-gray-500 transition-colors duration-200 hover:bg-red-100 hover:text-red-700"
            >
              <X size={18} />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                Overview
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-700">{STATIC_SUMMARY.text}</p>
            </section>

            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                Key points
              </h3>
              <ol className="mt-3 flex flex-col gap-3">
                {STATIC_SUMMARY.points.map((point, i) => (
                  <li key={point} className="flex gap-3 text-sm text-gray-700">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-[11px] font-semibold text-red-700">
                      {i + 1}
                    </span>
                    {point}
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                Connected notes
              </h3>
              <ul className="mt-3 flex flex-col gap-2">
                {STATIC_SUMMARY.connections.map((c) => (
                  <li
                    key={c.title}
                    className="flex items-start gap-3 rounded-xl border border-red-100 p-3 transition-[border-color,background-color] duration-200 hover:border-red-300 hover:bg-red-50"
                  >
                    <FileText size={16} className="mt-0.5 shrink-0 text-red-600" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{c.title}</p>
                      <p className="text-xs text-gray-500">{c.reason}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="border-t border-red-100 p-4">
            <Link
              href="/ask"
              className="flex h-10 items-center justify-center gap-2 rounded-full bg-red-700 text-sm font-medium text-white transition-[transform,background-color] duration-200 hover:bg-red-800 active:scale-[0.98]"
            >
              Ask Carta AI about this
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}

const TONES = {
  amber: { tile: "border-amber-100 bg-amber-50/70", icon: "bg-amber-100 text-amber-700" },
  sky: { tile: "border-sky-100 bg-sky-50/70", icon: "bg-sky-100 text-sky-700" },
  emerald: { tile: "border-emerald-100 bg-emerald-50/70", icon: "bg-emerald-100 text-emerald-700" },
  violet: { tile: "border-violet-100 bg-violet-50/70", icon: "bg-violet-100 text-violet-700" },
  pink: { tile: "border-pink-100 bg-pink-50/70", icon: "bg-pink-100 text-pink-700" },
  orange: { tile: "border-orange-100 bg-orange-50/70", icon: "bg-orange-100 text-orange-700" },
} as const;

function Provenance({ note, words, minutes }: { note: Note; words: number; minutes: number }) {
  const { created, updated } = noteDates(note);
  const rows: {
    label: string;
    value: string;
    icon: LucideIcon;
    tone: keyof typeof TONES;
    mono?: boolean;
    sample?: boolean;
  }[] = [
    { label: "Created", value: formatDate(created, false), icon: CalendarDays, tone: "amber" },
    { label: "Last edited", value: formatDate(updated, true), icon: Clock, tone: "sky" },
    { label: "Length", value: `${words} words · ${minutes} min read`, icon: BookOpen, tone: "emerald" },
    { label: "Note ID", value: `#${note.id.slice(0, 8)}`, icon: Fingerprint, tone: "violet", mono: true },
    { label: "Folio placement", value: STATIC_PROVENANCE.folio, icon: Library, tone: "pink", sample: true },
    { label: "Vault cryptography", value: STATIC_PROVENANCE.cryptography, icon: KeyRound, tone: "orange", sample: true },
  ];

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-red-100 bg-panel shadow-sm motion-safe:animate-fade-up">
      <div className="flex items-center gap-3 bg-gradient-to-r from-red-50 via-rose-50 to-amber-50 px-6 py-5 sm:px-8">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-red-700 text-white shadow-sm shadow-red-200">
          <ScrollText size={18} />
        </span>
        <div className="min-w-0">
          <h2 className={`${display.className} text-lg font-semibold text-gray-900`}>
            Archival provenance
          </h2>
          <p className="text-xs text-gray-600">The life of this note at a glance</p>
        </div>
      </div>

      <dl className="grid gap-3 p-6 sm:grid-cols-2 sm:p-8">
        {rows.map(({ label, value, icon: Icon, tone, mono, sample }) => (
          <div
            key={label}
            className={`flex min-w-0 items-start gap-3 rounded-2xl border p-4 transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md ${TONES[tone].tile}`}
          >
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${TONES[tone].icon}`}>
              <Icon size={17} />
            </span>
            <div className="min-w-0">
              <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                {label}
                {sample && (
                  <span className="rounded bg-amber-100 px-1.5 py-px text-[9px] font-semibold normal-case tracking-normal text-amber-800">
                    sample
                  </span>
                )}
              </dt>
              <dd className={`mt-1 truncate text-sm font-medium text-gray-900 ${mono ? "font-mono" : ""}`}>
                {value}
              </dd>
            </div>
          </div>
        ))}
      </dl>

      <div className="border-t border-emerald-100 bg-emerald-50/50 px-6 py-3 sm:px-8">
        <p className="flex items-center gap-2 text-xs font-medium text-emerald-800">
          <ShieldCheck size={14} />
          {STATIC_PROVENANCE.security}
        </p>
      </div>
    </section>
  );
}

/* ---------- page ---------- */

export default function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: note, error, isLoading } = useNote(id);
  const { updateNote, archiveNote, deleteNote } = useNoteActions();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false); // drawer below lg; always docked at lg+
  const loadedNoteId = useRef<string | null>(null);
  const lastAttempt = useRef<string | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useAutoResize(titleRef, title);
  useAutoResize(contentRef, content);

  useEffect(() => {
    if (note && loadedNoteId.current !== note.id) {
      loadedNoteId.current = note.id;
      setTitle(note.title);
      setContent(note.content);
    }
  }, [note]);

  useEffect(() => {
    if (
      !note ||
      loadedNoteId.current !== note.id ||
      (title === note.title && content === note.content) ||
      note.deleted_at !== null
    ) {
      return;
    }
    const attempt = `${note.id}\u0000${title}\u0000${content}`;
    if (lastAttempt.current === attempt) return;
    const timeout = setTimeout(() => {
      lastAttempt.current = attempt;
      setSaving(true);
      setSaveError(null);
      void updateNote(id, note, { title, content })
        .then(() => setSaving(false))
        .catch((cause: unknown) => {
          setSaving(false);
          setSaveError(cause instanceof Error ? cause.message : "Unable to save note");
        });
    }, 800);
    return () => clearTimeout(timeout);
  }, [content, id, note, title, updateNote]);

  // Close the notes drawer after picking a note
  useEffect(() => setNotesOpen(false), [id]);

  // Escape closes either panel
  useEffect(() => {
    if (!summaryOpen && !notesOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSummaryOpen(false);
        setNotesOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [summaryOpen, notesOpen]);

  async function runAction(action: (note: Note) => Promise<unknown>, destination: string) {
    if (!note) return;
    setActing(true);
    setActionError(null);
    try {
      await action(note);
      router.push(destination);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Unable to update note");
    } finally {
      setActing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl animate-pulse space-y-4 p-4 sm:p-6" aria-label="Loading note">
        <div className="h-9 w-1/3 rounded-full bg-red-100/60" />
        <div className="h-[28rem] rounded-3xl bg-red-100/60" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 p-4 sm:p-6">
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error.message}
        </p>
        <Link href="/" className="text-sm font-medium text-red-700 transition-colors hover:text-brand">
          Back to notes
        </Link>
      </div>
    );
  }

  if (!note || note.deleted_at) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-red-200 py-16 text-center">
          <FileText className="text-red-300" size={32} />
          <p className="text-sm text-gray-600">
            {note ? "This note is in Trash." : "Note not found."}
          </p>
          <Link
            href={note ? "/deleted" : "/"}
            className="text-sm font-medium text-red-700 transition-colors hover:text-brand"
          >
            {note ? "Go to Trash" : "Back to notes"}
          </Link>
        </div>
      </div>
    );
  }

  const trimmed = content.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const minutes = Math.max(1, Math.ceil(words / 200));
  const dirty = title !== note.title || content !== note.content;
  const { updated } = noteDates(note);

  return (
    <div className="flex min-h-full md:absolute md:inset-0 md:min-h-0">
      <NotesPanel
        activeId={note.id}
        draft={{ title, content }}
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
      />

      {/* Editor column scrolls on its own */}
      <div className="min-w-0 flex-1 md:overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
          {/* Top row */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 motion-safe:animate-fade-up">
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm text-gray-500">
              <button
                type="button"
                onClick={() => setNotesOpen(true)}
                aria-label="Open notes list"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-red-100 bg-panel transition-[border-color,color] duration-200 hover:border-red-300 hover:text-red-700 lg:hidden"
              >
                <PanelLeft size={15} />
              </button>
              <Link
                href="/"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-red-100 bg-panel px-3 py-1.5 font-medium transition-[border-color,color] duration-200 hover:border-red-300 hover:text-red-700"
              >
                <ArrowLeft size={14} />
                All Notes
              </Link>
              <span aria-hidden="true">/</span>
              <span className="truncate font-medium text-gray-900">{title.trim() || "Untitled"}</span>
            </nav>

            <div className="flex flex-wrap items-center gap-2">
              <SaveStatus saving={saving} error={saveError} dirty={dirty} />
              <button
                type="button"
                onClick={() => setSummaryOpen((v) => !v)}
                aria-expanded={summaryOpen}
                className={`inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-[background-color,border-color,color] duration-200 ${
                  summaryOpen
                    ? "border-red-700 bg-red-700 text-white hover:bg-red-800"
                    : "border-red-100 bg-panel text-gray-700 hover:border-red-300 hover:text-red-700"
                }`}
              >
                <Sparkles size={14} />
                Summary
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={() => void runAction(archiveNote, "/archive")}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-red-100 bg-panel px-4 text-sm font-medium text-gray-700 transition-[border-color,color,opacity] duration-200 hover:border-red-300 hover:text-red-700 disabled:opacity-50"
              >
                <Archive size={14} />
                Archive
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={() => void runAction(deleteNote, "/deleted")}
                className="inline-flex h-9 items-center gap-2 rounded-full bg-red-100 px-4 text-sm font-medium text-red-700 transition-[background-color,color,opacity] duration-200 hover:bg-red-700 hover:text-white disabled:opacity-50"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>

          {actionError && (
            <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {actionError}
            </p>
          )}

          {/* Editor */}
          <div className="rounded-3xl border border-red-100 bg-panel px-6 py-8 shadow-sm motion-safe:animate-fade-up sm:px-12 sm:py-12">
            <p className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
              <span>Last edited {formatDate(updated, true)}</span>
              <span aria-hidden="true">•</span>
              <span className="tabular-nums">{words} words</span>
              <span aria-hidden="true">•</span>
              <span>{minutes} min read</span>
            </p>

            <div className="mb-6 flex flex-wrap items-center gap-2">
              {STATIC_TAGS.map((tag) => (
                <TagChip key={tag} label={tag} />
              ))}
              <span className="rounded-md border border-dashed border-red-200 px-2 py-0.5 text-[11px] text-gray-400">
                + Add tag
              </span>
            </div>

            <textarea
              ref={titleRef}
              rows={1}
              aria-label="Note title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  contentRef.current?.focus();
                }
              }}
              placeholder="Untitled"
              className={`${display.className} block w-full resize-none overflow-hidden bg-transparent text-4xl font-semibold leading-tight tracking-tight text-gray-900 outline-none placeholder:text-gray-300 sm:text-5xl`}
            />

            <textarea
              ref={contentRef}
              aria-label="Note content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Write your note..."
              className={`${display.className} mt-8 block min-h-[50vh] w-full resize-none overflow-hidden bg-transparent text-lg font-normal leading-8 text-gray-800 outline-none placeholder:text-gray-300`}
            />
          </div>

          <p aria-live="polite" className="sr-only">
            {saving ? "Saving..." : saveError ? `Save failed: ${saveError}` : ""}
          </p>
          {saveError && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              Save failed: {saveError}
            </p>
          )}

          <Provenance note={note} words={words} minutes={minutes} />
        </div>
      </div>

      <SummaryPanel open={summaryOpen} onClose={() => setSummaryOpen(false)} />
    </div>
  );
}