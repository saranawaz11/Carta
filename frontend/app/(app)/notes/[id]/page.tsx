"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Note, useNote, useNoteActions } from "@/lib/notes";

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
  const loadedNoteId = useRef<string | null>(null);
  const lastAttempt = useRef<string | null>(null);

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
          setSaveError(
            cause instanceof Error ? cause.message : "Unable to save note",
          );
        });
    }, 800);
    return () => clearTimeout(timeout);
  }, [content, id, note, title, updateNote]);

  async function runAction(action: (note: Note) => Promise<unknown>) {
    if (!note) return;
    setActing(true);
    setActionError(null);
    try {
      await action(note);
      router.push("/archive");
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Unable to update note",
      );
    } finally {
      setActing(false);
    }
  }

  if (isLoading) return <p>Loading note...</p>;
  if (error) return <p role="alert">{error.message}</p>;
  if (!note) return <p>Note not found.</p>;

  if (note.deleted_at) {
    return <p>This note has been deleted.</p>;
  }

  return (
    <section className="flex max-w-2xl flex-col gap-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={acting}
          onClick={() => void runAction(archiveNote)}
        >
          Archive
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={acting}
          onClick={() => void runAction(deleteNote)}
        >
          Delete
        </Button>
      </div>
      <Input
        aria-label="Note title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Untitled"
      />
      <textarea
        aria-label="Note content"
        className="min-h-64 w-full resize-y border p-2"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="Write your note..."
      />
      <p aria-live="polite">
        {saving ? "Saving..." : saveError ? `Save failed: ${saveError}` : ""}
      </p>
      {actionError && <p role="alert">{actionError}</p>}
    </section>
  );
}
