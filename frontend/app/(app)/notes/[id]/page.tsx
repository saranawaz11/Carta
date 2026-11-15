"use client";

import { Fraunces } from "next/font/google";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { VoiceNote } from "@/components/voice-note";
import { RichNoteEditor } from "@/components/rich-note-editor";
import { richContentToText, textToRichContent } from "@/lib/rich-notes";
import type { Editor, JSONContent } from "@tiptap/react";
import {
  use,
  useCallback,
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
  Mic,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { NotesPanel } from "@/components/notes-panel";
import { TagChip } from "@/components/tag-chip";
import { useTags } from "@/lib/tags";
import { FolderMove } from "@/components/folder-move";
import { noteDates } from "@/lib/note-dates";
import { Note, useNote, useNoteActions } from "@/lib/notes";
import { formatDeadline, useNoteSummary } from "@/lib/summary";
import type { VoiceState } from "@/lib/voice";

const display = Fraunces({ subsets: ["latin"], display: "swap" });

const PANEL_KEY = "notes-panel-collapsed";

/* ---------- STATIC placeholders: replace when the real logic exists ---------- */

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

function useAutoResize(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
) {
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
  const base =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200";
  if (error)
    return (
      <span
        className={`${base} bg-red-100 text-red-700 dark:text-brand`}
        title={error}
      >
        <AlertCircle size={13} /> Save failed
      </span>
    );
  if (saving)
    return (
      <span className={`${base} bg-panel text-gray-600`}>
        <Loader2 size={13} className="animate-spin" /> Saving...
      </span>
    );
  if (dirty)
    return (
      <span className={`${base} bg-panel text-gray-500`}>Unsaved changes</span>
    );
  return (
    <span className={`${base} bg-panel text-gray-600`}>
      <Check size={13} className="text-red-600 dark:text-brand" /> Saved
    </span>
  );
}

function SummaryPanel({
  noteId,
  empty,
  open,
  onClose,
}: {
  noteId: string;
  empty: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const {
    summary,
    isLoading,
    pending,
    error,
    generate,
    removeDeadline,
    addDeadlineToTasks,
  } = useNoteSummary(noteId);
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
        className={`fixed inset-y-0 right-0 z-50 flex w-[360px] max-w-[90vw] flex-col border-l border-line bg-panel shadow-2xl
          transition-[transform,width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none
          ${open ? "translate-x-0" : "translate-x-full"}
          xl:static xl:z-auto xl:shrink-0 xl:translate-x-0 xl:overflow-hidden xl:shadow-none
          ${open ? "xl:w-[340px] xl:opacity-100" : "xl:w-0 xl:border-l-0 xl:opacity-0"}`}
      >
        <div className="flex min-h-0 w-[340px] max-w-[90vw] flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-line px-5 py-4">
            <span className="flex size-8 items-center justify-center rounded-full bg-red-700 text-white">
              <Sparkles size={15} />
            </span>
            <h2 className="font-semibold text-gray-900">Summary</h2>
            <button
              type="button"
              onClick={generate}
              disabled={empty || pending}
              className="ml-auto flex h-7 items-center gap-1.5 rounded-full bg-red-700 px-3 text-xs font-medium text-white transition-[transform,background-color] duration-200 hover:bg-red-800 active:scale-[0.98] disabled:opacity-50"
            >
              {pending && <Loader2 size={12} className="animate-spin" />}
              {summary ? "Regenerate" : "Summarize"}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close summary"
              className="rounded-lg p-1.5 text-gray-500 transition-colors duration-200 hover:bg-red-100 hover:text-red-700 dark:hover:text-brand"
            >
              <X size={18} />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
            {error && <p className="text-xs text-red-700">{error}</p>}
            {summary?.stale && (
              <p className="text-xs text-amber-800 dark:text-amber-300">
                This note changed since the summary was generated.
              </p>
            )}
            {!summary && (
              <p className="text-sm text-gray-500">
                {isLoading
                  ? "Loading..."
                  : empty
                    ? "Add some content to this note to summarize it."
                    : "No summary yet. Press Summarize to create one."}
              </p>
            )}
            {summary && (
              <>
                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                    Overview
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-700">
                    {summary.overview}
                  </p>
                </section>

                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                    Key points
                  </h3>
                  <ol className="mt-3 flex flex-col gap-3">
                    {summary.key_points.map((point, i) => (
                      <li
                        key={point}
                        className="flex gap-3 text-sm text-gray-700"
                      >
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-[11px] font-semibold text-red-700 dark:text-brand">
                          {i + 1}
                        </span>
                        {point}
                      </li>
                    ))}
                  </ol>
                </section>

                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                    Deadlines
                  </h3>
                  {summary.deadlines.length === 0 ? (
                    <p className="mt-2 text-sm text-gray-500">
                      No deadlines found.
                    </p>
                  ) : (
                    <ul className="mt-3 flex flex-col gap-2">
                      {summary.deadlines.map((d, i) => (
                        <li
                          key={`${d.title}-${d.due_at}`}
                          className="flex items-start gap-3 rounded-xl border border-line p-3"
                        >
                          <CalendarDays
                            size={16}
                            className="mt-0.5 shrink-0 text-red-600 dark:text-brand"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {d.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDeadline(d)}
                            </p>
                            <div className="mt-2 flex items-center gap-3 text-xs">
                              {d.already_in_tasks ? (
                                <span className="flex items-center gap-1 text-gray-500">
                                  <Check size={12} /> Added
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => addDeadlineToTasks(i)}
                                  disabled={pending}
                                  className="font-medium text-red-700 hover:underline disabled:opacity-50 dark:text-brand"
                                >
                                  Add to tasks
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => removeDeadline(i)}
                                disabled={pending}
                                className="text-gray-500 hover:underline disabled:opacity-50"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                    Connected notes
                  </h3>
                  <ul className="mt-3 flex flex-col gap-2">
                    {summary.connections.map((c) => (
                      <li key={c.note_id}>
                        <Link
                          href={`/notes/${c.note_id}`}
                          className="flex items-start gap-3 rounded-xl border border-line p-3 transition-[border-color,background-color] duration-200 hover:border-red-300 hover:bg-red-50"
                        >
                          <FileText
                            size={16}
                            className="mt-0.5 shrink-0 text-red-600 dark:text-brand"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {c.title}
                            </p>
                            <p className="text-xs text-gray-500">{c.reason}</p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              </>
            )}
          </div>

          <div className="border-t border-line p-4">
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
  amber: {
    tile: "border-amber-100 bg-amber-50/70 dark:border-amber-400/20 dark:bg-amber-400/10",
    icon: "bg-amber-100 text-amber-700 dark:bg-amber-400/20 dark:text-amber-300",
  },
  sky: {
    tile: "border-sky-100 bg-sky-50/70 dark:border-sky-400/20 dark:bg-sky-400/10",
    icon: "bg-sky-100 text-sky-700 dark:bg-sky-400/20 dark:text-sky-300",
  },
  emerald: {
    tile: "border-emerald-100 bg-emerald-50/70 dark:border-emerald-400/20 dark:bg-emerald-400/10",
    icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-300",
  },
  violet: {
    tile: "border-violet-100 bg-violet-50/70 dark:border-violet-400/20 dark:bg-violet-400/10",
    icon: "bg-violet-100 text-violet-700 dark:bg-violet-400/20 dark:text-violet-300",
  },
  pink: {
    tile: "border-pink-100 bg-pink-50/70 dark:border-pink-400/20 dark:bg-pink-400/10",
    icon: "bg-pink-100 text-pink-700 dark:bg-pink-400/20 dark:text-pink-300",
  },
  orange: {
    tile: "border-orange-100 bg-orange-50/70 dark:border-orange-400/20 dark:bg-orange-400/10",
    icon: "bg-orange-100 text-orange-700 dark:bg-orange-400/20 dark:text-orange-300",
  },
} as const;

function Provenance({
  note,
  words,
  minutes,
}: {
  note: Note;
  words: number;
  minutes: number;
}) {
  const { created, updated } = noteDates(note);
  const rows: {
    label: string;
    value: string;
    icon: LucideIcon;
    tone: keyof typeof TONES;
    mono?: boolean;
    sample?: boolean;
  }[] = [
    {
      label: "Created",
      value: formatDate(created, false),
      icon: CalendarDays,
      tone: "amber",
    },
    {
      label: "Last edited",
      value: formatDate(updated, true),
      icon: Clock,
      tone: "sky",
    },
    {
      label: "Length",
      value: `${words} words · ${minutes} min read`,
      icon: BookOpen,
      tone: "emerald",
    },
    {
      label: "Note ID",
      value: `#${note.id.slice(0, 8)}`,
      icon: Fingerprint,
      tone: "violet",
      mono: true,
    },
    {
      label: "Folio placement",
      value: STATIC_PROVENANCE.folio,
      icon: Library,
      tone: "pink",
      sample: true,
    },
    {
      label: "Vault cryptography",
      value: STATIC_PROVENANCE.cryptography,
      icon: KeyRound,
      tone: "orange",
      sample: true,
    },
  ];

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-line bg-panel shadow-sm motion-safe:animate-fade-up">
      <div className="flex items-center gap-3 bg-gradient-to-r from-red-50 via-rose-50 to-amber-50 px-6 py-5 dark:via-rose-400/5 dark:to-amber-400/10 sm:px-8">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-red-700 text-white shadow-sm shadow-red-200 dark:shadow-black/30">
          <ScrollText size={18} />
        </span>
        <div className="min-w-0">
          <h2
            className={`${display.className} text-lg font-semibold text-gray-900`}
          >
            Archival provenance
          </h2>
          <p className="text-xs text-gray-600">
            The life of this note at a glance
          </p>
        </div>
      </div>

      <dl className="grid gap-3 p-6 sm:grid-cols-2 sm:p-8">
        {rows.map(({ label, value, icon: Icon, tone, mono, sample }) => (
          <div
            key={label}
            className={`flex min-w-0 items-start gap-3 rounded-2xl border p-4 transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md ${TONES[tone].tile}`}
          >
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${TONES[tone].icon}`}
            >
              <Icon size={17} />
            </span>
            <div className="min-w-0">
              <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                {label}
                {sample && (
                  <span className="rounded bg-amber-100 px-1.5 py-px text-[9px] font-semibold normal-case tracking-normal text-amber-800 dark:bg-amber-400/20 dark:text-amber-300">
                    sample
                  </span>
                )}
              </dt>
              <dd
                className={`mt-1 truncate text-sm font-medium text-gray-900 ${mono ? "font-mono" : ""}`}
              >
                {value}
              </dd>
            </div>
          </div>
        ))}
      </dl>

      <div className="border-t border-emerald-100 bg-emerald-50/50 px-6 py-3 dark:border-emerald-400/20 dark:bg-emerald-400/10 sm:px-8">
        <p className="flex items-center gap-2 text-xs font-medium text-emerald-800 dark:text-emerald-300">
          <ShieldCheck size={14} />
          {STATIC_PROVENANCE.security}
        </p>
      </div>
    </section>
  );
}

/* ---------- page ---------- */

export default function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
  const [notesOpen, setNotesOpen] = useState(false); // drawer below lg
  const [notesCollapsed, setNotesCollapsed] = useState(false); // docked panel at lg+, remembered
  const loadedNoteId = useRef<string | null>(null);
  const lastAttempt = useRef<string | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const initialRich = note
    ? (note.content_rich ?? textToRichContent(note.content))
    : null;
  const [richContent, setRichContent] = useState<JSONContent | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const voiceInsertionRef = useRef<{ from: number; to: number } | null>(null);
  const voiceActive = voiceState === "connecting" || voiceState === "listening";

  const handleVoiceStart = useCallback(() => {
    const at = editorRef.current?.state.selection.to ?? 1;
    voiceInsertionRef.current = { from: at, to: at };
  }, []);

  // Each transcript is cumulative, so it replaces the text inserted so far
  const handleVoiceTranscript = useCallback((transcript: string) => {
    const editor = editorRef.current;
    const insertion = voiceInsertionRef.current;
    if (!editor || !insertion) return;
    const chain = editor.chain().deleteRange({
      from: insertion.from,
      to: insertion.to,
    });
    if (transcript) {
      chain.insertContentAt(insertion.from, { type: "text", text: transcript });
    }
    chain.run();
    insertion.to = insertion.from + transcript.length;
  }, []);

  const handleVoiceState = useCallback((next: VoiceState) => {
    setVoiceState(next);
  }, []);

  const { data: allTags, mutate: refreshTags } = useTags();
  const [addingTag, setAddingTag] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tagError, setTagError] = useState<string | null>(null);
  const typedTag = tagInput.trim().toLowerCase();
  const suggestions = (allTags ?? [])
    .filter((tag) => !note?.tags.includes(tag) && tag.includes(typedTag))
    .slice(0, 5);

  function closeTagInput() {
    setAddingTag(false);
    setTagInput("");
    setTagError(null);
  }

  function saveTags(tags: string[]) {
    if (!note) return;
    setTagError(null);
    void updateNote(id, note, { tags })
      .then(() => refreshTags())
      .catch((cause: unknown) =>
        setTagError(
          cause instanceof Error ? cause.message : "Unable to save tags",
        ),
      );
  }

  function addTag(raw: string) {
    if (!note) return;
    const tag = raw.trim().toLowerCase().split(/\s+/).join(" ");
    if (!tag) return;
    if (tag.length > 30)
      return setTagError("Tags can be at most 30 characters");
    if (note.tags.includes(tag)) return setTagError("Tag already added");
    if (note.tags.length >= 10)
      return setTagError("A note can have at most 10 tags");
    saveTags([...note.tags, tag]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    if (note) saveTags(note.tags.filter((item) => item !== tag));
  }
  useAutoResize(titleRef, title);

  // Restore the docked panel's state before first paint so it doesn't jump
  useLayoutEffect(() => {
    setNotesCollapsed(localStorage.getItem(PANEL_KEY) === "true");
  }, []);

  function setPanelCollapsed(next: boolean) {
    setNotesCollapsed(next);
    localStorage.setItem(PANEL_KEY, String(next));
  }

  // The button in the top row opens the drawer on small screens and unfolds the panel on desktop
  function openNotesList() {
    if (window.matchMedia("(min-width: 1024px)").matches)
      setPanelCollapsed(false);
    else setNotesOpen(true);
  }

  useEffect(() => {
    if (note && loadedNoteId.current !== note.id) {
      loadedNoteId.current = note.id;
      setTitle(note.title);
      setContent(note.content);
      setRichContent(initialRich);
    }
  }, [note, initialRich]);

  useEffect(() => {
    if (!note || voiceActive || loadedNoteId.current !== note.id || note.deleted_at !== null) {
      return;
    }
    const baseRich = note.content_rich ?? textToRichContent(note.content);
    const richChanged =
      richContent !== null &&
      JSON.stringify(richContent) !== JSON.stringify(baseRich);
    if (!richChanged && title === note.title && content === note.content) {
      return;
    }
    const attempt = `${note.id}\u0000${title}\u0000${content}\u0000${JSON.stringify(richContent)}`;
    if (lastAttempt.current === attempt) return;
    const timeout = setTimeout(() => {
      lastAttempt.current = attempt;
      setSaving(true);
      setSaveError(null);
      void updateNote(id, note, { title, content, content_rich: richContent })
        .then(() => setSaving(false))
        .catch((cause: unknown) => {
          setSaving(false);
          setSaveError(
            cause instanceof Error ? cause.message : "Unable to save note",
          );
        });
    }, 800);
    return () => clearTimeout(timeout);
  }, [content, id, note, richContent, title, updateNote, voiceActive]);

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

  async function runAction(
    action: (note: Note) => Promise<unknown>,
    destination: string,
  ) {
    if (!note) return;
    setActing(true);
    setActionError(null);
    try {
      await action(note);
      router.push(destination);
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Unable to update note",
      );
    } finally {
      setActing(false);
    }
  }

  if (isLoading) {
    return (
      <div
        className="mx-auto max-w-3xl animate-pulse space-y-4 p-4 sm:p-6"
        aria-label="Loading note"
      >
        <div className="h-9 w-1/3 rounded-full bg-chrome" />
        <div className="h-[28rem] rounded-3xl bg-chrome" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 p-4 sm:p-6">
        <p
          role="alert"
          className="rounded-xl border border-line-strong bg-red-50 p-4 text-sm text-red-700 dark:text-brand"
        >
          {error.message}
        </p>
        <Link
          href="/"
          className="text-sm font-medium text-red-700 transition-colors hover:text-brand dark:text-brand dark:hover:text-brand-strong"
        >
          Back to notes
        </Link>
      </div>
    );
  }

  if (!note || note.deleted_at) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line-strong py-16 text-center">
          <FileText className="text-red-300 dark:text-brand/60" size={32} />
          <p className="text-sm text-gray-600">
            {note ? "This note is in Trash." : "Note not found."}
          </p>
          <Link
            href={note ? "/deleted" : "/"}
            className="text-sm font-medium text-red-700 transition-colors hover:text-brand dark:text-brand dark:hover:text-brand-strong"
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

  const pill =
    "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-panel transition-[border-color,color] duration-200 hover:border-red-300 hover:text-red-700 dark:hover:text-brand";

  return (
    <div className="flex min-h-full md:absolute md:inset-0 md:min-h-0">
      <NotesPanel
        activeId={note.id}
        draft={{ title, content }}
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        collapsed={notesCollapsed}
        onCollapse={() => setPanelCollapsed(true)}
      />

      {/* Editor column scrolls on its own */}
      <div className="min-w-0 flex-1 md:overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
          {/* Top row */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 motion-safe:animate-fade-up">
            <nav
              aria-label="Breadcrumb"
              className="flex min-w-0 items-center gap-2 text-sm text-gray-500"
            >
              {/* Drawer button below lg; at lg+ it only appears once the panel is folded away */}
              <button
                type="button"
                onClick={openNotesList}
                aria-label="Open notes list"
                title="Open notes list"
                className={`${pill} size-8 justify-center ${notesCollapsed ? "" : "lg:hidden"}`}
              >
                <PanelLeft size={15} />
              </button>
              <Link href="/" className={`${pill} px-3 py-1.5 font-medium`}>
                <ArrowLeft size={14} />
                All Notes
              </Link>
              <span aria-hidden="true">/</span>
              <span className="truncate font-medium text-gray-900">
                {title.trim() || "Untitled"}
              </span>
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
                    : "border-line bg-panel text-gray-700 hover:border-red-300 hover:text-red-700 dark:hover:text-brand"
                }`}
              >
                <Sparkles size={14} />
                Summary
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={() => void runAction(archiveNote, "/archive")}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-panel px-4 text-sm font-medium text-gray-700 transition-[border-color,color,opacity] duration-200 hover:border-red-300 hover:text-red-700 disabled:opacity-50 dark:hover:text-brand"
              >
                <Archive size={14} />
                Archive
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={() => void runAction(deleteNote, "/deleted")}
                className="inline-flex h-9 items-center gap-2 rounded-full bg-red-100 px-4 text-sm font-medium text-red-700 transition-[background-color,color,opacity] duration-200 hover:bg-red-700 hover:text-white disabled:opacity-50 dark:text-brand dark:hover:text-white"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>

          {actionError && (
            <p
              role="alert"
              className="mb-4 rounded-xl border border-line-strong bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:text-brand"
            >
              {actionError}
            </p>
          )}

          {/* Editor */}
          <div className="rounded-3xl border border-line bg-panel px-6 py-8 shadow-sm motion-safe:animate-fade-up sm:px-12 sm:py-12">
            <p className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
              <span>Last edited {formatDate(updated, true)}</span>
              <span aria-hidden="true">•</span>
              <span className="tabular-nums">{words} words</span>
              <span aria-hidden="true">•</span>
              <span>{minutes} min read</span>
            </p>

            <div className="mb-4">
              <FolderMove note={note} />
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-2">
              {note.tags.map((tag) => (
                <TagChip
                  key={tag}
                  label={tag}
                  onRemove={() => removeTag(tag)}
                />
              ))}
              {addingTag ? (
                <span className="relative">
                  <input
                    autoFocus
                    value={tagInput}
                    maxLength={30}
                    aria-label="New tag"
                    onChange={(event) => {
                      setTagInput(event.target.value);
                      setTagError(null);
                    }}
                    onBlur={closeTagInput}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addTag(tagInput);
                      } else if (event.key === "Escape") {
                        closeTagInput();
                      }
                    }}
                    className="w-28 rounded-md border border-dashed border-line-strong bg-transparent px-2 py-0.5 text-[11px] outline-none"
                  />
                  {suggestions.length > 0 && (
                    <ul className="absolute left-0 top-full z-10 mt-1 w-40 rounded-md border border-line bg-panel py-1 text-[11px] shadow-sm">
                      {suggestions.map((tag) => (
                        <li key={tag}>
                          <button
                            type="button"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              addTag(tag);
                            }}
                            className="block w-full px-2 py-0.5 text-left hover:bg-gray-100"
                          >
                            #{tag}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingTag(true)}
                  className="rounded-md border border-dashed border-line-strong px-2 py-0.5 text-[11px] text-gray-400"
                >
                  + Add tag
                </button>
              )}
              {tagError && (
                <span className="text-[11px] text-red-700">{tagError}</span>
              )}
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
                  editorRef.current?.commands.focus("start");
                }
              }}
              placeholder="Untitled"
              className={`${display.className} block w-full resize-none overflow-hidden bg-transparent text-4xl font-semibold leading-tight tracking-tight text-gray-900 outline-none placeholder:text-gray-300 sm:text-5xl`}
            />

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setVoiceOpen((value) => !value)}
                disabled={voiceActive}
                aria-expanded={voiceOpen}
                className={`inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-[background-color,border-color,color] duration-200 ${
                  voiceOpen
                    ? "border-line-strong bg-tint text-brand"
                    : "border-line bg-panel text-gray-700 hover:border-red-300 hover:text-red-700 dark:hover:text-brand"
                }`}
              >
                <Mic size={14} />
                Voice note
              </button>
            </div>

            {voiceOpen && (
              <VoiceNote
                className="mt-5"
                onTranscriptChange={handleVoiceTranscript}
                onStateChange={handleVoiceState}
                onStart={handleVoiceStart}
                onClose={() => setVoiceOpen(false)}
              />
            )}

            <div className={`${display.className} mt-8 min-h-[50vh] text-lg leading-8`}>
              <RichNoteEditor
                key={note?.id}
                content={initialRich}
                editorRef={editorRef}
                disabled={voiceActive}
                onChange={(json) => {
                  setRichContent(json);
                  setContent(richContentToText(json));
                }}
              />
            </div>
          </div>

          <p aria-live="polite" className="sr-only">
            {saving
              ? "Saving..."
              : saveError
                ? `Save failed: ${saveError}`
                : ""}
          </p>
          {saveError && (
            <p
              role="alert"
              className="mt-3 text-sm text-red-700 dark:text-brand"
            >
              Save failed: {saveError}
            </p>
          )}

          <Provenance note={note} words={words} minutes={minutes} />
        </div>
      </div>

      <SummaryPanel
        noteId={id}
        empty={!note.content.trim()}
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
      />
    </div>
  );
}
