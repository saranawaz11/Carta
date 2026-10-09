"use client";

import Link from "next/link";
import { Fraunces } from "next/font/google";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { FileText, Loader2, PenLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Note, NoteStatus, useNoteActions, useNotes } from "@/lib/notes";

const display = Fraunces({ subsets: ["latin"], display: "swap" });

const META: Record<NoteStatus, { title: string; description: string }> = {
  active: {
    title: "Notes",
    description:
      "Your evolving archive of thoughts, ideas and drafts, all gathered in one place.",
  },
  archived: {
    title: "Archive",
    description:
      "Notes you've set aside, kept safe and out of the way until you need them again.",
  },
  deleted: {
    title: "Trash",
    description:
      "Deleted notes wait here. Restore the ones you miss, or remove the rest for good.",
  },
};

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
    <div className="flex flex-col gap-2 border-t border-red-50 px-5 py-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => void run(restoreNote)}
        >
          Restore
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() => void run(purgeNote)}
        >
          Delete permanently
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-36 animate-pulse rounded-2xl bg-red-100/60" />
      ))}
    </div>
  );
}

export function NoteList({ status }: { status: NoteStatus }) {
  const router = useRouter();
  const query = useSearchParams().get("q") ?? "";
  const { data: notes, error, isLoading } = useNotes(status, query);
  const { createNote } = useNoteActions();

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const { title, description } = META[status];
  const count = notes?.length;
  const countLabel =
    count === undefined
      ? ""
      : query
        ? `${count} ${count === 1 ? "result" : "results"} for “${query}”`
        : `${count} ${count === 1 ? "note" : "notes"}`;

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
      <header className="mb-8 flex flex-col gap-5 motion-safe:animate-fade-up sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            <span className="size-1.5 rounded-full bg-red-500" />
            <span>Carta</span>
            {count !== undefined && (
              <>
                <span aria-hidden="true">•</span>
                <span className="tabular-nums">{countLabel}</span>
              </>
            )}
          </p>
          <h1
            className={`${display.className} text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl`}
          >
            {title}
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-gray-600 sm:text-base">
            {description}
          </p>
        </div>

        {status === "active" && (
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <Button
              type="button"
              onClick={handleInscribe}
              disabled={creating}
              className="h-11 gap-2 rounded-full bg-red-700 px-6 text-white shadow-sm
                transition-[transform,box-shadow,background-color] duration-200 ease-out
                hover:-translate-y-0.5 hover:bg-red-800 hover:shadow-lg hover:shadow-red-200
                active:translate-y-0 active:scale-[0.98] disabled:opacity-80"
            >
              {creating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <PenLine size={16} />
              )}
              {creating ? "Inscribing..." : "Inscribe Note"}
            </Button>
            {createError && (
              <p role="alert" className="text-xs text-red-600">
                {createError}
              </p>
            )}
          </div>
        )}
      </header>

      {isLoading && <SkeletonGrid />}

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error.message}
        </p>
      )}

      {!isLoading && !error && notes?.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-red-200 py-16 text-center motion-safe:animate-fade-up">
          <FileText className="text-red-300" size={32} />
          <p className="text-sm text-gray-500">
            {query ? "No notes match your search." : "No notes here yet."}
          </p>
        </div>
      )}

      {notes && notes.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {notes.map((note, index) => (
            <li
              key={note.id}
              style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-red-100 bg-white shadow-sm
                transition-[transform,box-shadow,border-color] duration-300 ease-out motion-safe:animate-fade-up
                hover:-translate-y-0.5 hover:border-red-300 hover:shadow-lg hover:shadow-red-100/60"
            >
              <Link
                href={`/notes/${note.id}`}
                className="flex flex-1 flex-col gap-2 p-5 outline-none focus-visible:ring-2 focus-visible:ring-red-300"
              >
                <h2 className="truncate text-base font-semibold text-gray-900 transition-colors duration-200 group-hover:text-red-700">
                  {note.title.trim() || "Untitled"}
                </h2>
                {note.content ? (
                  <p className="line-clamp-4 break-words text-sm leading-relaxed text-gray-600">
                    {note.content}
                  </p>
                ) : (
                  <p className="text-sm italic text-gray-400">Empty note</p>
                )}
              </Link>
              {status === "deleted" && <NoteActions note={note} />}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}