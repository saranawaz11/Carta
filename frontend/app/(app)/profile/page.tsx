"use client";

import Link from "next/link";
import { Fraunces } from "next/font/google";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useUser } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { ArrowRight, Check, Loader2, Mail } from "lucide-react";

const display = Fraunces({ subsets: ["latin"], display: "swap", axes: ["opsz"] });

const BIO_MAX = 200;

type Form = { name: string; phone: string; bio: string };
const EMPTY: Form = { name: "", phone: "", bio: "" };

const asText = (value: unknown) => (typeof value === "string" ? value : "");

function errorMessage(cause: unknown) {
  if (isClerkAPIResponseError(cause)) {
    return cause.errors[0]?.longMessage ?? cause.errors[0]?.message ?? "Unable to save profile";
  }
  return cause instanceof Error ? cause.message : "Unable to save profile";
}

const field =
  "w-full rounded-xl border border-line bg-panel px-4 py-3 text-sm text-ink outline-none " +
  "transition-[border-color,box-shadow] duration-200 placeholder:text-gray-400 " +
  "focus:border-brand focus:ring-4 focus:ring-brand/20 read-only:cursor-not-allowed read-only:opacity-70";

const muted = "text-gray-500 dark:text-gray-400";

function Avatar({
  name,
  imageUrl,
  hasImage,
  className,
}: {
  name: string;
  imageUrl?: string;
  hasImage: boolean;
  className: string;
}) {
  if (hasImage && imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt="" className={`${className} rounded-full object-cover`} />;
  }
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={`${className} ${display.className} flex items-center justify-center rounded-full bg-red-100 text-red-800 dark:bg-white/10 dark:text-brand`}
    >
      {initial}
    </span>
  );
}

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const [form, setForm] = useState<Form>(EMPTY);
  const [initial, setInitial] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedFor = useRef<string | null>(null);

  // Fill the form once per signed-in user
  useEffect(() => {
    if (!isLoaded || !user || loadedFor.current === user.id) return;
    loadedFor.current = user.id;
    const next: Form = {
      name: user.fullName ?? "",
      phone: asText(user.unsafeMetadata.phone),
      bio: asText(user.unsafeMetadata.bio),
    };
    setForm(next);
    setInitial(next);
  }, [isLoaded, user]);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(timer);
  }, [saved]);

  const dirty =
    form.name.trim() !== initial.name ||
    form.phone.trim() !== initial.phone ||
    form.bio.trim() !== initial.bio;

  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
    setError(null);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!user || !dirty || saving) return;
    const name = form.name.trim();
    if (!name) {
      setError("Add a display name so we know what to call you.");
      return;
    }
    const [firstName, ...rest] = name.split(/\s+/);

    setSaving(true);
    setError(null);
    try {
      await user.update({
        firstName,
        lastName: rest.join(" "),
        unsafeMetadata: {
          ...user.unsafeMetadata,
          phone: form.phone.trim(),
          bio: form.bio.trim(),
        },
      });
      const next: Form = { name, phone: form.phone.trim(), bio: form.bio.trim() };
      setForm(next);
      setInitial(next);
      setSaved(true);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="mx-auto w-full max-w-5xl animate-pulse space-y-6" aria-label="Loading profile">
        <div className="h-10 w-56 rounded-full bg-red-100/60 dark:bg-white/10" />
        <div className="h-[28rem] rounded-3xl bg-red-100/60 dark:bg-white/10" />
      </div>
    );
  }

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const hasImage = Boolean(user?.hasImage);
  const displayName = form.name.trim() || "Your name";

  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="mb-10 motion-safe:animate-fade-up">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand">Make yourself at home</p>
        <h1 className={`${display.className} mt-4 text-4xl font-semibold tracking-tight text-ink sm:text-5xl`}>
          Your profile
        </h1>
        <p className={`mt-3 text-sm ${muted}`}>
          The person behind the pages. Keep your details feeling like you.
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form onSubmit={save} className="min-w-0 motion-safe:animate-fade-up" style={{ animationDelay: "60ms" }}>
          {/* Mark */}
          <div className="flex items-center gap-5 border-b border-line pb-8">
            <Avatar
              name={displayName}
              imageUrl={user?.imageUrl}
              hasImage={hasImage}
              className="size-16 shrink-0 text-2xl"
            />
            <div>
              <p className="text-sm font-medium text-ink">A little mark of you</p>
              <p className={`mt-1 text-xs ${muted}`}>
                {hasImage
                  ? "Your photo comes from your sign-in account."
                  : "Your initial comes from your display name."}
              </p>
            </div>
          </div>

          <h2 className={`${display.className} mt-8 text-2xl font-normal text-ink`}>Personal details</h2>

          <div className="mt-6 space-y-6">
            <div>
              <label htmlFor="profile-name" className="text-sm font-medium text-ink">
                Display name
              </label>
              <input
                id="profile-name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                autoComplete="name"
                maxLength={60}
                className={`${field} mt-2`}
              />
              <p className={`mt-2 text-xs ${muted}`}>How you&apos;ll appear in your Carta workspace.</p>
            </div>

            <div>
              <label htmlFor="profile-email" className="text-sm font-medium text-ink">
                Email address
              </label>
              <input
                id="profile-email"
                value={email}
                readOnly
                className={`${field} mt-2`}
              />
              <p className={`mt-2 text-xs ${muted}`}>
                Used to sign in. To change it, open Manage account from your account menu.
              </p>
            </div>

            <div>
              <label htmlFor="profile-phone" className="text-sm font-medium text-ink">
                Phone number <span className={`text-xs font-normal ${muted}`}>Optional</span>
              </label>
              <input
                id="profile-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                autoComplete="tel"
                maxLength={30}
                placeholder="Add a phone number"
                className={`${field} mt-2`}
              />
            </div>

            <div className="border-t border-line pt-6">
              <label htmlFor="profile-bio" className="text-sm font-medium text-ink">
                A little about you <span className={`text-xs font-normal ${muted}`}>Optional</span>
              </label>
              <textarea
                id="profile-bio"
                value={form.bio}
                onChange={(e) => update("bio", e.target.value.slice(0, BIO_MAX))}
                rows={4}
                maxLength={BIO_MAX}
                placeholder="Collecting small observations, bookshop ideas, and things worth remembering."
                className={`${field} mt-2 resize-none`}
              />
              <div className={`mt-2 flex items-center justify-between gap-3 text-xs ${muted}`}>
                <span>A short bio, if you&apos;d like one. There&apos;s no need to fill every space.</span>
                <span className="tabular-nums">
                  {form.bio.length}/{BIO_MAX}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <p
              role={error ? "alert" : undefined}
              aria-live="polite"
              className={`text-xs ${error ? "text-red-700 dark:text-brand" : muted}`}
            >
              {error ??
                (saved
                  ? "Saved. Your profile is up to date."
                  : dirty
                    ? "You have unsaved changes."
                    : "Make a change. Save when you're ready.")}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={!dirty || saving}
                onClick={() => {
                  setForm(initial);
                  setError(null);
                }}
                className="h-11 rounded-full border border-line px-6 text-sm text-ink transition-[background-color,opacity] duration-200 hover:bg-red-50 disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!dirty || saving}
                className="inline-flex h-11 min-w-[8.5rem] items-center justify-center gap-2 rounded-full bg-red-800 px-6 text-sm font-medium text-white
                  transition-[background-color,transform,opacity] duration-200 hover:bg-red-900 active:scale-[0.98]
                  disabled:pointer-events-none disabled:opacity-40 dark:bg-red-700 dark:hover:bg-red-600"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : saved ? (
                  <Check size={16} />
                ) : null}
                {saving ? "Saving..." : saved ? "Saved" : "Save profile"}
              </button>
            </div>
          </div>
        </form>

        {/* Side cards */}
        <aside
          className="flex flex-col gap-5 motion-safe:animate-fade-up lg:sticky lg:top-0 lg:self-start"
          style={{ animationDelay: "120ms" }}
        >
          <div className="rounded-2xl border border-line bg-panel p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand">At a glance</p>
            <Avatar
              name={displayName}
              imageUrl={user?.imageUrl}
              hasImage={hasImage}
              className="mt-4 size-14 text-xl"
            />
            <p className={`${display.className} mt-4 break-words text-3xl font-normal leading-tight text-ink`}>
              {displayName}
            </p>
            <p className="mt-1 text-xs font-medium text-brand">Curator</p>
            <div className="my-5 border-t border-line" />
            <p className={`text-sm leading-relaxed ${form.bio.trim() ? "text-ink" : muted}`}>
              {form.bio.trim() || "Add a line about yourself and it will show up here."}
            </p>
            {email && (
              <p className={`mt-5 flex items-center gap-2 break-all text-xs ${muted}`}>
                <Mail size={13} className="shrink-0" />
                {email}
              </p>
            )}
          </div>

          <div className="rounded-2xl bg-red-100/70 p-6 dark:bg-white/[0.06]">
            <p className={`${display.className} text-xl font-normal text-brand`}>Your space, your rhythm.</p>
            <p className={`mt-3 text-sm leading-relaxed ${muted}`}>
              Looking for appearance, reminders, or account security? You&apos;ll find those in Settings.
            </p>
            <Link
              href="/settings"
              className="group mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-panel px-5 text-sm font-medium text-ink shadow-sm
                transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              Go to Settings
              <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <p className={`text-xs ${muted}`}>A small introduction. Not the whole story.</p>
        </aside>
      </div>
    </div>
  );
}