"use client";

import { type ReactNode, Suspense } from "react";
import { usePathname } from "next/navigation";

import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // The note page has its own panels, so the app sidebar is hidden there
  const editor = /^\/notes\/[^/]+/.test(pathname);

  return (
    <div className="flex min-h-dvh flex-col md:h-dvh md:flex-row md:overflow-hidden">
      {!editor && <Sidebar />}
      <div className="flex min-w-0 flex-1 flex-col bg-red-50/40 md:overflow-hidden">
        <Suspense fallback={<div className="h-14 border-b border-red-100" />}>
          <TopBar standalone={editor} />
        </Suspense>
        <main
          className={
            editor
              ? "relative min-w-0 flex-1 md:min-h-0"
              : "min-w-0 flex-1 p-4 sm:p-6 md:overflow-y-auto"
          }
        >
          <Suspense fallback={null}>{children}</Suspense>
        </main>
      </div>
    </div>
  );
}