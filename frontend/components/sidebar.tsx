"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { UserButton, useClerk, useUser } from "@clerk/nextjs";
import { type ReactNode, useEffect, useState } from "react";
import {
  ArchiveRestore,
  CircleCheck,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Sparkles,
  SquareText,
  Trash,
  X,
} from "lucide-react";

import { QuickCapture } from "@/components/quick-capture";
import { Button } from "@/components/ui/button";
import { useNoteActions } from "@/lib/notes";
import logo from "@/public/assets/logo.png";

const STORAGE_KEY = "sidebar-collapsed";

const navItems = [
  { href: "/", label: "Notes", icon: SquareText },
  { href: "/tasks", label: "Tasks", icon: CircleCheck },
  { href: "/ask", label: "Ask Carta AI", icon: Sparkles, badge: "LLM" },
  { href: "/archive", label: "Archive", icon: ArchiveRestore },
  { href: "/deleted", label: "Trash", icon: Trash },
];

/**
 * Collapsing text wrapper. The outer span is clipped to 0 width when collapsed,
 * so any padding/spacing must live on the INNER element to disappear with it.
 */
function Label({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`block max-w-[200px] overflow-hidden whitespace-nowrap opacity-100
        transition-[max-width,opacity] duration-300 ease-out
        md:group-data-[collapsed=true]/sidebar:max-w-0 md:group-data-[collapsed=true]/sidebar:opacity-0
        ${className}`}
    >
      {children}
    </span>
  );
}

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { createNote } = useNoteActions();
  const { user } = useUser();
  const { signOut } = useClerk();

  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false); // desktop only
  const [mobileOpen, setMobileOpen] = useState(false); // mobile drawer

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  // Close drawer on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Escape to close + lock body scroll while drawer is open
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  }

  async function handleCreateNote() {
    setError(null);
    try {
      const note = await createNote();
      router.push(`/notes/${note.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create note");
    }
  }

  async function handleSignOut() {
    await signOut({ redirectUrl: "/sign-in" });
  }

  return (
    <div className="flex">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b bg-red-100 px-4 md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <Image src={logo} alt="Carta Logo" width={30} height={30} />
          <span className="text-xl font-medium">Carta</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="rounded-md p-2 text-gray-600 transition-colors duration-200 hover:bg-red-200 hover:text-red-700"
        >
          <Menu size={22} />
        </button>
      </header>

      {/* Mobile overlay */}
      <div
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 md:hidden
          ${mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />

      <aside
        data-collapsed={collapsed}
        className={`group/sidebar fixed inset-y-0 left-0 z-50 flex h-dvh w-[280px] max-w-[85vw] flex-col justify-between
          overflow-y-auto overflow-x-hidden border-r border-red-200 bg-red-100 p-4
          transition-[transform,width,padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          md:static md:z-auto md:w-[260px] md:max-w-none md:translate-x-0 md:shrink-0
          md:data-[collapsed=true]:w-[72px] md:data-[collapsed=true]:px-3`}
      >
        <div className="flex w-full flex-col gap-4">
          {/* Header */}
          <div
            className="mt-2 flex items-center justify-between px-2 py-2
              md:group-data-[collapsed=true]/sidebar:flex-col md:group-data-[collapsed=true]/sidebar:gap-4 md:group-data-[collapsed=true]/sidebar:px-0"
          >
            <Link href="/" className="flex items-center" aria-label="Carta home">
              <Image src={logo} alt="Carta Logo" width={35} height={35} className="shrink-0" />
              <Label>
                <span className="block pl-2 text-2xl font-medium">Carta</span>
              </Label>
            </Link>

            {/* Desktop collapse toggle */}
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              className="hidden rounded-md p-1.5 text-gray-500 transition-colors duration-200 hover:bg-red-200 hover:text-red-700 md:block"
            >
              {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>

            {/* Mobile close */}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="rounded-md p-1.5 text-gray-500 transition-colors duration-200 hover:bg-red-200 hover:text-red-700 md:hidden"
            >
              <X size={20} />
            </button>
          </div>

          <div className="md:group-data-[collapsed=true]/sidebar:hidden">
            <QuickCapture />
          </div>

          {/* Icon always sits 14px from the left edge → centered in the 48px collapsed width */}
          <Button
            type="button"
            onClick={handleCreateNote}
            title="Create Note"
            className="h-10 w-full px-[10px] bg-black text-white hover:bg-gray-800"
          >
            <Plus size={20} className="shrink-0" />
            <Label>
              <span className="block">Create Note</span>
            </Label>
          </Button>

          {/* Nav */}
          <nav aria-label="Notes">
            <ul className="flex flex-col gap-1 pt-2">
              {navItems.map(({ href, label, icon: Icon, badge }) => {
                const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      title={label}
                      aria-current={active ? "page" : undefined}
                      className={`group/link flex h-10 items-center rounded-lg px-[14px] text-sm
                        transition-[background-color,color,transform] duration-200 ease-out
                        hover:bg-red-200/80 hover:text-red-700 md:hover:translate-x-0.5
                        md:group-data-[collapsed=true]/sidebar:hover:translate-x-0
                        ${active ? "bg-red-200 font-medium text-red-700" : "text-gray-600"}`}
                    >
                      <Icon
                        size={20}
                        className={`shrink-0 transition-colors duration-200 group-hover/link:text-red-600 ${
                          active ? "text-red-600" : "text-black"
                        }`}
                      />
                      <Label>
                        <span className="block pl-3">{label}</span>
                      </Label>
                      {badge && (
                        <Label className="ml-auto">
                          <span className="ml-2 block rounded-md bg-purple-200 px-2 py-0.5 text-xs font-semibold text-purple-900">
                            {badge}
                          </span>
                        </Label>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        </div>

        {/* User card */}
        <div
          className="mb-2 mt-4 flex w-full items-center justify-between rounded-lg bg-white px-3 py-2
            md:group-data-[collapsed=true]/sidebar:flex-col md:group-data-[collapsed=true]/sidebar:gap-2 md:group-data-[collapsed=true]/sidebar:px-0"
        >
          <div className="flex min-w-0 items-center">
            <UserButton />
            <Label>
              <span className="flex flex-col pl-2 text-sm">
                <span className="truncate">{user?.fullName ?? "Unknown User"}</span>
                <span className="text-xs text-gray-500">Curator</span>
              </span>
            </Label>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="rounded-md p-1.5 text-gray-500 transition-colors duration-200 hover:bg-red-100 hover:text-red-600"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
    </div>
  );
}