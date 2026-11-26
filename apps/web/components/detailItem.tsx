type DetailItemProps = {
  label: string;
  value: string | null | undefined;
  emptyLabel?: string;
};

export function DetailItem({
  label,
  value,
  emptyLabel = "Not available",
}: DetailItemProps) {
  const hasValue = value != null && value !== "";
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm break-words text-foreground">
        {hasValue ? value : emptyLabel}
      </p>
    </div>
  );
}
