"use client";

import { useCallback, useEffect, useState } from "react";

export type Typeface = "sans" | "serif" | "mono";
export type WeekStart = "monday" | "sunday" | "saturday";

export type Settings = {
  typeface: Typeface;
  weekStart: WeekStart;
  showCompleted: boolean;
  taskReminders: boolean;
  emailReminders: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  typeface: "sans",
  weekStart: "monday",
  showCompleted: false,
  taskReminders: true,
  emailReminders: false,
};

const KEY = "carta-settings";
const EVENT = "carta:settings";

function read(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setSettings(read());
    sync();
    setReady(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const save = useCallback((next: Settings) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable: keep the in-memory value */
    }
    setSettings(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { settings, save, ready };
}