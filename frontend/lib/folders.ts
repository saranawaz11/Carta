import { useAuth } from "@clerk/nextjs";
import useSWRInfinite from "swr/infinite";

import { apiFetch } from "@/lib/api";
import type { Note } from "@/lib/notes";

export type Folder = {
  id: string;
  name: string;
  note_count: number;
  created_at: string;
  updated_at: string;
};

export const foldersKey = "/api/folders";
export const noteDragMime = "application/x-carta-note";

type GetToken = () => Promise<string | null>;

export function listFolders(getToken: GetToken): Promise<Folder[]> {
  return apiFetch<Folder[]>(foldersKey, getToken);
}

export function createFolder(name: string, getToken: GetToken): Promise<Folder> {
  return apiFetch<Folder>(foldersKey, getToken, {
    method: "POST",
    body: { name },
  });
}

export function renameFolder(
  folderId: string,
  name: string,
  getToken: GetToken,
): Promise<Folder> {
  return apiFetch<Folder>(`${foldersKey}/${folderId}`, getToken, {
    method: "PATCH",
    body: { name },
  });
}

export function deleteFolder(folderId: string, getToken: GetToken): Promise<void> {
  return apiFetch<void>(`${foldersKey}/${folderId}`, getToken, {
    method: "DELETE",
  });
}

export function listFolderNotes(
  folderId: string,
  limit: number,
  offset: number,
  getToken: GetToken,
): Promise<Note[]> {
  return apiFetch<Note[]>(
    `${foldersKey}/${folderId}/notes?limit=${limit}&offset=${offset}`,
    getToken,
  );
}

export const folderNotesPageSize = 50;

export function useFolderNotes(folderId: string | null) {
  const { getToken } = useAuth();
  const { data, error, isLoading, isValidating, size, setSize } = useSWRInfinite<Note[]>(
    (pageIndex, previousPage) => {
      if (!folderId) return null;
      if (previousPage && previousPage.length < folderNotesPageSize) return null;
      return `${foldersKey}/${folderId}/notes?limit=${folderNotesPageSize}&offset=${pageIndex * folderNotesPageSize}`;
    },
    (path: string) => apiFetch<Note[]>(path, getToken),
  );

  const pages = data ?? [];
  const lastPage = pages[pages.length - 1];
  return {
    notes: data ? pages.flat() : undefined,
    error,
    isLoading,
    hasMore: !!lastPage && lastPage.length === folderNotesPageSize,
    isLoadingMore: isValidating && size > pages.length,
    loadMore: () => setSize(size + 1),
  };
}

export function moveNote(
  noteId: string,
  folderId: string | null,
  getToken: GetToken,
): Promise<Note> {
  return apiFetch<Note>(`/api/notes/${noteId}/folder`, getToken, {
    method: "PUT",
    body: { folder_id: folderId },
  });
}
