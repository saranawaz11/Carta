"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { formatDue, useTaskActions, useTasks } from "@/lib/tasks";

export default function TasksPage() {
  const { data: tasks, error, isLoading } = useTasks();
  const { toggle, remove } = useTaskActions();
  const [actionError, setActionError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setActionError(null);
    try {
      await action();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Action failed");
    }
  }

  return (
    <div>
      <h1>Tasks</h1>
      {isLoading && <p>Loading...</p>}
      {error && <p role="alert">Unable to load tasks</p>}
      {actionError && <p role="alert">{actionError}</p>}
      {tasks && tasks.length === 0 && <p>No tasks yet.</p>}
      <ul>
        {tasks?.map((task) => (
          <li key={task.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              aria-label={`Mark "${task.title}" done`}
              checked={task.completed_at !== null}
              onChange={() => void run(() => toggle(task))}
            />
            <span>{task.title}</span>
            {task.due_at && <span>Due {formatDue(task)}</span>}
            <Button
              type="button"
              variant="outline"
              onClick={() => void run(() => remove(task))}
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
