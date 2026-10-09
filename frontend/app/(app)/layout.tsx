import { type ReactNode, Suspense } from "react";

import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col md:h-dvh md:flex-row md:overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col bg-red-50/40 md:overflow-hidden">
        <Suspense fallback={<div className="h-14 border-b border-red-100" />}>
          <TopBar />
        </Suspense>
        <main className="min-w-0 flex-1 p-4 sm:p-6 md:overflow-y-auto">
          <Suspense fallback={null}>{children}</Suspense>
        </main>
      </div>
    </div>
  );
}