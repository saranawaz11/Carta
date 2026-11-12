"use client";

import Link from "next/link";
import { Fraunces } from "next/font/google";
import { useTheme } from "next-themes";
import { useClerk, useUser } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { ArrowUpRight, Check, ChevronDown, KeyRound, Loader2, LogOut, ShieldCheck } from "lucide-react";

import {
  DEFAULT_SETTINGS,
  type Settings,
  type Typeface,
  type WeekStart,
  useSettings,
} from "@/lib/settings";

const display = Fraunces({ subsets: ["latin"], display: "swap", axes: ["opsz"] });

const muted = "text-gray-500";

const THEMES = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "Use system" },
] as const;

/* ---------- small pieces ---------- */

// Tiny drawings of the app, deliberately NOT themed so each card always shows its own mode
function MiniScreen({ tone }: { tone: "light" | "dark" }) {
  const light = tone === "light";
  return (
    <div className={`size-full p-2.5 ${light ? "bg-[#fff6f3]" : "bg-[#1a1313]"}`}>
      <div className={`h-1.5 w-7 rounded-full ${light ? "bg-[#991b2b]" : "bg-[#e85a5a]"}`} />
      <div className={`mt-2.5 space-y-1.5 rounded-md p-2 ${light ? "bg-white" : "bg-[#251b1b]"}`}>
        <div className={`h-1 w-12 rounded-full ${light ? "bg-[#d1d5db]" : "bg-[#52494a]"}`} />
        <div className={`h-1 w-16 rounded-full ${light ? "bg-[#e5e7eb]" : "bg-[#3a3232]"}`} />
      </div>
    </div>
  );
}

function ThemePreview({ id }: { id: (typeof THEMES)[number]["id"] }) {
  if (id === "system") {
    return (
      <div className="relative size-full">
        <div className="absolute inset-0">
          <MiniScreen tone="light" />
        </div>
        <div className="absolute inset-0 [clip-path:polygon(50%_0,100%_0,100%_100%,50%_100%)]">
          <MiniScreen tone="dark" />
        </div>
      </div>
    );
  }
  return <MiniScreen tone={id} />;
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2.5">
      <span aria-hidden="true" className={`w-6 text-right text-[11px] tabular-nums ${muted}`}>
        {checked ? "On" : "Off"}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full outline-none transition-colors duration-300
          focus-visible:ring-4 focus-visible:ring-brand/25 ${checked ? "bg-button" : "bg-gray-300"}`}
      >
        <span
          className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function Select<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <label className="relative inline-block shrink-0">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-10 min-w-[10.5rem] cursor-pointer appearance-none rounded-xl border border-line bg-panel pl-4 pr-10 text-sm text-ink outline-none
          transition-[border-color,box-shadow] duration-200 hover:border-line-strong focus:border-brand focus:ring-4 focus:ring-brand/20"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
    </label>
  );
}

function Row({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className={`mt-0.5 text-xs ${muted}`}>{hint}</p>
      </div>
      {children}
    </div>
  );
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h2 className={`${display.className} text-2xl font-normal text-ink`}>{title}</h2>
      {hint && <p className={`mt-1 text-xs ${muted}`}>{hint}</p>}
    </div>
  );
}

function Avatar({ name, imageUrl, hasImage }: { name: string; imageUrl?: string; hasImage: boolean }) {
  if (hasImage && imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt="" className="size-10 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span
      aria-hidden="true"
      className={`${display.className} flex size-10 shrink-0 items-center justify-center rounded-full bg-tint text-base text-brand`}
    >
      {(name.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}

/* ---------- page ---------- */

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const { settings, save, ready } = useSettings();

  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState<Settings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const initialised = useRef(false);

  useEffect(() => setMounted(true), []);

  // Fill the draft once the stored settings have loaded
  useEffect(() => {
    if (!ready || initialised.current) return;
    initialised.current = true;
    setDraft(settings);
  }, [ready, settings]);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(timer);
  }, [saved]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const currentTheme = mounted ? (theme ?? "system") : "system";

  function patch<K extends keyof Settings>(key: K, value: Settings[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  // Appearance applies right away, with the same soft cross-fade as the navbar toggle
  function applyTheme(next: string) {
    const doc = document as Document & { startViewTransition?: (callback: () => void) => unknown };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (doc.startViewTransition && !reduce) {
      doc.startViewTransition(() => flushSync(() => setTheme(next)));
    } else {
      setTheme(next);
    }
  }

  function onThemeKeys(e: KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const i = THEMES.findIndex((t) => t.id === currentTheme);
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : THEMES.length - 1;
    const next = THEMES[(i + step) % THEMES.length];
    applyTheme(next.id);
    document.getElementById(`theme-${next.id}`)?.focus();
  }

  function saveChanges() {
    save(draft);
    setSaved(true);
  }

  async function deleteAccount() {
    if (!user || confirmText !== "DELETE" || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      // If your backend stores notes and tasks, delete them FIRST, for example:
      // await apiFetch<void>("/api/account", getToken, { method: "DELETE" });
      await user.delete();
      await signOut({ redirectUrl: "/" });
    } catch (cause) {
      setDeleteError(
        isClerkAPIResponseError(cause)
          ? (cause.errors[0]?.longMessage ?? cause.errors[0]?.message ?? "Unable to delete account")
          : cause instanceof Error
            ? cause.message
            : "Unable to delete account",
      );
      setDeleting(false);
    }
  }

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name = user?.fullName ?? "Unknown User";

  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="mb-10 motion-safe:animate-fade-up">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand">Make yourself at home</p>
        <h1 className={`${display.className} mt-4 text-4xl font-semibold tracking-tight text-ink sm:text-5xl`}>
          Settings
        </h1>
        <p className={`mt-3 text-sm ${muted}`}>A few small adjustments to make Carta feel like your space.</p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 motion-safe:animate-fade-up" style={{ animationDelay: "60ms" }}>
          {/* Appearance */}
          <section>
            <SectionTitle title="Appearance" hint="Choose a little light, or a quieter shade. This applies right away." />
            <div
              role="radiogroup"
              aria-label="Theme"
              onKeyDown={onThemeKeys}
              className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3"
            >
              {THEMES.map(({ id, label }) => {
                const on = currentTheme === id;
                return (
                  <button
                    key={id}
                    id={`theme-${id}`}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    tabIndex={on ? 0 : -1}
                    onClick={() => applyTheme(id)}
                    className={`rounded-xl border p-2.5 text-left outline-none transition-[border-color,box-shadow,transform,background-color] duration-300
                      hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-brand/25 ${
                        on
                          ? "border-brand bg-tint/60 ring-2 ring-brand/20"
                          : "border-line bg-panel hover:border-line-strong"
                      }`}
                  >
                    <div className="h-[72px] overflow-hidden rounded-lg border border-black/10">
                      <ThemePreview id={id} />
                    </div>
                    <div className="mt-2.5 flex items-center justify-between px-0.5">
                      <span className={`text-xs transition-colors duration-300 ${on ? "text-brand" : "text-gray-600"}`}>
                        {label}
                      </span>
                      <span
                        className={`flex size-3.5 items-center justify-center rounded-full border transition-colors duration-300 ${
                          on ? "border-brand" : "border-gray-300"
                        }`}
                      >
                        {on && <span className="size-1.5 rounded-full bg-brand" />}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Writing & tasks */}
          <section className="mt-10">
            <SectionTitle title="Writing & tasks" />
            <div className="mt-3">
              <Row title="Note typeface" hint="The font used in the body of your notes.">
                <Select<Typeface>
                  label="Note typeface"
                  value={draft.typeface}
                  onChange={(v) => patch("typeface", v)}
                  options={[
                    { value: "sans", label: "Sans serif" },
                    { value: "serif", label: "Serif" },
                    { value: "mono", label: "Monospace" },
                  ]}
                />
              </Row>
              <Row title="Start the week on" hint="For your task calendar.">
                <Select<WeekStart>
                  label="Start the week on"
                  value={draft.weekStart}
                  onChange={(v) => patch("weekStart", v)}
                  options={[
                    { value: "monday", label: "Monday" },
                    { value: "sunday", label: "Sunday" },
                    { value: "saturday", label: "Saturday" },
                  ]}
                />
              </Row>
              <Row title="Show completed tasks" hint="Keep finished tasks in view.">
                <Switch
                  label="Show completed tasks"
                  checked={draft.showCompleted}
                  onChange={(v) => patch("showCompleted", v)}
                />
              </Row>
            </div>
          </section>

          {/* Notifications */}
          <section className="mt-10">
            <SectionTitle title="Notifications" hint="Just the reminders you want to make room for." />
            <div className="mt-3">
              <Row title="Task reminders" hint="In-app reminders for tasks with a due date.">
                <Switch
                  label="Task reminders"
                  checked={draft.taskReminders}
                  onChange={(v) => patch("taskReminders", v)}
                />
              </Row>
              <Row
                title="Email reminders"
                hint={email ? `Send task reminders to ${email}.` : "Send task reminders to your email."}
              >
                <Switch
                  label="Email reminders"
                  checked={draft.emailReminders}
                  onChange={(v) => patch("emailReminders", v)}
                />
              </Row>
            </div>
          </section>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
            <p aria-live="polite" className={`text-xs ${muted}`}>
              {saved
                ? "Saved. Your settings are up to date."
                : dirty
                  ? "You have unsaved changes."
                  : "Changes are saved when you're ready."}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={!dirty}
                onClick={() => setDraft(settings)}
                className="h-11 rounded-full border border-line px-6 text-sm text-ink transition-[background-color,opacity] duration-200 hover:bg-tint disabled:pointer-events-none disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!dirty}
                onClick={saveChanges}
                className="inline-flex h-11 min-w-[9.5rem] items-center justify-center gap-2 rounded-full bg-button px-6 text-sm font-medium text-white
                  transition-[background-color,transform,opacity] duration-200 hover:bg-button-hover active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
              >
                {saved && <Check size={16} />}
                {saved ? "Saved" : "Save changes"}
              </button>
            </div>
          </div>
        </div>

        {/* Side cards */}
        <aside
          className="flex flex-col gap-5 motion-safe:animate-fade-up lg:sticky lg:top-0 lg:self-start"
          style={{ animationDelay: "120ms" }}
        >
          <div className="rounded-2xl border border-line bg-panel p-6">
            <h2 className={`${display.className} text-xl font-normal text-ink`}>Account &amp; security</h2>
            <div className="mt-5 flex items-center gap-3">
              <Avatar name={name} imageUrl={user?.imageUrl} hasImage={Boolean(user?.hasImage)} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{name}</p>
                <p className={`text-xs ${muted}`}>Curator</p>
              </div>
            </div>
            {email && <p className={`mt-4 break-all text-xs ${muted}`}>{email}</p>}

            <div className="mt-5 flex flex-col items-start gap-3 border-t border-line pt-5">
              <Link
                href="/profile"
                className="group inline-flex h-10 items-center gap-2 rounded-full border border-line px-5 text-sm text-ink transition-[background-color,border-color] duration-200 hover:border-line-strong hover:bg-tint"
              >
                Edit profile
                <ArrowUpRight
                  size={14}
                  className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Link>
              <button
                type="button"
                onClick={() => openUserProfile()}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-5 text-sm text-ink transition-[background-color,border-color] duration-200 hover:border-line-strong hover:bg-tint"
              >
                <KeyRound size={14} />
                Change password
              </button>
              <button
                type="button"
                onClick={() => void signOut({ redirectUrl: "/" })}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-5 text-sm text-ink transition-[background-color,border-color] duration-200 hover:border-line-strong hover:bg-tint"
              >
                Sign out
                <LogOut size={14} />
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-tint p-6">
            <ShieldCheck size={18} className="text-brand" />
            <p className={`${display.className} mt-3 text-xl font-normal text-ink`}>Always in your hands.</p>
            <p className={`mt-3 text-sm leading-relaxed ${muted}`}>
              AI-proposed updates, archive actions, and deletions always need your review and confirmation
              before they&apos;re applied.
            </p>
            <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.18em] text-brand">
              Review &amp; confirm · always on
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-panel p-6">
            <h2 className="text-sm font-semibold text-ink">Delete account</h2>
            <p className={`mt-2 text-xs leading-relaxed ${muted}`}>
              Permanently remove your account. You&apos;ll review and confirm before anything is deleted.
            </p>

            {!confirmingDelete ? (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="mt-4 inline-flex h-10 items-center rounded-full border border-line px-5 text-sm text-ink transition-[background-color,border-color,color] duration-200 hover:border-red-500/50 hover:bg-tint hover:text-brand"
              >
                Delete account...
              </button>
            ) : (
              <div className="mt-4 space-y-3 motion-safe:animate-fade-up">
                <label htmlFor="delete-confirm" className="block text-xs text-ink">
                  Type <span className="font-mono font-semibold">DELETE</span> to confirm.
                </label>
                <input
                  id="delete-confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  autoComplete="off"
                  className="h-10 w-full rounded-xl border border-line bg-page px-4 font-mono text-sm text-ink outline-none transition-[border-color,box-shadow] duration-200 focus:border-brand focus:ring-4 focus:ring-brand/20"
                />
                {deleteError && (
                  <p role="alert" className="text-xs text-brand">
                    {deleteError}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmingDelete(false);
                      setConfirmText("");
                      setDeleteError(null);
                    }}
                    className="h-10 rounded-full border border-line px-5 text-sm text-ink transition-colors duration-200 hover:bg-tint"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={confirmText !== "DELETE" || deleting}
                    onClick={() => void deleteAccount()}
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-button px-5 text-sm font-medium text-white transition-[background-color,opacity] duration-200 hover:bg-button-hover disabled:pointer-events-none disabled:opacity-40"
                  >
                    {deleting && <Loader2 size={14} className="animate-spin" />}
                    Delete permanently
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}