"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";

function placeholderFor(pathname: string) {
  if (pathname.startsWith("/archive")) return "Search archive";
  if (pathname.startsWith("/deleted")) return "Search trash";
  return "Search notes";
}

export function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const urlQuery = params.get("q") ?? "";
  const [value, setValue] = useState(urlQuery);

  // Sync the input when the URL changes (e.g. navigating to another route clears q)
  useEffect(() => setValue(urlQuery), [urlQuery]);

  // Debounced write to the URL
  useEffect(() => {
    if (value === urlQuery) return;
    const timer = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set("q", value);
      else next.delete("q");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 250);
    return () => clearTimeout(timer);
  }, [value, urlQuery, params, pathname, router]);

  return (
    <div className="sticky top-14 z-20 flex h-14 shrink-0 items-center border-b border-red-100 bg-white/80 px-4 backdrop-blur sm:px-6 md:static">
      <label className="group relative block w-full max-w-xl">
        <span className="sr-only">{placeholderFor(pathname)}</span>
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors duration-200 group-focus-within:text-red-500"
        />
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholderFor(pathname)}
          className="h-10 w-full rounded-full border border-red-100 bg-red-50/60 pl-10 pr-10 text-sm outline-none
            transition-[background-color,border-color,box-shadow] duration-200
            placeholder:text-gray-400 focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-100
            [&::-webkit-search-cancel-button]:hidden"
        />
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Clear search"
          tabIndex={value ? 0 : -1}
          className={`absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 transition-all duration-200 hover:bg-red-100 hover:text-red-600
            ${value ? "scale-100 opacity-100" : "pointer-events-none scale-75 opacity-0"}`}
        >
          <X size={14} />
        </button>
      </label>
    </div>
  );
}