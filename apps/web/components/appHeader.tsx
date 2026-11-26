"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Inbox" },
  { href: "/analytics", label: "Analytics" },
];

export function AppHeader() {
  const pathname = usePathname();
  return (
    <header className="border-b border-slate-200 bg-white px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 py-3">
        <Link href="/" className="text-sm font-semibold text-slate-900">
          Estate AI Workflow
        </Link>
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
    </header>
  );
}
