"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Inbox" },
  { href: "/analytics", label: "Analytics" },
];

export function AppHeader({ aiStatus }: { aiStatus: string }) {
  const pathname = usePathname();
  return (
    <header className="border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 py-3">
        <Link href="/" className="text-sm font-semibold text-slate-900">
          Estate AI Workflow
        </Link>
        <div className="flex items-center gap-3">
          <span
            className="hidden rounded-full border border-slate-200 px-2.5 py-0.5 text-xs text-slate-600 sm:inline"
            title="Triage and drafting engine"
          >
            {aiStatus}
          </span>
          <nav aria-label="Main" className="flex gap-1">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    active && "bg-slate-100 font-medium text-slate-900",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
