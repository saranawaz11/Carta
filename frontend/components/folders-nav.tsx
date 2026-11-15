"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  ChevronDown,
  ChevronRight,
  Folder as FolderIcon,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useState, type DragEvent } from "react";
import useSWR, { useSWRConfig } from "swr";

import { DeleteConfirmModal } from "@/components/delete-confirm-modal";
import { FolderDialog } from "@/components/folder-dialog";
import {
  type Folder,
  createFolder,
  deleteFolder,
  foldersKey,
  listFolders,
  moveNote,
  noteDragMime,
  renameFolder,
} from "@/lib/folders";

type DialogState =
  | { kind: "create" }
  | { kind: "rename"; folder: Folder }
  | null;

export function FoldersNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { getToken } = useAuth();
  const { mutate } = useSWRConfig();
  const {
    data: folders,
    error,
    isLoading,
  } = useSWR<Folder[]>(foldersKey, () => listFolders(getToken));

  const [expanded, setExpanded] = useState(true);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [dialogSession, setDialogSession] = useState(0);
  const openDialog = (next: DialogState) => {
    setDialogSession((n) => n + 1);
    setDialog(next);
  };
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  // Refreshes the folder list and any open folder's note list
  const refreshFolders = () =>
    mutate((key) => typeof key === "string" && key.startsWith(foldersKey));

  async function handleDrop(folder: Folder, e: DragEvent<HTMLLIElement>) {
    e.preventDefault();
    setDropTargetId(null);
    const noteId = e.dataTransfer.getData(noteDragMime);
    if (!noteId) return;
    try {
      setMoveError(null);
      await moveNote(noteId, folder.id, getToken);
      await refreshFolders();
      await mutate(
        (key) => typeof key === "string" && key.startsWith("/api/notes"),
      );
    } catch (err) {
      setMoveError(
        err instanceof Error ? err.message : "Could not move the note.",
      );
    }
  }

  async function handleCreate(name: string) {
    await createFolder(name, getToken);
    await refreshFolders();
  }

  async function handleRename(folder: Folder, name: string) {
    await renameFolder(folder.id, name, getToken);
    await refreshFolders();
  }

  async function handleDelete() {
    if (!folderToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteFolder(folderToDelete.id, getToken);
      const wasViewing = pathname === `/folders/${folderToDelete.id}`;
      setFolderToDelete(null);
      await refreshFolders();
      // Notes are kept and move out of the deleted folder, so refresh them too
      await mutate(
        (key) => typeof key === "string" && key.startsWith("/api/notes"),
      );
      if (wasViewing) router.push("/");
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Could not delete the folder.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section aria-label="Folders" className="flex min-w-0 flex-col gap-1">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex h-10 items-center gap-2 rounded-md px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 transition-colors hover:text-ink md:h-9"
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span>Folders</span>
        </button>
        <button
          type="button"
          onClick={() => openDialog({ kind: "create" })}
          aria-label="New folder"
          title="New folder"
          className="flex size-10 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-red-200 hover:text-red-700 dark:hover:bg-white/10 dark:hover:text-brand md:size-8"
        >
          <Plus size={16} />
        </button>
      </div>

      {expanded && (
        // Capped height so many folders never push Settings/Profile off screen
        <ul className="scrollbar-hide flex max-h-56 flex-col gap-0.5 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:max-h-64">
          {isLoading && (
            <li className="px-3 py-2 text-xs text-gray-500">
              Loading folders...
            </li>
          )}
          {error && (
            <li className="px-3 py-2 text-xs text-red-600 dark:text-brand">
              Could not load folders.
            </li>
          )}
          {!isLoading && !error && folders?.length === 0 && (
            <li className="px-3 py-2 text-xs text-gray-500">No folders yet.</li>
          )}
          {folders?.map((folder) => {
            const href = `/folders/${folder.id}`;
            const active = pathname === href;
            return (
              <li
                key={folder.id}
                onDragOver={(e) => {
                  if (!e.dataTransfer.types.includes(noteDragMime)) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dropTargetId !== folder.id) setDropTargetId(folder.id);
                }}
                onDragLeave={() => {
                  if (dropTargetId === folder.id) setDropTargetId(null);
                }}
                onDrop={(e) => handleDrop(folder, e)}
                className={`group/folder relative rounded-lg transition-colors ${
                  dropTargetId === folder.id
                    ? "bg-red-200 ring-2 ring-red-400 dark:bg-white/10 dark:ring-brand"
                    : ""
                }`}
              >
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  title={folder.name}
                  className={`flex min-w-0 items-center gap-2 rounded-lg py-2.5 pl-3 pr-[76px] text-sm outline-none transition-colors
                  hover:bg-red-200/80 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-300
                  dark:hover:bg-white/[0.07] dark:hover:text-brand md:py-2 md:pr-3 ${
                    active
                      ? "bg-red-200 font-medium text-red-700 dark:bg-white/10 dark:text-brand"
                      : "text-gray-600"
                  }`}
                >
                  <FolderIcon size={16} className="shrink-0" />
                  <span className="truncate">{folder.name}</span>
                  {/* Count: desktop only, fades out when the actions appear */}
                  <span
                    className="ml-auto hidden shrink-0 text-xs tabular-nums text-gray-500 transition-opacity duration-150
                    md:block md:group-hover/folder:opacity-0 md:group-focus-within/folder:opacity-0"
                  >
                    {folder.note_count}
                  </span>
                </Link>

                {/* Actions: always visible on mobile, shown on hover/focus on desktop */}
                <div
                  className="absolute inset-y-0 right-1 flex items-center gap-0.5 transition-opacity duration-150
                  md:pointer-events-none md:opacity-0
                  md:group-hover/folder:pointer-events-auto md:group-hover/folder:opacity-100
                  md:group-focus-within/folder:pointer-events-auto md:group-focus-within/folder:opacity-100"
                >
                  <button
                    type="button"
                    onClick={() => openDialog({ kind: "rename", folder })}
                    aria-label={`Rename ${folder.name}`}
                    title="Rename"
                    className="flex size-9 items-center justify-center rounded-md text-gray-500 outline-none transition-colors hover:bg-red-100 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-300 dark:hover:bg-white/10 dark:hover:text-brand md:size-7"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(null);
                      setFolderToDelete(folder);
                    }}
                    aria-label={`Delete ${folder.name}`}
                    title="Delete"
                    className="flex size-9 items-center justify-center rounded-md text-gray-500 outline-none transition-colors hover:bg-red-100 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-300 dark:hover:bg-white/10 dark:hover:text-brand md:size-7"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {moveError && (
        <p role="alert" className="px-3 text-xs text-red-600 dark:text-brand">
          {moveError}
        </p>
      )}
      <FolderDialog
        key={dialogSession}
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        title={dialog?.kind === "rename" ? "Rename folder" : "New folder"}
        submitLabel={dialog?.kind === "rename" ? "Save" : "Create"}
        initialName={dialog?.kind === "rename" ? dialog.folder.name : ""}
        onSubmit={(name) =>
          dialog?.kind === "rename"
            ? handleRename(dialog.folder, name)
            : handleCreate(name)
        }
      />

      <DeleteConfirmModal
        isOpen={folderToDelete !== null}
        noteTitle={folderToDelete?.name}
        isDeleting={deleting}
        title="Delete Folder"
        body={
          <div className="flex flex-col gap-2">
            <p className="text-sm text-gray-600">
              Delete{" "}
              <span className="font-semibold text-ink">
                &ldquo;{folderToDelete?.name}&rdquo;
              </span>
              ?
            </p>
            {deleteError && (
              <p role="alert" className="text-xs text-red-600">
                {deleteError}
              </p>
            )}
          </div>
        }
        footnote="Notes in this folder are kept and moved out of it."
        confirmLabel="Delete folder"
        onConfirm={handleDelete}
        onDismiss={() => setFolderToDelete(null)}
      />
    </section>
  );
}
