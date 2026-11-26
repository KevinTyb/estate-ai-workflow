"use client";

import { ChevronDownIcon } from "lucide-react";
import { ReactNode, useId, useState } from "react";
import { cn } from "@/lib/utils";

type DetailSectionProps = {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

/** A collapsible panel section; the whole header toggles it. */
export function DetailSection({
  title,
  defaultOpen = true,
  children,
}: DetailSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section className="rounded-xl border border-border bg-card shadow-xs">
      <h3>
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
          aria-controls={contentId}
          className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-foreground outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {title}
          <ChevronDownIcon
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180",
            )}
            aria-hidden
          />
        </button>
      </h3>

      <div
        id={contentId}
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden" inert={!isOpen}>
          <div className="px-4 pt-1 pb-4">{children}</div>
        </div>
      </div>
    </section>
  );
}
