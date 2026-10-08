"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";
import useSWR, { useSWRConfig } from "swr";

import { apiFetch } from "@/lib/api";

export type Task = {
  id: string;
  title: string;
  due_at: string | null;
  due_has_time: boolean;
  completed_at: string | null;
  created_at: string;
};

const tasksKey = "/api/tasks";

export async function invalidateTasks(
  mutate: ReturnType<typeof useSWRConfig>["mutate"],
): Promise<void> {
  await mutate(tasksKey);
}

export function formatDue(task: Task): string {
  if (!task.due_at) return "";
  const date = new Date(task.due_at);
  return task.due_has_time ? date.toLocaleString() : date.toLocaleDateString();
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

  return { toggle, remove };
}
