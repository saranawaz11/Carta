"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import useSWR, { useSWRConfig } from "swr";

import { type Folder, foldersKey, listFolders, moveNote } from "@/lib/folders";
import type { Note } from "@/lib/notes";

const NO_FOLDER = "";

export function FolderMove({ note }: { note: Note }) {
  const { getToken } = useAuth();
  const { mutate } = useSWRConfig();
  const { data: folders, isLoading } = useSWR<Folder[]>(foldersKey, () =>
    listFolders(getToken),
  );

  // Holds the chosen folder while the request is in flight, so the select shows it immediately
  const [pending, setPending] = useState<{ value: string | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = pending ? pending.value : note.folder_id;
  const trashed = note.deleted_at !== null;

  async function handleChange(value: string) {
    const next = value === NO_FOLDER ? null : value;
    setPending({ value: next });
    setSaving(true);
    setError(null);
    try {
      await moveNote(note.id, next, getToken);
      // Refresh the note and folder lists, including counts in the nav
      await mutate(
        (key) => typeof key === "string" && (key.startsWith("/api/notes") || key.startsWith(foldersKey)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not move the note.");
    } finally {
      setPending(null);
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
      <label htmlFor="note-folder" className="font-medium">
        Folder
      </label>
      <select
        id="note-folder"
        value={current ?? NO_FOLDER}
        disabled={trashed || saving || isLoading}
        onChange={(e) => void handleChange(e.target.value)}
        className="h-8 rounded-full border border-line bg-panel px-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50"
      >
        <option value={NO_FOLDER}>No folder</option>
        {folders?.map((folder) => (
          <option key={folder.id} value={folder.id}>
            {folder.name}
          </option>
        ))}
      </select>
      {error && (
        <span role="alert" className="text-red-600">
          {error}
        </span>
      )}
    </div>
  );
}
