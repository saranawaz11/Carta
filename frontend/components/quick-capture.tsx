"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
  useCallback,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useSWRConfig } from "swr";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  FileText,
  Info,
  Loader2,
  Mic,
  PenLine,
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
import { VoiceNote } from "@/components/voice-note";
import { apiFetch } from "@/lib/api";
import { invalidateNotes, type Note } from "@/lib/notes";
import { formatDue, invalidateTasks, type Task } from "@/lib/tasks";
import type { VoiceState } from "@/lib/voice";

// STATIC for now. Replace with real tag state and send it in the capture request body.
const STATIC_TAGS = ["Reminder", "Idea", "Work"];

const MAX = 500;

const MODES = [
  { id: "text", label: "Text", icon: PenLine },
  { id: "voice", label: "Voice", icon: Mic },
] as const;
type Mode = (typeof MODES)[number]["id"];

type CaptureResponse = {
  outcome: "task_created" | "note_created" | "pending_action" | "message";
  task: Task | null;
  note: Note | null;
  pending_action: PendingAction | null;
  message: string | null;
};

const panel = "rounded-2xl border border-line bg-panel p-4";
const panelLabel = "font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500";

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
    <div className="flex items-start gap-3 rounded-2xl border border-line-strong bg-tint p-3.5 motion-safe:animate-fade-up">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-panel text-brand">
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold text-ink">{title}</p>
        <div className="mt-0.5 break-words text-gray-600">{children}</div>
      </div>
    </div>
  );
}

export function QuickCapture() {
  const { getToken } = useAuth();
  const { mutate } = useSWRConfig();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CaptureResponse | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceMaxCharacters, setVoiceMaxCharacters] = useState(MAX);
  const voiceBaseRef = useRef("");
  const voiceActive = voiceState === "connecting" || voiceState === "listening";

  const handleVoiceTranscript = useCallback((transcript: string) => {
    setText(`${voiceBaseRef.current}${transcript}`.slice(0, MAX));
  }, []);

  const handleVoiceState = useCallback((next: VoiceState) => {
    setVoiceState(next);
  }, []);

  const handleVoiceStart = useCallback(() => {
    voiceBaseRef.current = text.trim()
      ? `${text.trimEnd()}\n`
      : "";
    setVoiceMaxCharacters(MAX - voiceBaseRef.current.length);
    setError(null);
  }, [text]);

  const handleVoiceLimit = useCallback(() => {
    setError(`Dictation stopped at the ${MAX}-character limit.`);
  }, []);

  async function refresh() {
    await Promise.all([invalidateNotes(mutate), invalidateTasks(mutate)]);
  }

  async function submit() {
    const statement = text.trim();
    if (!statement || loading || voiceActive) return;
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
      setMode("text");
      setResult(null);
      setInfo(null);
      setError(null);
    }
  }

  function selectMode(next: Mode) {
    if (voiceActive && next !== "voice") return;
    if (next === "voice" && mode !== "voice") {
      voiceBaseRef.current = text.trim()
        ? `${text.trimEnd()}\n`
        : "";
      setVoiceMaxCharacters(MAX - voiceBaseRef.current.length);
    }
    setMode(next);
  }

  function onTabKeys(event: KeyboardEvent) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const next: Mode = mode === "text" ? "voice" : "text";
    selectMode(next);
    document.getElementById(`capture-tab-${next}`)?.focus();
  }

  const lines = text ? text.split("\n").length : 1;
  const voice = mode === "voice";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            className="w-full gap-2 rounded-full bg-button py-5 text-white transition-[background-color,transform] duration-200 hover:bg-button-hover hover:text-white active:scale-[0.98]"
          />
        }
      >
        <Plus size={18} />
        Quick Capture
      </DialogTrigger>

      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-3xl border border-line bg-surface p-0 text-ink sm:max-w-2xl">
        <DialogHeader className="shrink-0 flex-row items-center gap-3 border-b border-line px-5 py-4 pr-14">
          <span className="flex size-8 items-center justify-center rounded-full bg-button text-white">
            <Sparkles size={16} />
          </span>
          <DialogTitle className="text-base font-semibold text-ink">Capture a thought</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {/* Mode */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div
                role="tablist"
                aria-label="Capture type"
                onKeyDown={onTabKeys}
                className="inline-flex rounded-full border border-line bg-panel p-1"
              >
                {MODES.map(({ id, label, icon: Icon }) => {
                  const on = mode === id;
                  return (
                    <button
                      key={id}
                      id={`capture-tab-${id}`}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      aria-controls={`capture-panel-${id}`}
                      tabIndex={on ? 0 : -1}
                      onClick={() => selectMode(id)}
                      className={`inline-flex h-8 items-center gap-1.5 rounded-full px-4 text-sm outline-none transition-[background-color,color,box-shadow] duration-200
                        focus-visible:ring-4 focus-visible:ring-brand/20 ${
                          on ? "bg-tint font-medium text-brand shadow-sm" : "text-gray-600 hover:text-ink"
                        }`}
                    >
                      <Icon size={14} />
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500">
                {voice
                  ? "Dictate, review the text, then capture as usual."
                  : `${MAX} character limit · Shift+Enter creates a new line`}
              </p>
            </div>

            {/* Text capture */}
            {!voice && (
              <div id="capture-panel-text" role="tabpanel" aria-labelledby="capture-tab-text" className="space-y-4 motion-safe:animate-fade-up">
                <section className={panel}>
                  <div className="flex items-center justify-between gap-3">
                    <span className={panelLabel}>Text capture</span>
                    <span className="text-[11px] tabular-nums text-gray-500">
                      {lines} {lines === 1 ? "line" : "lines"} · {text.length}/{MAX}
                    </span>
                  </div>

                  <div className="mt-3 rounded-xl border border-line bg-page transition-[border-color,box-shadow] duration-200 focus-within:border-brand/50 focus-within:ring-4 focus-within:ring-brand/15">
                    <textarea
                      autoFocus
                      value={text}
                      maxLength={MAX}
                      onChange={(event) => setText(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                          event.preventDefault();
                          void submit();
                        }
                      }}
                      placeholder="Remind me to call the bank on Friday"
                      aria-label="Statement"
                      className="block min-h-28 w-full resize-none rounded-xl bg-transparent px-4 py-3.5 text-[15px] leading-relaxed text-ink outline-none placeholder:text-gray-400"
                    />
                  </div>

                  {/* Tags (static for now) */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {STATIC_TAGS.map((tag) => (
                      <TagChip key={tag} label={tag} />
                    ))}
                    <span className="rounded-md border border-dashed border-line-strong px-2 py-0.5 text-[11px] text-gray-400">
                      + Add tag
                    </span>
                  </div>
                </section>

                <section className={panel}>
                  <span className={panelLabel}>What happens next</span>
                  <div className="mt-3 flex items-start gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-tint text-brand">
                      <Sparkles size={15} />
                    </span>
                    <p className="text-sm leading-relaxed text-gray-600">
                      Carta decides whether this is a note or a task and shows you the result here.
                      Changes to existing notes wait for your confirmation.
                    </p>
                  </div>
                </section>
              </div>
            )}

            {/* Voice capture (static preview) */}
            {voice && (
              <div id="capture-panel-voice" role="tabpanel" aria-labelledby="capture-tab-voice">
                <section className={`${panel} mb-4`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className={panelLabel}>Capture text</span>
                    <span className="text-[11px] tabular-nums text-gray-500">
                      {text.length}/{MAX}
                    </span>
                  </div>
                  <div className="mt-3 rounded-xl border border-line bg-page transition-[border-color,box-shadow] duration-200 focus-within:border-brand/50 focus-within:ring-4 focus-within:ring-brand/15">
                    <textarea
                      value={text}
                      maxLength={MAX}
                      readOnly={voiceActive}
                      onChange={(event) => setText(event.target.value)}
                      placeholder="Remind me to call the bank on Friday"
                      aria-label="Statement"
                      className="block min-h-28 w-full resize-none rounded-xl bg-transparent px-4 py-3.5 text-[15px] leading-relaxed text-ink outline-none placeholder:text-gray-400"
                    />
                  </div>
                </section>
                <VoiceNote
                  title="Dictate your capture"
                  onTranscriptChange={handleVoiceTranscript}
                  onStateChange={handleVoiceState}
                  onStart={handleVoiceStart}
                  onLimit={handleVoiceLimit}
                  maxCharacters={Math.max(0, voiceMaxCharacters)}
                />
              </div>
            )}

            {/* Results */}
            {(error || info || result) && (
              <div className="flex flex-col gap-3" aria-live="polite">
                {error && (
                  <p
                    role="alert"
                    className="rounded-xl border border-line-strong bg-tint px-4 py-2.5 text-sm text-brand motion-safe:animate-fade-up"
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
                      className="mt-1 inline-flex items-center gap-1 font-medium text-brand transition-opacity hover:opacity-75"
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
                      className="inline-flex items-center gap-1 font-medium text-brand transition-opacity hover:opacity-75"
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
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line bg-panel px-5 py-3">
            <p className="hidden text-xs text-gray-500 sm:block">
              {voice ? "Nothing is saved until you choose Capture." : "Nothing is saved until you choose Capture."}
            </p>
            <div className="ml-auto flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setText("");
                  handleOpenChange(false);
                }}
                className="rounded-full text-gray-600 transition-colors duration-200 hover:bg-tint hover:text-brand"
              >
                Discard draft
              </Button>
              <Button
                type="submit"
                disabled={loading || voiceActive || !text.trim()}
                className="gap-2 rounded-full bg-button px-5 text-white transition-[transform,background-color] duration-200 hover:bg-button-hover active:scale-[0.98]"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {loading ? "Capturing..." : "Capture"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}