"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { useNoteActions } from "@/lib/notes";

export function Sidebar() {
  const router = useRouter();
  const { createNote } = useNoteActions();
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();
  const userId = user?.id ?? "Unknown";

  async function handleCreateNote() {
    setError(null);
    try {
      const note = await createNote();
      router.push(`/notes/${note.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create note");
    }
  }

  return (
    <aside className="flex w-full flex-col gap-4 border-b p-4 md:min-h-screen md:w-56 md:border-b-0 md:border-r">
      <div className="flex items-center justify-between">
        <p>User id: {userId}</p>
        <Link href="/" className="font-semibold">
          Carta
        </Link>
        <UserButton />
      </div>
      <Button type="button" onClick={handleCreateNote}>
        Create Note
      </Button>
      <nav aria-label="Notes">
        <ul className="flex gap-4 md:flex-col">
          <li><Link href="/">Notes</Link></li>
          <li><Link href="/ask">Ask AI</Link></li>
          <li><Link href="/archive">Archive</Link></li>
          <li><Link href="/deleted">Deleted</Link></li>
        </ul>
      </nav>
      {error && <p role="alert">{error}</p>}
    </aside>
  );
}
