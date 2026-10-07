"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";
import useSWR, { useSWRConfig } from "swr";

import { apiFetch } from "@/lib/api";

export type NoteStatus = "active" | "archived" | "deleted";

export type Note = {
  id: string;
  title: string;
  content: string;
  archived_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NoteChanges = { title?: string; content?: string };

const notesPath = "/api/notes";
const noteKey = (id: string) => `${notesPath}/${id}`;
const listKey = (status: NoteStatus, query: string) =>
  `${notesPath}?status=${status}&q=${encodeURIComponent(query)}`;

export async function invalidateNotes(
  mutate: ReturnType<typeof useSWRConfig>["mutate"],
): Promise<void> {
  await mutate((key) => typeof key === "string" && key.startsWith(notesPath));
}

function listKeys(cache: ReturnType<typeof useSWRConfig>["cache"]): string[] {
  return Array.from(cache.keys()).filter(
    (key): key is string =>
      typeof key === "string" && key.startsWith(`${notesPath}?status=`),
  );
}

function includesNote(note: Note, key: string): boolean {
  const params = new URL(key, "http://localhost").searchParams;
  const status = params.get("status");
  const query = (params.get("q") ?? "").trim().toLocaleLowerCase();
  const stateMatches =
    status === "deleted"
      ? note.deleted_at !== null
      : note.deleted_at === null &&
        (status === "archived"
          ? note.archived_at !== null
          : note.archived_at === null);
  const queryMatches =
    query.length === 0 ||
    note.title.toLocaleLowerCase().includes(query) ||
    note.content.toLocaleLowerCase().includes(query);
  return stateMatches && queryMatches;
}

function changeList(
  current: Note[] | undefined,
  key: string,
  note: Note | null,
  noteId: string = note?.id ?? "",
): Note[] | undefined {
  if (!current) return current;
  const updated = current.filter((item) => item.id !== noteId);
  if (note && includesNote(note, key)) updated.unshift(note);
  return updated;
}

export function useNotes(status: NoteStatus, query: string) {
  const { getToken } = useAuth();
  const key = listKey(status, query);
  return useSWR<Note[]>(key, () => apiFetch<Note[]>(key, getToken));
}

export function useNote(id: string) {
  const { getToken } = useAuth();
  const key = id ? noteKey(id) : null;
  return useSWR<Note>(key, (path: string) => apiFetch<Note>(path, getToken));
}

export function useNoteActions() {
  const { getToken } = useAuth();
  const { cache, mutate } = useSWRConfig();

  const createNote = useCallback(async (): Promise<Note> => {
    const note = await apiFetch<Note>(notesPath, getToken, { method: "POST" });
    const keys = listKeys(cache);
    await Promise.all(
      keys.map((key) =>
        mutate<Note[]>(
          key,
          (current) => changeList(current, key, note, note.id),
          { revalidate: false },
        ),
      ),
    );
    await Promise.all(keys.map((key) => mutate(key)));
    return note;
  }, [cache, getToken, mutate]);

  const runNoteAction = useCallback(async (
    id: string,
    optimistic: Note | null,
    request: () => Promise<Note | void>,
  ): Promise<Note | void> => {
    const keys = listKeys(cache);
    const previousLists = new Map<string, Note[] | undefined>();
    for (const key of keys) {
      const previous = await mutate<Note[]>(
        key,
        (current) => {
          previousLists.set(key, current);
          return changeList(current, key, optimistic, id);
        },
        { revalidate: false },
      );
      if (!previousLists.has(key)) previousLists.set(key, previous);
    }

    const key = noteKey(id);
    let previousNote: Note | undefined;
    const cachedNote = await mutate<Note>(
      key,
      (current) => {
        previousNote = current;
        return optimistic ?? undefined;
      },
      { revalidate: false },
    );
    if (previousNote === undefined) previousNote = cachedNote;

    let saved: Note | void;
    try {
      saved = await request();
    } catch (error) {
      await Promise.all(
        [...previousLists].map(([list, previous]) =>
          mutate<Note[]>(list, previous, { revalidate: false }),
        ),
      );
      await mutate<Note>(key, previousNote, { revalidate: false });
      throw error;
    }

    const finalNote = saved ?? null;
    await Promise.all(
      keys.map((list) =>
        mutate<Note[]>(
          list,
          (current) => changeList(current, list, finalNote, id),
          { revalidate: false },
        ),
      ),
    );
    await mutate<Note>(key, finalNote ?? undefined, { revalidate: false });
    await Promise.all([...keys, key].map((cacheKey) => mutate(cacheKey)));
    return saved;
  }, [cache, mutate]);

  const updateNote = useCallback((id: string, note: Note, changes: NoteChanges) => {
    return runNoteAction(
      id,
      { ...note, ...changes, updated_at: new Date().toISOString() },
      () =>
        apiFetch<Note>(noteKey(id), getToken, {
          method: "PATCH",
          body: changes,
        }),
    );
  }, [getToken, runNoteAction]);

  const archiveNote = useCallback((note: Note) => {
    return runNoteAction(
      note.id,
      { ...note, archived_at: new Date().toISOString() },
      () =>
        apiFetch<Note>(`${noteKey(note.id)}/archive`, getToken, {
          method: "POST",
        }),
    );
  }, [getToken, runNoteAction]);

  const deleteNote = useCallback((note: Note) => {
    return runNoteAction(
      note.id,
      { ...note, deleted_at: new Date().toISOString() },
      () =>
        apiFetch<Note>(`${noteKey(note.id)}/delete`, getToken, {
          method: "POST",
        }),
    );
  }, [getToken, runNoteAction]);

  const restoreNote = useCallback((note: Note) => {
    return runNoteAction(
      note.id,
      { ...note, archived_at: null, deleted_at: null },
      () =>
        apiFetch<Note>(`${noteKey(note.id)}/restore`, getToken, {
          method: "POST",
        }),
    );
  }, [getToken, runNoteAction]);

  const purgeNote = useCallback((note: Note) => {
    return runNoteAction(
      note.id,
      null,
      () =>
        apiFetch<void>(noteKey(note.id), getToken, { method: "DELETE" }),
    );
  }, [getToken, runNoteAction]);

  return {
    createNote,
    updateNote,
    archiveNote,
    deleteNote,
    restoreNote,
    purgeNote,
  };
}
