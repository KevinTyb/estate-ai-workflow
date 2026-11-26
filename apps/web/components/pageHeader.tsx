import type { ReactNode } from "react";

/** Page title, description and optional actions aligned to the right. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      {actions ? (
        <div className="shrink-0 self-start sm:self-auto">{actions}</div>
      ) : null}
    </div>
  );
}
