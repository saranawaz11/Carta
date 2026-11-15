"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { UserButton, useClerk, useUser } from "@clerk/nextjs";
import {
  type ReactNode,
  type TouchEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  Folder,
  ArchiveRestore,
  CircleCheck,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sparkles,
  SquareText,
  Trash,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";

import { FoldersNav } from "@/components/folders-nav";
import { QuickCapture } from "@/components/quick-capture";
import logo from "@/public/assets/logo.png";

const STORAGE_KEY = "sidebar-collapsed";

const navItems = [
  { href: "/", label: "Notes", icon: SquareText },
  { href: "/tasks", label: "Tasks", icon: CircleCheck },
  { href: "/ask", label: "Ask Carta AI", icon: Sparkles, badge: "LLM" },
  { href: "/archive", label: "Archive", icon: ArchiveRestore },
  { href: "/deleted", label: "Trash", icon: Trash },
];

const footerItems = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/profile", label: "Profile", icon: UserRound },
];

// Clerk's account menu follows the theme tokens
const userButtonAppearance = {
  variables: {
    colorBackground: "var(--carta-surface)",
    colorText: "var(--carta-ink)",
    colorTextSecondary: "var(--carta-muted)",
    colorPrimary: "var(--carta-button)",
  },
};

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);
  return matches;
}

/**
 * Collapsing text wrapper. The outer span is clipped to 0 width when collapsed,
 * so any padding/spacing must live on the INNER element to disappear with it.
 */
function Label({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`block min-w-0 max-w-[200px] overflow-hidden whitespace-nowrap opacity-100
        transition-[max-width,opacity] duration-300 ease-out motion-reduce:transition-none
        md:group-data-[collapsed=true]/sidebar:max-w-0 md:group-data-[collapsed=true]/sidebar:opacity-0
        ${className}`}
    >
      {children}
    </span>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  badge,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-current={active ? "page" : undefined}
      className={`group/link flex h-11 items-center rounded-lg px-[14px] text-sm md:h-10
        transition-[background-color,color,transform] duration-200 ease-out motion-reduce:transition-none
        hover:bg-red-200/80 hover:text-red-700 dark:hover:bg-white/[0.07] dark:hover:text-brand md:hover:translate-x-0.5
        md:group-data-[collapsed=true]/sidebar:hover:translate-x-0
        ${active ? "bg-red-200 font-medium text-red-700 dark:bg-white/10 dark:text-brand" : "text-gray-600"}`}
    >
      <Icon
        size={20}
        className={`shrink-0 transition-colors duration-200 group-hover/link:text-red-600 dark:group-hover/link:text-brand ${
          active ? "text-red-600 dark:text-brand" : "text-black dark:text-ink"
        }`}
      />
      <Label>
        <span className="block pl-3">{label}</span>
      </Label>
      {badge && (
        <Label className="ml-auto">
          <span className="ml-2 block rounded-md bg-purple-200 px-2 py-0.5 text-xs font-semibold text-purple-900 dark:bg-purple-400/20 dark:text-purple-200">
            {badge}
          </span>
        </Label>
      )}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();

  const isDesktop = useMediaQuery("(min-width: 768px)");
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)");

  const [saved, setSaved] = useState<boolean | null>(null); // the user's own choice, if they made one
  const [mobileOpen, setMobileOpen] = useState(false); // mobile drawer

  // Tablets start as a slim rail; a saved choice always wins
  const collapsed = saved ?? isTablet;
  // The slim rail only exists on desktop widths; on mobile the drawer is always full
  const railed = collapsed && isDesktop;

  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const touchStartX = useRef<number | null>(null);

  // Read the saved choice before first paint so the sidebar doesn't jump
  useIsoLayoutEffect(() => {
    const value = localStorage.getItem(STORAGE_KEY);
    setSaved(value === null ? null : value === "true");
  }, []);

  // Close drawer on navigation and when the screen grows past the drawer layout
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (isDesktop) setMobileOpen(false);
  }, [isDesktop]);

  // Escape to close + lock body scroll while drawer is open
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Move focus into the drawer when it opens and back to the menu button when it closes
  useEffect(() => {
    if (mobileOpen) closeButton.current?.focus();
    else if (wasOpen.current) menuButton.current?.focus();
    wasOpen.current = mobileOpen;
  }, [mobileOpen]);

  function toggleCollapsed() {
    const next = !collapsed;
    setSaved(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  }

  function expandSidebar() {
    setSaved(false);
    localStorage.setItem(STORAGE_KEY, "false");
  }
  // Swipe left on the drawer to close it
  function onTouchStart(e: TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchMove(e: TouchEvent) {
    if (!mobileOpen || touchStartX.current === null) return;
    if (e.touches[0].clientX - touchStartX.current < -70) {
      setMobileOpen(false);
      touchStartX.current = null;
    }
  }

  async function handleSignOut() {
    await signOut({ redirectUrl: "/" });
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="flex md:shrink-0 scrollbar-hide">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex min-h-14 w-full shrink-0 items-center justify-between border-b border-line bg-sidenav-bar px-4 pt-[env(safe-area-inset-top)] md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <Image src={logo} alt="Carta Logo" width={30} height={30} />
          <span className="text-xl font-medium">Carta</span>
        </Link>
        <button
          ref={menuButton}
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          aria-controls="app-sidebar"
          className="flex size-11 items-center justify-center rounded-md text-gray-600 transition-colors duration-200 hover:bg-red-200 hover:text-red-700 dark:hover:bg-white/10 dark:hover:text-brand"
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
        id="app-sidebar"
        data-collapsed={collapsed}
        // Keep the off-screen drawer out of the tab order on small screens
        inert={!isDesktop && !mobileOpen}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        className={`group/sidebar scrollbar-hide fixed inset-y-0 left-0 z-50 flex h-dvh w-[280px] max-w-[85vw] flex-col justify-between
  overflow-y-auto overflow-x-hidden overscroll-contain border-r border-line bg-sidenav p-4
  pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]
  transition-[transform,width,padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none
  ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
  md:sticky md:top-0 md:z-auto md:w-[260px] md:max-w-none md:translate-x-0 md:shrink-0 md:overscroll-auto md:pt-4
  md:data-[collapsed=true]:w-[73px] md:data-[collapsed=true]:px-3
  [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
      >
        <div className="flex w-full flex-col gap-4">
          {/* Header */}
          <div
            className="mt-2 flex items-center justify-between px-2 py-2
              md:group-data-[collapsed=true]/sidebar:flex-col md:group-data-[collapsed=true]/sidebar:gap-4 md:group-data-[collapsed=true]/sidebar:px-0"
          >
            <Link
              href="/"
              className="flex items-center"
              aria-label="Carta home"
            >
              <Image
                src={logo}
                alt="Carta Logo"
                width={35}
                height={35}
                className="shrink-0"
              />
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
              className="hidden rounded-md p-1.5 text-gray-500 transition-colors duration-200 hover:bg-red-200 hover:text-red-700 dark:hover:bg-white/10 dark:hover:text-brand md:block"
            >
              {collapsed ? (
                <PanelLeftOpen size={20} />
              ) : (
                <PanelLeftClose size={20} />
              )}
            </button>

            {/* Mobile close */}
            <button
              ref={closeButton}
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="flex size-11 items-center justify-center rounded-md text-gray-500 transition-colors duration-200 hover:bg-red-200 hover:text-red-700 dark:hover:bg-white/10 dark:hover:text-brand md:hidden"
            >
              <X size={20} />
            </button>
          </div>

          {/* Nav */}
          <nav aria-label="Notes">
            <ul className="flex flex-col gap-1">
              {navItems.map((item) => (
                <li key={item.href}>
                  <NavItem {...item} active={isActive(item.href)} />
                </li>
              ))}
            </ul>
          </nav>

          {/*
            Line, then Quick Capture. Collapsing the rail folds this whole block away
            (height and fade), and `inert` keeps its fields out of the tab order while hidden.
          */}
          <div
            inert={railed}
            className="grid grid-rows-[1fr] opacity-100 transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none
              md:group-data-[collapsed=true]/sidebar:pointer-events-none md:group-data-[collapsed=true]/sidebar:grid-rows-[0fr] md:group-data-[collapsed=true]/sidebar:opacity-0"
          >
            <div className="min-h-0 overflow-hidden">
              <div className="border-t border-line pt-4">
                <QuickCapture />
              </div>
            </div>
          </div>
        </div>

        {/* Folders: full list when open, one icon when the rail is collapsed */}
        <div className="border-t border-line pt-3">
          {railed ? (
            <button
              type="button"
              onClick={expandSidebar}
              title="Folders"
              aria-label="Show folders"
              className="flex h-10 w-full items-center rounded-lg px-[14px] text-black transition-colors duration-200
        hover:bg-red-200/80 hover:text-red-700 dark:text-ink dark:hover:bg-white/[0.07] dark:hover:text-brand"
            >
              <Folder size={20} className="shrink-0" />
            </button>
          ) : (
            <FoldersNav />
          )}
        </div>

        {/* Line, then Settings, Profile and the user card */}
        <div className="mt-4 flex w-full flex-col gap-3">
          <div className="border-t border-line pt-3">
            <nav aria-label="Account">
              <ul className="flex flex-col gap-1">
                {footerItems.map((item) => (
                  <li key={item.href}>
                    <NavItem {...item} active={isActive(item.href)} />
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* User card */}
          <div
            className="mb-2 flex w-full items-center justify-between rounded-lg bg-panel px-3 py-2
              md:group-data-[collapsed=true]/sidebar:flex-col md:group-data-[collapsed=true]/sidebar:gap-1
              md:group-data-[collapsed=true]/sidebar:px-0 md:group-data-[collapsed=true]/sidebar:py-1.5"
          >
            <div className="flex min-w-0 items-center">
              <span className="flex shrink-0 items-center justify-center md:group-data-[collapsed=true]/sidebar:size-9">
                <UserButton appearance={userButtonAppearance} />
              </span>
              <Label>
                <span className="flex flex-col pl-2 text-sm">
                  <span className="truncate">
                    {user?.fullName ?? "Unknown User"}
                  </span>
                  <span className="text-xs text-gray-500">Curator</span>
                </span>
              </Label>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out"
              title="Sign out"
              className="flex size-9 items-center justify-center rounded-md text-gray-500 transition-colors duration-200 hover:bg-red-100 hover:text-red-600 dark:hover:text-brand"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
