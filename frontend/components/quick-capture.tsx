"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useState } from "react";
import { useSWRConfig } from "swr";

import { ActionCard, type PendingAction } from "@/components/action-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";
import { invalidateNotes, type Note } from "@/lib/notes";
import { formatDue, invalidateTasks, type Task } from "@/lib/tasks";
import { PlusIcon } from "lucide-react";

type CaptureResponse = {
  outcome: "task_created" | "note_created" | "pending_action" | "message";
  task: Task | null;
  note: Note | null;
  pending_action: PendingAction | null;
  message: string | null;
};

export function QuickCapture() {
  const { getToken } = useAuth();
  const { mutate } = useSWRConfig();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CaptureResponse | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    await Promise.all([invalidateNotes(mutate), invalidateTasks(mutate)]);
  }

  async function submit() {
    const statement = text.trim();
    if (!statement || loading) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    setResult(null);
    try {
      const response = await apiFetch<CaptureResponse>("/api/capture", getToken, {
        method: "POST",
        body: {
          text: statement,
          now: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      setResult(response);
      setText("");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Capture failed");
    } finally {
      setLoading(false);
    }
  }

  async function confirm(action: PendingAction) {
    setLoading(true);
    setError(null);
    try {
      const done = await apiFetch<{ message: string }>("/api/chat/confirm", getToken, {
        method: "POST",
        body: {
          action: action.action,
          note_id: action.note_id,
          expected_updated_at: action.expected_updated_at,
          changes: action.changes,
        },
      });
      setResult(null);
      setInfo(done.message);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to confirm action");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setResult(null);
          setInfo(null);
          setError(null);
        }
      }}
    >
      <DialogTrigger render={<Button type="button" variant="outline" className='w-full bg-red-900 py-5 rounded-full text-white hover:bg-red-800' />}>
      <PlusIcon size={18} className="" />
        Quick Capture
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick Capture</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <input
            value={text}
            maxLength={500}
            onChange={(event) => setText(event.target.value)}
            placeholder="Remind me to call the bank on Friday"
            aria-label="Statement"
          />
          <Button type="submit" disabled={loading}>
            {loading ? "Working..." : "Submit"}
          </Button>
        </form>
        {error && <p role="alert">{error}</p>}
        {info && <p>{info}</p>}
        {result?.outcome === "task_created" && result.task && (
          <p>
            Task created: {result.task.title}
            {result.task.due_at ? ` (due ${formatDue(result.task)})` : ""}
          </p>
        )}
        {result?.outcome === "note_created" && result.note && (
          <p>
            Note created:{" "}
            <Link href={`/notes/${result.note.id}`} onClick={() => setOpen(false)}>
              {result.note.title || "Untitled"}
            </Link>
          </p>
        )}
        {result?.outcome === "pending_action" && result.pending_action && (
          <ActionCard
            action={result.pending_action}
            disabled={loading}
            onConfirm={() => void confirm(result.pending_action!)}
            onCancel={() => setResult(null)}
          />
        )}
        {result?.outcome === "message" && <p>{result.message}</p>}
      </DialogContent>
    </Dialog>
  );
}
