import type { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";

import { AppShell } from "@/components/app-shell";
import { LandingPage } from "@/components/home-page-components/landing-page";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth();
  if (!userId) return <LandingPage />;
  return <AppShell>{children}</AppShell>;
}