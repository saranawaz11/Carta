"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useState } from "react";
import useSWR, { useSWRConfig } from "swr";

import { apiFetch } from "@/lib/api";
import { invalidateTasks } from "@/lib/tasks";

export type Deadline = {
  title: string;
  due_at: string;
  due_has_time: boolean;
  already_in_tasks: boolean;
};

export type NoteSummary = {
  overview: string;
  key_points: string[];
  deadlines: Deadline[];
  connections: { note_id: string; title: string; reason: string }[];
  stale: boolean;
  generated_at: string;
};

export function formatDeadline(deadline: Deadline): string {
  const date = new Date(deadline.due_at);
  return deadline.due_has_time
    ? date.toLocaleString()
    : date.toLocaleDateString();
}

export function useNoteSummary(noteId: string) {
  const { getToken } = useAuth();
  const { mutate: globalMutate } = useSWRConfig();
  const key = `/api/notes/${noteId}/summary`;
  const { data, error, isLoading, mutate } = useSWR<NoteSummary | null>(key, () =>
    apiFetch<NoteSummary | null>(key, getToken),
  );
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const run = useCallback(
    async (action: () => Promise<void>) => {
      setPending(true);
      setActionError(null);
      try {
        await action();
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setPending(false);
      }
    },
    [],
  );

  const generate = useCallback(
    () =>
      run(async () => {
        const next = await apiFetch<NoteSummary>(key, getToken, {
          method: "POST",
          body: {
            now: new Date().toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        });
        await mutate(next, { revalidate: false });
      }),
    [getToken, key, mutate, run],
  );

  const updateDeadlines = useCallback(
    (index: number, method: "DELETE" | "POST", suffix: string) =>
      run(async () => {
        const deadlines = await apiFetch<Deadline[]>(
          `${key}/deadlines/${index}${suffix}`,
          getToken,
          { method },
        );
        await mutate((current) => (current ? { ...current, deadlines } : current), {
          revalidate: false,
        });
        if (method === "POST") await invalidateTasks(globalMutate);
      }),
    [getToken, globalMutate, key, mutate, run],
  );

  return {
    summary: data ?? null,
    isLoading,
    pending,
    error: actionError ?? (error instanceof Error ? error.message : null),
    generate,
    removeDeadline: (index: number) => updateDeadlines(index, "DELETE", ""),
    addDeadlineToTasks: (index: number) => updateDeadlines(index, "POST", "/task"),
  };
}
