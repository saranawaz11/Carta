"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Note, NoteStatus, useNoteActions, useNotes } from "@/lib/notes";

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
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => void run(restoreNote)}
      >
        Restore
      </Button>
      <Button
        type="button"
        variant="destructive"
        disabled={pending}
        onClick={() => void run(purgeNote)}
      >
        Delete permanently
      </Button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

export function NoteList({ status }: { status: NoteStatus }) {
  const [query, setQuery] = useState("");
  const { data: notes, error, isLoading } = useNotes(status, query);

  return (
    <section>
      <h1>{status === "active" ? "Notes" : status === "archived" ? "Archive" : "Deleted"}</h1>
      <label className="my-4 block">
        <span className="sr-only">Search notes</span>
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search notes"
        />
      </label>
      {isLoading && <p>Loading notes...</p>}
      {error && <p role="alert">{error.message}</p>}
      {!isLoading && !error && notes?.length === 0 && <p>No notes found.</p>}
      {notes && (
        <ul className="flex flex-col gap-3">
          {notes.map((note) => (
            <li key={note.id} className="flex flex-col gap-2 border-b py-3">
              <Link href={`/notes/${note.id}`}>
                <span className="block font-medium">
                  {note.title.trim() || "Untitled"}
                </span>
                {note.content && <span className="block">{note.content}</span>}
              </Link>
              {status === "deleted" && <NoteActions note={note} />}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
