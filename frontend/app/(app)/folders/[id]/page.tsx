"use client";

import { use } from "react";
import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";

import { NoteList } from "@/components/note-list";
import { type Folder, foldersKey, listFolders } from "@/lib/folders";

export default function FolderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { getToken } = useAuth();
  const { data: folders, error, isLoading } = useSWR<Folder[]>(foldersKey, () =>
    listFolders(getToken),
  );

  if (error) {
    return <p role="alert" className="text-sm text-red-600">Could not load this folder.</p>;
  }
  if (isLoading || !folders) {
    return <p className="text-sm text-gray-500">Loading folder...</p>;
  }

  const folder = folders.find((f) => f.id === id);
  if (!folder) {
    return <p className="text-sm text-gray-500">This folder does not exist.</p>;
  }

  return <NoteList status="active" folderId={folder.id} folderName={folder.name} />;
}
