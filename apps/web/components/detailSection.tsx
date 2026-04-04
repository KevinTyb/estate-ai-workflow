"use client";

import { ReactNode, useState } from "react";
import { Button } from "./ui/button";

type DetailSectionProps = {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function DetailSection({
  title,
  defaultOpen = true,
  children,
}: DetailSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between p-4">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen((current) => !current)}
        >
          {isOpen ? "Collapse" : "Expand"}
        </Button>
      </div>

      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4">{children}</div>
        </div>
      </div>
    </section>
  );
}
