"use client";

import { Building2Icon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./themeToggle";

const LINKS = [
  { href: "/", label: "Inbox" },
  { href: "/analytics", label: "Analytics" },
];

export function AppHeader({
  aiStatus,
  aiEnabled,
}: {
  aiStatus: string;
  aiEnabled: boolean;
}) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 sm:px-6">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground"
          >
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand text-brand-foreground shadow-sm">
              <Building2Icon className="size-4" aria-hidden />
            </span>
            <span className="hidden sm:inline">Estate AI Workflow</span>
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
                    "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
                    active && "bg-muted font-medium text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="hidden items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground md:inline-flex"
            title="Triage and drafting engine"
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                aiEnabled ? "bg-emerald-500" : "bg-muted-foreground/50",
              )}
              aria-hidden
            />
            {aiStatus}
          </span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
