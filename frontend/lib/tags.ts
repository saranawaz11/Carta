"use client";

import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";

import { apiFetch } from "@/lib/api";

const tagsKey = "/api/tags";

export function useTags() {
  const { getToken } = useAuth();
  return useSWR<string[]>(tagsKey, (path: string) =>
    apiFetch<string[]>(path, getToken),
  );
}
