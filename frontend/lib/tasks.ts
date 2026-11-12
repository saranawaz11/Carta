"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";
import useSWR, { useSWRConfig } from "swr";

import { apiFetch } from "@/lib/api";

export type Task = {
  id: string;
  title: string;
  due_at: string | null;
  due_end_at: string | null;
  due_has_time: boolean;
  source_text: string | null;
  completed_at: string | null;
  created_at: string;
};

export type DueSelection = { from?: Date; to?: Date; time: string };
export type DeadlinePayload = {
  due_at: string | null;
  due_end_at: string | null;
  due_has_time: boolean;
};

const atNoon = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);

export function selectionToPayload(selection: DueSelection): DeadlinePayload {
  const { from, to, time } = selection;
  if (!from) return { due_at: null, due_end_at: null, due_has_time: false };
  if (time && !to) {
    const [hours, minutes] = time.split(":").map(Number);
    const due = new Date(from.getFullYear(), from.getMonth(), from.getDate(), hours, minutes);
    return { due_at: due.toISOString(), due_end_at: null, due_has_time: true };
  }
  return {
    due_at: atNoon(from).toISOString(),
    due_end_at: to ? atNoon(to).toISOString() : null,
    due_has_time: false,
  };
}

export function selectionFromTask(task: Task): DueSelection {
  if (!task.due_at) return { time: "" };
  const start = new Date(task.due_at);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    from: start,
    to: task.due_end_at ? new Date(task.due_end_at) : undefined,
    time: task.due_has_time ? `${pad(start.getHours())}:${pad(start.getMinutes())}` : "",
  };
}

const tasksKey = "/api/tasks";

export async function invalidateTasks(
  mutate: ReturnType<typeof useSWRConfig>["mutate"],
): Promise<void> {
  await mutate(tasksKey);
}

export function formatDue(task: Task): string {
  if (!task.due_at) return "";
  const dayOpts: Intl.DateTimeFormatOptions = { weekday: "short", year: "numeric", month: "short", day: "numeric" };
  const start = new Date(task.due_at);
  const startStr = task.due_has_time
    ? start.toLocaleString(undefined, { ...dayOpts, hour: "numeric", minute: "2-digit" })
    : start.toLocaleDateString(undefined, dayOpts);
  
  if (!task.due_end_at) {
    return startStr;
  }
  
  const end = new Date(task.due_end_at);
  const endStr = end.toLocaleDateString(undefined, dayOpts);
  return `${startStr} → ${endStr}`;
}

export function useTasks() {
  const { getToken } = useAuth();
  return useSWR<Task[]>(tasksKey, () => apiFetch<Task[]>(tasksKey, getToken));
}

export function useTaskActions() {
  const { getToken } = useAuth();
  const { mutate } = useSWRConfig();

  const toggle = useCallback(
    async (task: Task) => {
      const completed = !task.completed_at;
      await mutate<Task[]>(
        tasksKey,
        async (current) => {
          const updated = await apiFetch<Task>(
            `${tasksKey}/${task.id}`,
            getToken,
            { method: "PATCH", body: { completed } },
          );
          return (current ?? []).map((item) =>
            item.id === task.id ? updated : item,
          );
        },
        {
          optimisticData: (current) =>
            (current ?? []).map((item) =>
              item.id === task.id
                ? {
                    ...item,
                    completed_at: completed ? new Date().toISOString() : null,
                  }
                : item,
            ),
          rollbackOnError: true,
          revalidate: false,
        },
      );
    },
    [getToken, mutate],
  );

  const remove = useCallback(
    async (task: Task) => {
      await mutate<Task[]>(
        tasksKey,
        async (current) => {
          await apiFetch<void>(`${tasksKey}/${task.id}`, getToken, {
            method: "DELETE",
          });
          return (current ?? []).filter((item) => item.id !== task.id);
        },
        {
          optimisticData: (current) =>
            (current ?? []).filter((item) => item.id !== task.id),
          rollbackOnError: true,
          revalidate: false,
        },
      );
    },
    [getToken, mutate],
  );

  const create = useCallback(
    async (title: string, deadline?: DeadlinePayload) => {
      await mutate<Task[]>(
        tasksKey,
        async (current) => {
          const created = await apiFetch<Task>(tasksKey, getToken, {
            method: "POST",
            body: { title, ...(deadline ?? { due_at: null, due_end_at: null, due_has_time: false }) },
          });
          return [created, ...(current ?? [])];
        },
        { revalidate: false },
      );
    },
    [getToken, mutate],
  );

  const updateDeadline = useCallback(
    async (task: Task, due_at: string | null, due_end_at: string | null, due_has_time: boolean) => {
      await mutate<Task[]>(
        tasksKey,
        async (current) => {
          const updated = await apiFetch<Task>(
            `${tasksKey}/${task.id}`,
            getToken,
            { method: "PATCH", body: { due_at, due_end_at, due_has_time } },
          );
          return (current ?? []).map((item) =>
            item.id === task.id ? updated : item,
          );
        },
        {
          optimisticData: (current) =>
            (current ?? []).map((item) =>
              item.id === task.id
                ? { ...item, due_at, due_end_at, due_has_time }
                : item,
            ),
          rollbackOnError: true,
          revalidate: false,
        },
      );
    },
    [getToken, mutate],
  );

  const createFromText = useCallback(
    async (text: string) => {
      await mutate<Task[]>(
        tasksKey,
        async (current) => {
          const created = await apiFetch<Task>(tasksKey, getToken, {
            method: "POST",
            body: {
              title: text,
              now: new Date().toISOString(),
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
          });
          return [created, ...(current ?? [])];
        },
        { revalidate: false },
      );
    },
    [getToken, mutate],
  );

  return { toggle, remove, create, createFromText, updateDeadline };
}
