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
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="text-sm text-slate-900">{hasValue ? value : emptyLabel}</p>
    </div>
  );
}
