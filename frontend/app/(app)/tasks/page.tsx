"use client";

import { Fraunces } from "next/font/google";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  TrendingUp,
} from "lucide-react";

import { type Task, useTaskActions, useTasks } from "@/lib/tasks";

const display = Fraunces({ subsets: ["latin"], display: "swap" });

/* ---------- STATIC placeholder ----------
   Tasks without a due date, and tasks created from the quick-add bar,
   are due on this day of the current month. Swap for real logic later. */
const STATIC_DUE_DAY = 9;

function staticDue(): Date {
  const d = new Date();
  d.setDate(STATIC_DUE_DAY);
  d.setHours(12, 0, 0, 0);
  return d;
}

/* ---------- date helpers ---------- */

type Item = { task: Task; due: Date; diff: number };

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dueOf = (task: Task) => (task.due_at ? new Date(task.due_at) : staticDue());
const dayDiff = (due: Date, now: Date) =>
  Math.round((startOfDay(due).getTime() - startOfDay(now).getTime()) / DAY);

function dueLabel(task: Task, due: Date, diff: number): string {
  const time = task.due_has_time
    ? due.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : null;
  if (diff < 0) return `${-diff}d overdue`;
  if (diff === 0) return time ? `Today, ${time}` : "Today";
  if (diff === 1) return time ? `Tomorrow, ${time}` : "Tomorrow";
  const date = due.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return time ? `${date}, ${time}` : date;
}

/* ---------- small pieces ---------- */

function DueChip({ item, className = "" }: { item: Item; className?: string }) {
  const { task, due, diff } = item;
  const done = Boolean(task.completed_at);
  const tone = done
    ? "bg-gray-100 text-gray-400"
    : diff < 0
      ? "bg-red-100 text-red-700"
      : diff === 0
        ? "bg-red-50 text-red-700 ring-1 ring-red-200"
        : "bg-gray-100 text-gray-600";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${tone} ${className}`}
    >
      <Clock size={11} />
      {dueLabel(task, due, diff)}
    </span>
  );
}

function TaskRow({
  item,
  index,
  onToggle,
  onRemove,
}: {
  item: Item;
  index: number;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const { task } = item;
  const done = Boolean(task.completed_at);

  return (
    <li
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className="group flex min-w-0 items-center gap-3 rounded-2xl border border-red-100 bg-panel px-4 py-3.5 shadow-sm
        transition-[transform,box-shadow,border-color] duration-300 ease-out motion-safe:animate-fade-up
        hover:-translate-y-0.5 hover:border-red-300 hover:shadow-md hover:shadow-red-100/60"
    >
      <input
        type="checkbox"
        aria-label={`Mark "${task.title}" done`}
        checked={done}
        onChange={onToggle}
        className="size-5 shrink-0 cursor-pointer accent-red-700"
      />
      <div className="min-w-0 flex-1">
        <p
          className={`line-clamp-2 break-words text-sm font-medium transition-colors duration-300 ${
            done ? "text-gray-400 line-through" : "text-gray-900"
          }`}
        >
          {task.title}
        </p>
        <DueChip item={item} className="mt-1.5 sm:hidden" />
      </div>
      <DueChip item={item} className="hidden sm:inline-flex" />
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Delete "${task.title}"`}
        title="Delete task"
        className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-[background-color,color,opacity] duration-200
          hover:bg-red-100 hover:text-red-600 focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
      >
        <Trash2 size={16} />
      </button>
    </li>
  );
}

function TaskGroup({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-red-700">
          {count} {count === 1 ? "item" : "items"}
        </span>
      </div>
      {children}
    </section>
  );
}

function FocusRing({
  pct,
  done,
  onTrack,
  overdue,
}: {
  pct: number;
  done: number;
  onTrack: number;
  overdue: number;
}) {
  const R = 42;
  const C = 2 * Math.PI * R;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const legend = [
    { label: "Done", value: done, dot: "bg-red-700" },
    { label: "On track", value: onTrack, dot: "bg-red-300" },
    { label: "Overdue", value: overdue, dot: "bg-gray-400" },
  ];

  return (
    <div className="rounded-2xl border border-red-100 bg-panel p-5 shadow-sm">
      <h2 className="font-semibold text-gray-900">Progress</h2>
      <div className="mt-4 flex items-center gap-5">
        <div className="relative size-28 shrink-0">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90">
            <circle cx="50" cy="50" r={R} fill="none" strokeWidth="10" className="stroke-red-100" />
            <circle
              cx="50"
              cy="50"
              r={R}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={ready ? C * (1 - pct / 100) : C}
              className="stroke-red-700 transition-[stroke-dashoffset] duration-700 ease-out"
            />
          </svg>
          <span
            className={`${display.className} absolute inset-0 flex items-center justify-center text-2xl font-semibold tabular-nums text-gray-900`}
          >
            {pct}%
          </span>
        </div>
        <ul className="flex flex-1 flex-col gap-2.5">
          {legend.map(({ label, value, dot }) => (
            <li key={label} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-gray-600">
                <span className={`size-2 rounded-full ${dot}`} />
                {label}
              </span>
              <span className="font-semibold tabular-nums text-gray-900">{value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DeadlinesCard({
  now,
  dots,
  deadlines,
}: {
  now: Date;
  dots: Map<number, number>;
  deadlines: Item[];
}) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return (
    <div className="rounded-2xl border border-red-100 bg-panel p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold text-gray-900">
          <CalendarDays size={16} className="text-red-600" />
          Upcoming deadlines
        </h2>
        <span className="text-xs font-medium text-gray-500">
          {now.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-y-1 text-center">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="pb-1 text-[11px] font-semibold text-gray-400">
            {d}
          </span>
        ))}
        {Array.from({ length: offset }).map((_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const isToday = day === now.getDate();
          const hasTasks = (dots.get(day) ?? 0) > 0;
          return (
            <div key={day} className="relative flex h-8 items-center justify-center text-xs">
              <span
                className={`flex size-7 items-center justify-center rounded-full tabular-nums transition-colors ${
                  isToday ? "bg-red-700 font-semibold text-white" : "text-gray-700"
                }`}
              >
                {day}
              </span>
              {hasTasks && (
                <span className="absolute bottom-0 size-1 rounded-full bg-red-500" />
              )}
            </div>
          );
        })}
      </div>

      <ul className="mt-4 flex flex-col gap-2 border-t border-red-50 pt-4">
        {deadlines.length === 0 && (
          <li className="text-sm text-gray-500">No upcoming deadlines.</li>
        )}
        {deadlines.map(({ task, due, diff }) => (
          <li
            key={task.id}
            className="flex min-w-0 items-center gap-3 rounded-xl p-1.5 transition-colors duration-200 hover:bg-red-50"
          >
            <span className="flex size-10 shrink-0 flex-col items-center justify-center rounded-xl bg-red-50 text-red-700">
              <span className="text-[9px] font-semibold uppercase leading-none">
                {due.toLocaleDateString(undefined, { month: "short" })}
              </span>
              <span className="text-sm font-semibold leading-tight tabular-nums">
                {due.getDate()}
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-gray-900">
                {task.title}
              </span>
              <span className="text-xs text-gray-500">
                {diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : `in ${diff} days`}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- page ---------- */

export default function TasksPage() {
  const rawQuery = (useSearchParams().get("q") ?? "").trim();
  const query = rawQuery.toLowerCase();

  const { data: tasks, error, isLoading, isValidating, mutate } = useTasks();
  const { toggle, remove, create } = useTaskActions();

  const [actionError, setActionError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const now = useMemo(() => new Date(), []);

  const view = useMemo(() => {
    const items: Item[] = (tasks ?? []).map((task) => {
      const due = dueOf(task);
      return { task, due, diff: dayDiff(due, now) };
    });
    const byDue = (a: Item, b: Item) => a.due.getTime() - b.due.getTime();
    const open = items.filter((i) => !i.task.completed_at).sort(byDue);
    const done = items
      .filter((i) => i.task.completed_at)
      .sort(
        (a, b) =>
          new Date(b.task.completed_at as string).getTime() -
          new Date(a.task.completed_at as string).getTime(),
      );
    const matches = (i: Item) => !query || i.task.title.toLowerCase().includes(query);

    const dots = new Map<number, number>();
    open.forEach((i) => {
      if (i.due.getMonth() === now.getMonth() && i.due.getFullYear() === now.getFullYear()) {
        dots.set(i.due.getDate(), (dots.get(i.due.getDate()) ?? 0) + 1);
      }
    });

    const overdue = open.filter((i) => i.diff < 0).length;
    return {
      total: items.length,
      open,
      done,
      overdue,
      onTrack: open.length - overdue,
      pendingToday: open.filter((i) => i.diff <= 0).length,
      dueThisWeek: open.filter((i) => i.diff >= 0 && i.diff <= 6).length,
      urgent: open.filter((i) => i.diff <= 0 && matches(i)),
      upcoming: open.filter((i) => i.diff > 0 && matches(i)),
      doneList: done.filter(matches),
      deadlines: open.filter((i) => i.diff >= 0).slice(0, 4),
      dots,
    };
  }, [tasks, now, query]);

  const pct = view.total ? Math.round((view.done.length / view.total) * 100) : 0;
  const shown = view.urgent.length + view.upcoming.length + view.doneList.length;

  async function run(action: () => Promise<unknown>) {
    setActionError(null);
    try {
      await action();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Action failed");
    }
  }

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    const value = title.trim();
    if (!value || adding) return;
    setAdding(true);
    setActionError(null);
    try {
      await create(value, staticDue());
      setTitle("");
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Unable to add task");
    } finally {
      setAdding(false);
    }
  }

  const stats = [
    { label: "Pending today", value: String(view.pendingToday), icon: Clock, note: "due today or overdue" },
    { label: "Due this week", value: String(view.dueThisWeek), icon: CalendarDays, note: "next 7 days" },
    { label: "Completed", value: String(view.done.length), icon: CheckCircle2, note: "all time" },
    { label: "Completion", value: `${pct}%`, icon: TrendingUp, note: `${view.done.length} of ${view.total}` },
  ];

  return (
    <section className="mx-auto w-full max-w-6xl">
      {/* Header */}
      <header className="mb-8 flex flex-col gap-5 motion-safe:animate-fade-up sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            <span className="size-1.5 rounded-full bg-red-500" />
            <span>Carta</span>
            {tasks && (
              <>
                <span aria-hidden="true">•</span>
                <span className="tabular-nums">
                  {rawQuery ? `${shown} results for “${rawQuery}”` : `${view.open.length} open`}
                </span>
              </>
            )}
          </p>
          <h1
            className={`${display.className} text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl`}
          >
            Tasks
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-gray-600 sm:text-base">
            Everything you need to do, ordered by what&apos;s due first.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void mutate()}
          className="inline-flex h-10 w-fit items-center gap-2 rounded-full border border-red-100 bg-panel px-5 text-sm font-medium text-gray-700 shadow-sm
            transition-[transform,border-color,color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-red-300 hover:text-red-700 hover:shadow-md active:translate-y-0"
        >
          <RefreshCw size={15} className={isValidating ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>

      {/* Stats */}
      <ul className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="h-28 animate-pulse rounded-2xl bg-red-100/60" />
            ))
          : stats.map(({ label, value, icon: Icon, note }, i) => (
              <li
                key={label}
                style={{ animationDelay: `${i * 50}ms` }}
                className="flex items-start justify-between gap-3 rounded-2xl border border-red-100 bg-panel p-5 shadow-sm
                  transition-[transform,box-shadow,border-color] duration-300 ease-out motion-safe:animate-fade-up
                  hover:-translate-y-0.5 hover:border-red-300 hover:shadow-lg hover:shadow-red-100/60"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                    {label}
                  </p>
                  <p
                    className={`${display.className} mt-2 text-4xl font-semibold tabular-nums text-gray-900`}
                  >
                    {value}
                  </p>
                  <p className="mt-1 truncate text-xs text-gray-500">{note}</p>
                </div>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <Icon size={18} />
                </span>
              </li>
            ))}
      </ul>

      {/* Quick add */}
      <form
        onSubmit={handleAdd}
        className="mb-8 flex items-center gap-2 rounded-full border border-red-100 bg-panel p-1.5 pl-5 shadow-sm
          transition-[border-color,box-shadow] duration-200 focus-within:border-red-300 focus-within:ring-4 focus-within:ring-red-100"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task and press Enter"
          aria-label="New task"
          className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
        />
        <button
          type="submit"
          disabled={adding || !title.trim()}
          aria-label="Add task"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-700 text-white
            transition-[transform,background-color,opacity] duration-200 hover:bg-red-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {adding ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
        </button>
      </form>

      {(error || actionError) && (
        <p
          role="alert"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 motion-safe:animate-fade-up"
        >
          {error ? "Unable to load tasks" : actionError}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Lists */}
        <div className="flex min-w-0 flex-col gap-8">
          {isLoading && (
            <div className="flex flex-col gap-2" aria-hidden="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl bg-red-100/60" />
              ))}
            </div>
          )}

          {tasks && (
            <>
              <TaskGroup title="Today & Urgent" count={view.urgent.length}>
                {view.urgent.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-red-200 py-8 text-center text-sm text-gray-500">
                    {rawQuery
                      ? "No tasks match your search."
                      : view.total === 0
                        ? "No tasks yet. Add your first one above."
                        : "Nothing urgent. You're all caught up."}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {view.urgent.map((item, i) => (
                      <TaskRow
                        key={item.task.id}
                        item={item}
                        index={i}
                        onToggle={() => void run(() => toggle(item.task))}
                        onRemove={() => void run(() => remove(item.task))}
                      />
                    ))}
                  </ul>
                )}
              </TaskGroup>

              {view.upcoming.length > 0 && (
                <TaskGroup title="Upcoming" count={view.upcoming.length}>
                  <ul className="flex flex-col gap-2">
                    {view.upcoming.map((item, i) => (
                      <TaskRow
                        key={item.task.id}
                        item={item}
                        index={i}
                        onToggle={() => void run(() => toggle(item.task))}
                        onRemove={() => void run(() => remove(item.task))}
                      />
                    ))}
                  </ul>
                </TaskGroup>
              )}

              {view.doneList.length > 0 && (
                <TaskGroup title="Completed" count={view.doneList.length}>
                  <ul className="flex flex-col gap-2">
                    {view.doneList.map((item, i) => (
                      <TaskRow
                        key={item.task.id}
                        item={item}
                        index={i}
                        onToggle={() => void run(() => toggle(item.task))}
                        onRemove={() => void run(() => remove(item.task))}
                      />
                    ))}
                  </ul>
                </TaskGroup>
              )}
            </>
          )}
        </div>

        {/* Side panels */}
        <aside className="flex flex-col gap-6">
          <FocusRing
            pct={pct}
            done={view.done.length}
            onTrack={view.onTrack}
            overdue={view.overdue}
          />
          <DeadlinesCard now={now} dots={view.dots} deadlines={view.deadlines} />
        </aside>
      </div>
    </section>
  );
}