"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useState } from "react";
import { useSWRConfig } from "swr";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { invalidateNotes } from "@/lib/notes";

type Source = { note_id: string; title: string };
type CreatedNote = { note_id: string; title: string };
type PendingAction = {
  action: "update" | "archive" | "delete";
  note_id: string;
  note_title: string;
  expected_updated_at: string;
  changes: Record<string, string>;
};
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

function actionDescription(action: PendingAction): string {
  if (action.action === "archive") return "Archive this note?";
  if (action.action === "delete") return "Move this note to Deleted?";
  return "Apply these changes?";
}

export default function AskPage() {
  const { getToken } = useAuth();
  const { mutate } = useSWRConfig();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmingIndex, setConfirmingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    <div>
      <h1>Ask AI</h1>
      <ul>
        {messages.map((message, index) => (
          <li key={index}>
            <p>
              <strong>{message.role === "user" ? "You" : "AI"}:</strong>{" "}
              {message.content}
            </p>
            {message.sources && message.sources.length > 0 && (
              <ul>
                {message.sources.map((source) => (
                  <li key={source.note_id}>
                    <Link href={`/notes/${source.note_id}`}>
                      {source.title || "Untitled"}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {message.created_note && (
              <p>
                <Link href={`/notes/${message.created_note.note_id}`}>
                  {message.created_note.title}
                </Link>
              </p>
            )}
            {message.pending_action && (
              <div role="group" aria-label="Confirm note action">
                <p>
                  {actionDescription(message.pending_action)}{" "}
                  <strong>{message.pending_action.note_title}</strong>
                </p>
                {Object.entries(message.pending_action.changes).map(
                  ([field, value]) => (
                    <p key={field}>
                      {field === "title" ? "Title" : "Content"}: {value}
                    </p>
                  ),
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    disabled={confirmingIndex !== null}
                    onClick={() =>
                      void confirmAction(message.pending_action!, index)
                    }
                  >
                    Confirm
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={confirmingIndex !== null}
                    onClick={() =>
                      setMessages((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, pending_action: null }
                            : item,
                        ),
                      )
                    }
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {loading && <p>Thinking...</p>}
      {error && <p role="alert">{error}</p>}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSend();
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about your notes"
        />
        <Button type="submit" disabled={loading}>
          Send
        </Button>
      </form>
    </div>
  );
}
