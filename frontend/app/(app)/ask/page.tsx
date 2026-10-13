"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { Fraunces } from "next/font/google";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { ArrowUp, ArrowUpRight, FileText, Loader2, Sparkles } from "lucide-react";

import { ActionCard, type PendingAction } from "@/components/action-card";
import { apiFetch } from "@/lib/api";
import { invalidateNotes } from "@/lib/notes";

const display = Fraunces({ subsets: ["latin"], display: "swap" });

type Source = { note_id: string; title: string };
type CreatedNote = { note_id: string; title: string };
type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  created_note?: CreatedNote;
  pending_action?: PendingAction | null;
};
type ChatDone = {
  answer: string;
  sources: Source[];
  pending_action: PendingAction | null;
  created_note: CreatedNote | null;
  resolved?: { decision: string; executed: boolean; message: string } | null;
};
type StreamEvent = { token: string } | { error: string } | { done: ChatDone };
type ConfirmResponse = {
  message: string;
  note: { id: string; title: string };
};

function AssistantAvatar() {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-700 text-white shadow-sm">
      <Sparkles size={16} />
    </span>
  );
}

function UserAvatar({ imageUrl, name }: { imageUrl?: string; name?: string | null }) {
  return imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={imageUrl} alt="" className="size-8 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-200 text-xs font-semibold text-brand">
      {name?.[0]?.toUpperCase() ?? "U"}
    </span>
  );
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1" role="status">
      <span className="sr-only">Thinking...</span>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{ animationDelay: `${i * 150}ms` }}
          className="size-1.5 animate-bounce rounded-full bg-red-400"
        />
      ))}
    </span>
  );
}

export default function AskPage() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { mutate } = useSWRConfig();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmingIndex, setConfirmingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Keep the latest message in view while streaming
  useEffect(() => {
    if (messages.length === 0) return;
    endRef.current?.scrollIntoView({
      behavior: loading ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, loading]);

  async function handleSend() {
    const question = input.trim();
    if (!question || loading) return;
    const pendingAction =
      [...messages].reverse().find((message) => message.pending_action)
        ?.pending_action ?? null;
    const history = messages
      .filter((message) => message.content.trim())
      .slice(-6)
      .map(({ role, content }) => ({ role, content }));
    const assistantIndex = messages.length + 1;
    setMessages([
      ...messages,
      { role: "user", content: question },
      { role: "assistant", content: "" },
    ]);
    setInput("");
    setError(null);
    setLoading(true);
    const updateAssistant = (update: (message: Message) => Message) => {
      setMessages((current) =>
        current.map((message, index) =>
          index === assistantIndex ? update(message) : message,
        ),
      );
    };

    try {
      const token = await getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chat`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            question,
            history,
            pending_action: pendingAction,
          }),
        },
      );
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(
          `Request failed: ${response.status}${detail ? ` - ${detail}` : ""}`,
        );
      }
      if (!response.body) throw new Error("The chat response has no stream");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let receivedDone = false;

      async function processLine(line: string) {
        if (!line.trim()) return;
        const event = JSON.parse(line) as StreamEvent;
        if ("token" in event) {
          updateAssistant((message) => ({
            ...message,
            content: message.content + event.token,
          }));
          return;
        }
        if ("error" in event) throw new Error(event.error);
        receivedDone = true;
        const { resolved } = event.done;
        const clearOld = Boolean(resolved) || event.done.pending_action !== null;
        setMessages((current) =>
          clearOld
            ? current.map((message, index) =>
                index === assistantIndex
                  ? message
                  : { ...message, pending_action: null },
              )
            : current,
        );
        updateAssistant((message) => ({
          ...message,
          content: event.done.answer,
          sources: event.done.sources,
          created_note: event.done.created_note ?? undefined,
          pending_action: event.done.pending_action,
        }));
        if (event.done.created_note || resolved?.executed) {
          await invalidateNotes(mutate);
        }
      }

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        let newline = buffer.indexOf("\n");
        while (newline !== -1) {
          await processLine(buffer.slice(0, newline));
          buffer = buffer.slice(newline + 1);
          newline = buffer.indexOf("\n");
        }
        if (done) break;
      }
      if (buffer.trim()) await processLine(buffer);
      if (!receivedDone) throw new Error("The chat stream ended before completion");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to get an answer");
    } finally {
      setLoading(false);
    }
  }

  async function confirmAction(action: PendingAction, messageIndex: number) {
    if (confirmingIndex !== null) return;
    setConfirmingIndex(messageIndex);
    try {
      const result = await apiFetch<ConfirmResponse>("/api/chat/confirm", getToken, {
        method: "POST",
        body: {
          action: action.action,
          note_id: action.note_id,
          expected_updated_at: action.expected_updated_at,
          changes: action.changes,
        },
      });
      await invalidateNotes(mutate);
      setMessages((current) => [
        ...current.map((message, index) =>
          index === messageIndex
            ? { ...message, pending_action: null }
            : message,
        ),
        {
          role: "assistant",
          content: result.message,
          created_note: {
            note_id: result.note.id,
            title: result.note.title || "Untitled",
          },
        },
      ]);
    } catch (cause) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            cause instanceof Error
              ? `Unable to confirm action: ${cause.message}`
              : "Unable to confirm action",
        },
      ]);
    } finally {
      setConfirmingIndex(null);
    }
  }

  return (
    <div className="relative mx-auto flex min-h-[calc(100dvh-9rem)] w-full max-w-3xl flex-col md:min-h-full">
      {/* Header */}
      <header className="mb-8 flex flex-col gap-3 motion-safe:animate-fade-up">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-red-700">
          <Sparkles size={12} />
          Grounded in your notes
        </span>
        <h1
          className={`${display.className} text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl`}
        >
          Ask Carta AI
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-gray-600 sm:text-base">
          Ask questions about your notes, uncover connections between them, or
          have the assistant create and update notes for you.
        </p>
      </header>

      {/* Conversation */}
      <div className="flex-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-red-200 py-14 text-center motion-safe:animate-fade-up">
            <span className="flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <Sparkles size={22} />
            </span>
            <p className="text-sm text-gray-500">
              Start a conversation by asking about your notes.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-6">
            {messages.map((message, index) => {
              const isLast = index === messages.length - 1;
              const thinking =
                loading && isLast && message.role === "assistant" && !message.content;

              if (message.role === "user") {
                return (
                  <li
                    key={index}
                    className="flex items-start justify-end gap-3 motion-safe:animate-fade-up"
                  >
                    <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-tr-md bg-red-700 px-4 py-3 text-sm leading-relaxed text-white shadow-sm">
                      {message.content}
                    </p>
                    <UserAvatar imageUrl={user?.imageUrl} name={user?.firstName} />
                  </li>
                );
              }

              return (
                <li key={index} className="flex items-start gap-3 motion-safe:animate-fade-up">
                  <AssistantAvatar />
                  <div className="flex min-w-0 flex-1 flex-col gap-4">
                    {(message.content || thinking) && (
                      <div className="rounded-2xl rounded-tl-md border border-red-100 bg-panel px-5 py-4 shadow-sm">
                        {thinking ? (
                          <TypingDots />
                        ) : (
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-800">
                            {message.content}
                          </p>
                        )}
                      </div>
                    )}

                    {message.sources && message.sources.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                          Drawn from {message.sources.length}{" "}
                          {message.sources.length === 1 ? "note" : "notes"}
                        </p>
                        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {message.sources.map((source) => (
                            <li key={source.note_id} className="min-w-0">
                              <Link
                                href={`/notes/${source.note_id}`}
                                className="group/source flex min-w-0 items-center gap-3 rounded-xl border border-red-100 bg-panel p-3
                                  transition-[transform,border-color,box-shadow] duration-200
                                  hover:-translate-y-0.5 hover:border-red-300 hover:shadow-md hover:shadow-red-100/60"
                              >
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                                  <FileText size={16} />
                                </span>
                                <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800 transition-colors group-hover/source:text-red-700">
                                  {source.title || "Untitled"}
                                </span>
                                <ArrowUpRight
                                  size={14}
                                  className="shrink-0 text-gray-400 transition-colors group-hover/source:text-red-600"
                                />
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {message.created_note && (
                      <Link
                        href={`/notes/${message.created_note.note_id}`}
                        className="group/created flex min-w-0 items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3
                          transition-[transform,border-color,box-shadow] duration-200
                          hover:-translate-y-0.5 hover:border-red-300 hover:shadow-md hover:shadow-red-100/60"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-panel text-red-600">
                          <FileText size={16} />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm font-medium text-gray-900">
                            {message.created_note.title}
                          </span>
                          <span className="text-xs text-gray-500">Open note</span>
                        </span>
                        <ArrowUpRight
                          size={14}
                          className="shrink-0 text-red-500 transition-transform duration-200 group-hover/created:translate-x-0.5 group-hover/created:-translate-y-0.5"
                        />
                      </Link>
                    )}

                    {message.pending_action && (
                      <ActionCard
                        action={message.pending_action}
                        disabled={confirmingIndex !== null}
                        confirming={confirmingIndex === index}
                        onConfirm={() =>
                          void confirmAction(message.pending_action!, index)
                        }
                        onCancel={() =>
                          setMessages((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, pending_action: null }
                                : item,
                            ),
                          )
                        }
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={endRef} className="scroll-mb-36" />
      </div>

      {/* Composer */}
      <div className="sticky bottom-0 -mb-4 mt-6 bg-gradient-to-t from-[#fef9f9] via-[#fef9f9]/95 to-transparent pb-4 pt-6 sm:-mb-6 sm:pb-6">
        {error && (
          <p
            role="alert"
            className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 motion-safe:animate-fade-up"
          >
            {error}
          </p>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleSend();
          }}
          className="flex items-center gap-2 rounded-full border border-red-100 bg-panel p-1.5 pl-5 shadow-lg shadow-red-100/50
            transition-[border-color,box-shadow] duration-200 focus-within:border-red-300 focus-within:ring-4 focus-within:ring-red-100"
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about your notes"
            aria-label="Ask about your notes"
            className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-700 text-white
              transition-[transform,background-color,opacity] duration-200
              hover:bg-red-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowUp size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}