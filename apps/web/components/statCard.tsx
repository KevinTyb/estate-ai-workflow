import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

/** A single headline number with an optional icon and supporting line. */
export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon?: LucideIcon;
}) {
  return (
    <Card className="gap-0 px-5 py-4 shadow-xs">
      <div className="flex min-h-8 items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon ? (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="size-4" aria-hidden />
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums text-foreground">
        {value}
      </p>
      {detail ? (
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      ) : null}
    </Card>
  );
}
