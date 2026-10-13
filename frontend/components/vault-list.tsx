"use client";

import Link from "next/link";
import { Fraunces } from "next/font/google";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ChevronDown,
  Clock,
  Download,
  FileText,
  Info,
  RotateCcw,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Note, useNoteActions, useNotes } from "@/lib/notes";

const display = Fraunces({ subsets: ["latin"], display: "swap" });

type VaultStatus = "archived" | "deleted";
type SortKey = "updated-desc" | "updated-asc" | "title";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "updated-desc", label: "Last updated" },
  { key: "updated-asc", label: "Oldest updated" },
  { key: "title", label: "Title A–Z" },
];

const META: Record<
  VaultStatus,
  { title: string; description: string; banner: string; empty: string }
> = {
  archived: {
    title: "Archive",
    description:
      "A quiet resting place for finished notes and old drafts, kept safe until you need them.",
    banner:
      "Archived notes stay here until you restore them or move them to Trash.",
    empty: "Nothing archived yet.",
  },
  deleted: {
    title: "Trash",
    description:
      "Deleted notes wait here. Restore the ones you miss, or remove the rest for good.",
    banner: "Deleted notes can be restored. Deleting permanently can't be undone.",
    empty: "Trash is empty.",
  },
};

/* ---------- helpers ---------- */

// Reads the updated timestamp whichever way your Note type names it
function updatedAt(note: Note): string | undefined {
  const n = note as unknown as { updatedAt?: string; updated_at?: string };
  return n.updatedAt ?? n.updated_at;
}

function timeAgo(value?: string): string | null {
  if (!value) return null;
  const diff = (new Date(value).getTime() - Date.now()) / 1000;
  if (Number.isNaN(diff)) return null;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, seconds] of units) {
    if (Math.abs(diff) >= seconds) return rtf.format(Math.round(diff / seconds), unit);
  }
  return "just now";
}

function sortNotes(notes: Note[], key: SortKey): Note[] {
  const list = [...notes];
  if (key === "title") {
    const name = (n: Note) => n.title.trim() || "Untitled";
    return list.sort((a, b) =>
      name(a).localeCompare(name(b), undefined, { sensitivity: "base" }),
    );
  }
  const time = (n: Note) => {
    const v = updatedAt(n);
    return v ? new Date(v).getTime() : 0;
  };
  return list.sort((a, b) =>
    key === "updated-desc" ? time(b) - time(a) : time(a) - time(b),
  );
}

function downloadJson(notes: Note[], filename: string) {
  const data = notes.map((n) => ({
    id: n.id,
    title: n.title,
    content: n.content,
    updated: updatedAt(n) ?? null,
  }));
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/* ---------- small pieces ---------- */

const btnBase =
  "inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-[background-color,color,opacity] duration-200 disabled:pointer-events-none disabled:opacity-40";
const btnIdle = "text-gray-700 hover:bg-red-50 hover:text-red-700";
const cardBtn =
  "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-[background-color,color,opacity] duration-200 disabled:pointer-events-none disabled:opacity-40";

// Two-step button: first click arms it, second click confirms. Resets after 4s.
function ConfirmButton({
  label,
  confirmLabel,
  icon: Icon,
  onConfirm,
  disabled,
  base,
}: {
  label: string;
  confirmLabel: string;
  icon: LucideIcon;
  onConfirm: () => void;
  disabled?: boolean;
  base: string;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  useEffect(() => {
    if (disabled) setArmed(false);
  }, [disabled]);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
      className={`${base} ${
        armed ? "bg-red-700 text-white hover:bg-red-800" : "text-red-700 hover:bg-red-100"
      }`}
    >
      <Icon size={15} />
      {armed ? confirmLabel : label}
    </button>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-44 animate-pulse rounded-2xl bg-red-100/60" />
      ))}
    </div>
  );
}

/* ---------- main ---------- */

export function VaultList({ status }: { status: VaultStatus }) {
  const query = useSearchParams().get("q") ?? "";
  const { restoreNote, purgeNote, deleteNote } = useNoteActions();

  // Filtered list for this route + unfiltered lists for the tab counts
  const { data: notes, error, isLoading } = useNotes(status, query);
  const archivedAll = useNotes("archived", "");
  const deletedAll = useNotes("deleted", "");
  const total = (status === "archived" ? archivedAll : deletedAll).data?.length;

  const [sort, setSort] = useState<SortKey>("updated-desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const { title, description, banner, empty } = META[status];
  const sorted = useMemo(() => sortNotes(notes ?? [], sort), [notes, sort]);
  const selectedNotes = sorted.filter((n) => selected.has(n.id));
  const allSelected = sorted.length > 0 && selectedNotes.length === sorted.length;
  const someSelected = selectedNotes.length > 0 && !allSelected;
  const busy = busyIds.size > 0;
  const count = notes?.length;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const countLabel =
    count === undefined
      ? ""
      : query
        ? `${count} ${count === 1 ? "result" : "results"} for “${query}”`
        : `${count} ${count === 1 ? "note" : "notes"}`;

  const tabs = [
    { status: "archived", href: "/archive", label: "Archive", icon: Archive, count: archivedAll.data?.length },
    { status: "deleted", href: "/deleted", label: "Trash", icon: Trash2, count: deletedAll.data?.length },
  ] as const;

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(sorted.map((n) => n.id)));
  }

  async function runBatch(targets: Note[], action: (note: Note) => Promise<unknown>) {
    if (targets.length === 0) return;
    setActionError(null);
    setBusyIds((prev) => new Set([...prev, ...targets.map((n) => n.id)]));

    const results = await Promise.allSettled(targets.map((note) => action(note)));
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    if (failed.length > 0) {
      const reason = failed[0].reason;
      const message = reason instanceof Error ? reason.message : "Unable to update note";
      setActionError(
        failed.length === targets.length
          ? message
          : `${failed.length} of ${targets.length} failed: ${message}`,
      );
    }

    setBusyIds((prev) => {
      const next = new Set(prev);
      targets.forEach((n) => next.delete(n.id));
      return next;
    });
    // Drop finished notes from the selection
    setSelected((prev) => {
      const next = new Set(prev);
      results.forEach((r, i) => {
        if (r.status === "fulfilled") next.delete(targets[i].id);
      });
      return next;
    });
  }

  function handleExport() {
    const targets = selectedNotes.length > 0 ? selectedNotes : sorted;
    downloadJson(targets, `carta-${status === "archived" ? "archive" : "trash"}.json`);
  }

  return (
    <section className="mx-auto w-full max-w-6xl">
      {/* Header */}
      <header className="mb-6 flex flex-col gap-5 motion-safe:animate-fade-up sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            <span className="size-1.5 rounded-full bg-red-500" />
            <span>Carta</span>
            {count !== undefined && (
              <>
                <span aria-hidden="true">•</span>
                <span className="tabular-nums">{countLabel}</span>
              </>
            )}
          </p>
          <h1
            className={`${display.className} text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl`}
          >
            {title}
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-gray-600 sm:text-base">
            {description}
          </p>
        </div>

        {/* Tabs: identical on both routes */}
        <nav
          aria-label="Archive and Trash"
          className="inline-flex w-fit rounded-full border border-red-100 bg-panel p-1 shadow-sm"
        >
          {tabs.map(({ status: tabStatus, href, label, icon: Icon, count: tabCount }) => {
            const active = tabStatus === status;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-[background-color,color,box-shadow] duration-200 ${
                  active
                    ? "bg-red-700 text-white shadow"
                    : "text-gray-600 hover:bg-red-50 hover:text-red-700"
                }`}
              >
                <Icon size={15} />
                {label}
                {tabCount !== undefined && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
                      active ? "bg-panel/20 text-white" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {tabCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Policy line */}
      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-100 bg-panel/70 px-4 py-3 text-sm text-gray-600 motion-safe:animate-fade-up">
        {status === "archived" ? (
          <Info size={16} className="mt-0.5 shrink-0 text-red-600" />
        ) : (
          <ShieldAlert size={16} className="mt-0.5 shrink-0 text-red-600" />
        )}
        <p>
          <span className="font-semibold text-gray-900">
            {status === "archived" ? "Archive policy: " : "Heads up: "}
          </span>
          {banner}
        </p>
      </div>

      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-1 rounded-2xl border border-red-100 bg-panel p-1.5 shadow-sm">
        <label className={`${btnBase} ${btnIdle} cursor-pointer select-none`}>
          <input
            ref={selectAllRef}
            type="checkbox"
            checked={allSelected}
            disabled={sorted.length === 0 || busy}
            onChange={toggleAll}
            className="size-4 cursor-pointer accent-red-700"
          />
          {selectedNotes.length > 0 ? `${selectedNotes.length} selected` : "Select all"}
        </label>

        <span className="mx-1 hidden h-5 w-px bg-red-100 sm:block" aria-hidden="true" />

        <button
          type="button"
          disabled={selectedNotes.length === 0 || busy}
          onClick={() => void runBatch(selectedNotes, restoreNote)}
          className={`${btnBase} ${btnIdle}`}
        >
          <RotateCcw size={15} />
          Restore selected
        </button>

        {status === "archived" ? (
          <button
            type="button"
            disabled={selectedNotes.length === 0 || busy}
            onClick={() => void runBatch(selectedNotes, deleteNote)}
            className={`${btnBase} ${btnIdle}`}
          >
            <Trash2 size={15} />
            Move to Trash
          </button>
        ) : (
          <ConfirmButton
            label="Delete permanently"
            confirmLabel="Click again to confirm"
            icon={Trash2}
            base={btnBase}
            disabled={selectedNotes.length === 0 || busy}
            onConfirm={() => void runBatch(selectedNotes, purgeNote)}
          />
        )}

        <button
          type="button"
          disabled={sorted.length === 0}
          onClick={handleExport}
          className={`${btnBase} ${btnIdle} sm:ml-auto`}
        >
          <Download size={15} />
          {selectedNotes.length > 0 ? `Export (${selectedNotes.length})` : "Export"}
        </button>
      </div>

      {/* Status line + sort */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 px-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
          Sorted by {SORTS.find((s) => s.key === sort)?.label.toLowerCase()}
          {count !== undefined && total !== undefined && query && (
            <span className="tabular-nums">
              {" • "}
              {count} of {total} shown
            </span>
          )}
        </p>
        <label className="relative inline-flex items-center">
          <span className="sr-only">Sort notes</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-9 cursor-pointer appearance-none rounded-full border border-red-100 bg-panel pl-4 pr-9 text-sm font-medium text-gray-700 outline-none
              transition-[border-color,box-shadow] duration-200 hover:border-red-300 focus:border-red-300 focus:ring-4 focus:ring-red-100"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-3.5 text-gray-500"
          />
        </label>
      </div>

      {actionError && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 motion-safe:animate-fade-up"
        >
          {actionError}
        </p>
      )}

      {isLoading && <SkeletonGrid />}

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error.message}
        </p>
      )}

      {!isLoading && !error && sorted.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-red-200 py-16 text-center motion-safe:animate-fade-up">
          <FileText className="text-red-300" size={32} />
          <p className="text-sm text-gray-500">
            {query ? "No notes match your search." : empty}
          </p>
        </div>
      )}

      {sorted.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((note, index) => {
            const isSelected = selected.has(note.id);
            const isBusy = busyIds.has(note.id);
            const stamp = timeAgo(updatedAt(note));
            const noteTitle = note.title.trim() || "Untitled";

            return (
              <li
                key={note.id}
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                className={`group flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-panel shadow-sm
                  transition-[transform,box-shadow,border-color,background-color,opacity] duration-300 ease-out motion-safe:animate-fade-up
                  hover:-translate-y-0.5 hover:shadow-lg hover:shadow-red-100/60
                  ${
                    isSelected
                      ? "border-red-400 bg-red-50/50 ring-2 ring-red-100"
                      : "border-red-100 hover:border-red-300"
                  }
                  ${isBusy ? "opacity-60" : ""}`}
              >
                <div className="flex items-center justify-between gap-3 px-5 pt-4">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isBusy}
                    onChange={() => toggleOne(note.id)}
                    aria-label={`Select ${noteTitle}`}
                    className="size-4 cursor-pointer accent-red-700"
                  />
                  {stamp && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-700">
                      <Clock size={11} />
                      Updated {stamp}
                    </span>
                  )}
                </div>

                <Link
                  href={`/notes/${note.id}`}
                  className="flex flex-1 flex-col gap-2 px-5 pb-4 pt-3 outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                >
                  <h2 className="truncate text-base font-semibold text-gray-900 transition-colors duration-200 group-hover:text-red-700">
                    {noteTitle}
                  </h2>
                  {note.content ? (
                    <p className="line-clamp-4 break-words text-sm leading-relaxed text-gray-600">
                      {note.content}
                    </p>
                  ) : (
                    <p className="text-sm italic text-gray-400">Empty note</p>
                  )}
                </Link>

                <div className="flex items-center justify-between gap-2 border-t border-red-50 px-3 py-2.5">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void runBatch([note], restoreNote)}
                    className={`${cardBtn} ${btnIdle}`}
                  >
                    <RotateCcw size={13} />
                    Restore
                  </button>

                  {status === "archived" ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void runBatch([note], deleteNote)}
                      aria-label="Move to Trash"
                      title="Move to Trash"
                      className={`${cardBtn} text-gray-500 hover:bg-red-100 hover:text-red-700`}
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : (
                    <ConfirmButton
                      label="Delete permanently"
                      confirmLabel="Confirm?"
                      icon={Trash2}
                      base={cardBtn}
                      disabled={isBusy}
                      onConfirm={() => void runBatch([note], purgeNote)}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}