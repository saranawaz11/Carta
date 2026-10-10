import type { Note } from "@/lib/notes";

// Reads the timestamps whichever way your Note type names them
export function noteDates(note: Note) {
  const n = note as unknown as { created_at?: string; updated_at?: string };
  return { created: n.created_at, updated: n.updated_at };
}

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// "Today · 10:42", "Yesterday · 18:20", "Oct 7 · 09:56"
export function formatListStamp(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  const diff = Math.round((startOfDay(new Date()).getTime() - startOfDay(date).getTime()) / DAY);
  if (diff === 0) return `Today · ${time}`;
  if (diff === 1) return `Yesterday · ${time}`;
  return `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${time}`;
}