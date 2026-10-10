"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useSWRConfig } from "swr";
import {
  ArrowUpRight,
  CheckCircle2,
  FileText,
  Info,
  Loader2,
  Plus,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { ActionCard, type PendingAction } from "@/components/action-card";
import { TagChip } from "@/components/tag-chip";
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

// STATIC for now. Replace with real tag state and send it in the capture request body.
const STATIC_TAGS = ["Reminder", "Idea", "Work"];

type CaptureResponse = {
  outcome: "task_created" | "note_created" | "pending_action" | "message";
  task: Task | null;
  note: Note | null;
  pending_action: PendingAction | null;
  message: string | null;
};

function Notice({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-3.5 motion-safe:animate-fade-up">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-red-600">
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold text-gray-900">{title}</p>
        <div className="mt-0.5 break-words text-gray-600">{children}</div>
      </div>
    </div>
  );
}

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

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setResult(null);
      setInfo(null);
      setError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 rounded-full bg-red-900 py-5 text-white transition-[background-color,transform] duration-200 hover:bg-red-800 hover:text-white active:scale-[0.98]"
          />
        }
      >
        <Plus size={18} />
        Quick Capture
      </DialogTrigger>

      <DialogContent className="gap-0 overflow-hidden rounded-3xl border border-red-100 bg-[#fff8f7] p-0 sm:max-w-xl">
        <DialogHeader className="flex-row items-center gap-3 border-b border-red-100 px-5 py-4 pr-14">
          <span className="flex size-8 items-center justify-center rounded-full bg-red-700 text-white">
            <Sparkles size={16} />
          </span>
          <DialogTitle className="text-base font-semibold text-gray-900">
            Quick Capture
          </DialogTitle>
          <span className="ml-auto hidden rounded-md bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700 sm:inline">
            Esc to close
          </span>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="flex flex-col gap-4 pt-5"
        >
          <div className="px-5">
            <div className="rounded-2xl border border-red-100 bg-white transition-[border-color,box-shadow] duration-200 focus-within:border-red-300 focus-within:ring-4 focus-within:ring-red-100">
              <textarea
                autoFocus
                value={text}
                maxLength={500}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    void submit();
                  }
                }}
                placeholder="Remind me to call the bank on Friday"
                aria-label="Statement"
                className="block min-h-28 w-full resize-none rounded-2xl bg-transparent px-4 py-3.5 text-[15px] leading-relaxed outline-none placeholder:text-gray-400"
              />
              <div className="flex justify-end px-4 pb-2 text-[11px] tabular-nums text-gray-400">
                {text.length}/500
              </div>
            </div>
          </div>

          {/* Tags (static for now) */}
          <div className="flex flex-wrap items-center gap-2 px-5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
              Tags
            </span>
            {STATIC_TAGS.map((tag) => (
              <TagChip key={tag} label={tag} />
            ))}
            <span className="rounded-md border border-dashed border-red-200 px-2 py-0.5 text-[11px] text-gray-400">
              + Add tag
            </span>
          </div>

          {/* Results */}
          {(error || info || result) && (
            <div className="flex flex-col gap-3 px-5" aria-live="polite">
              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 motion-safe:animate-fade-up"
                >
                  {error}
                </p>
              )}
              {info && (
                <Notice icon={CheckCircle2} title="Done">
                  {info}
                </Notice>
              )}
              {result?.outcome === "task_created" && result.task && (
                <Notice icon={CheckCircle2} title="Task created">
                  <p>
                    {result.task.title}
                    {result.task.due_at ? ` (due ${formatDue(result.task)})` : ""}
                  </p>
                  <Link
                    href="/tasks"
                    onClick={() => setOpen(false)}
                    className="mt-1 inline-flex items-center gap-1 font-medium text-red-700 transition-colors hover:text-red-800"
                  >
                    View tasks <ArrowUpRight size={13} />
                  </Link>
                </Notice>
              )}
              {result?.outcome === "note_created" && result.note && (
                <Notice icon={FileText} title="Note created">
                  <Link
                    href={`/notes/${result.note.id}`}
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center gap-1 font-medium text-red-700 transition-colors hover:text-red-800"
                  >
                    {result.note.title || "Untitled"} <ArrowUpRight size={13} />
                  </Link>
                </Notice>
              )}
              {result?.outcome === "pending_action" && result.pending_action && (
                <ActionCard
                  action={result.pending_action}
                  disabled={loading}
                  confirming={loading}
                  onConfirm={() => void confirm(result.pending_action!)}
                  onCancel={() => setResult(null)}
                />
              )}
              {result?.outcome === "message" && result.message && (
                <Notice icon={Info} title="Carta AI">
                  {result.message}
                </Notice>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-red-100 bg-red-50/60 px-5 py-3">
            <p className="hidden text-xs text-gray-500 sm:block">
              Press Enter to capture · Shift+Enter for a new line
            </p>
            <div className="ml-auto flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setText("");
                  handleOpenChange(false);
                }}
                className="rounded-full text-gray-600 transition-colors duration-200 hover:bg-red-100 hover:text-red-700"
              >
                Discard
              </Button>
              <Button
                type="submit"
                disabled={loading || !text.trim()}
                className="gap-2 rounded-full bg-red-700 px-5 text-white transition-[transform,background-color] duration-200 hover:bg-red-800 active:scale-[0.98]"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? "Capturing..." : "Capture"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}