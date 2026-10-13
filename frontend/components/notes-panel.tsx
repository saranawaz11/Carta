"use client";

import Link from "next/link";
import { Fraunces } from "next/font/google";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";

import { formatListStamp, noteDates } from "@/lib/note-dates";
import { useNoteActions, useNotes } from "@/lib/notes";

const display = Fraunces({ subsets: ["latin"], display: "swap" });

export function NotesPanel({
  activeId,
  draft,
  open,
  onClose,
}: {
  activeId: string;
  draft?: { title: string; content: string };
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const query = useSearchParams().get("q") ?? "";
  const { data: notes, error, isLoading } = useNotes("active", query);
  const { createNote } = useNoteActions();
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Keep the open note in view inside the scrolling list
  useEffect(() => {
    document
      .getElementById(`note-item-${activeId}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeId, notes]);

  // Reset the create button once we've arrived at the new note
  useEffect(() => setCreating(false), [activeId]);

  async function handleCreate() {
    if (creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const note = await createNote();
      router.push(`/notes/${note.id}`);
    } catch (cause) {
      setCreateError(cause instanceof Error ? cause.message : "Unable to create note");
      setCreating(false);
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        aria-label="Your notes"
        className={`fixed inset-y-0 left-0 z-50 flex w-[320px] max-w-[88vw] flex-col border-r border-red-100 bg-panel shadow-2xl
          transition-[transform,visibility] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${open ? "visible translate-x-0" : "invisible -translate-x-full lg:visible"}
          lg:static lg:z-auto lg:w-[300px] lg:shrink-0 lg:translate-x-0 lg:shadow-none`}
      >
        <div className="flex items-center gap-2 border-b border-red-100 px-4 py-4">
          <div className="min-w-0 flex-1">
            <h2 className={`${display.className} text-xl font-semibold text-gray-900`}>
              Your notes
            </h2>
            <p className="text-[11px] text-gray-500">
              {notes
                ? query
                  ? `${notes.length} ${notes.length === 1 ? "result" : "results"} for “${query}”`
                  : `${notes.length} ${notes.length === 1 ? "note" : "notes"}`
                : "\u00A0"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating}
            aria-label="New note"
            title="New note"
            className="flex size-9 items-center justify-center rounded-full bg-red-700 text-white transition-[transform,background-color] duration-200 hover:bg-red-800 active:scale-95 disabled:opacity-60"
          >
            {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notes"
            className="rounded-lg p-1.5 text-gray-500 transition-colors duration-200 hover:bg-red-100 hover:text-red-700 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {createError && (
          <p role="alert" className="px-4 pt-3 text-xs text-red-600">
            {createError}
          </p>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {isLoading && (
            <div className="flex flex-col gap-2" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-red-100/60" />
              ))}
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {error.message}
            </p>
          )}

          {notes && notes.length === 0 && (
            <p className="px-2 py-10 text-center text-sm text-gray-500">
              {query ? "No notes match your search." : "No notes yet."}
            </p>
          )}

          {notes && notes.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {notes.map((note, index) => {
                const active = note.id === activeId;
                const title = ((active && draft ? draft.title : note.title) || "").trim() || "Untitled";
                const content = active && draft ? draft.content : note.content;
                return (
                  <li
                    key={note.id}
                    style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
                    className="motion-safe:animate-fade-up"
                  >
                    <Link
                      id={`note-item-${note.id}`}
                      href={`/notes/${note.id}`}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-2xl border p-3.5 transition-[background-color,border-color,transform,box-shadow] duration-200 ${
                        active
                          ? "border-red-200 bg-red-50 shadow-sm"
                          : "border-transparent hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50/60"
                      }`}
                    >
                      <p className={`${display.className} truncate text-[15px] font-semibold text-gray-900`}>
                        {title}
                      </p>
                      <p className="mt-1 line-clamp-2 break-words text-xs leading-relaxed text-gray-600">
                        {content || "Empty note"}
                      </p>
                      <p className="mt-2 text-[11px] text-gray-400">
                        {formatListStamp(noteDates(note).updated)}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}