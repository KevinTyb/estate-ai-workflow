export function sourceLabel(source: string) {
  return source.charAt(0).toUpperCase() + source.slice(1).toLowerCase();
}

export function formatConfidence(confidence: number | null | undefined) {
  if (confidence == null) return null;
  return `${Math.round(confidence * 100)}% confidence`;
}

export function getEntityPills(entities: unknown): string[] {
  if (!entities || typeof entities !== "object") return [];

  const record = entities as Record<string, unknown>;
  const pills: string[] = [];

  if (typeof record.propertyRef === "string" && record.propertyRef) {
    pills.push(record.propertyRef);
  }

  if (typeof record.budgetPcm === "number") {
    pills.push(`£${record.budgetPcm} pcm`);
  }

  if (typeof record.email === "string" && record.email) {
    pills.push(record.email);
  }

  if (typeof record.phone === "string" && record.phone) {
    pills.push(record.phone);
  }

  if (Array.isArray(record.dates)) {
    for (const date of record.dates) {
      if (typeof date === "string" && date) {
        pills.push(date);
      }
    }
  }

  return pills;
}

export function getEntityEntries(
  entities: unknown,
): Array<{ key: string; value: string }> {
  if (!entities || typeof entities !== "object") return [];

  const record = entities as Record<string, unknown>;
  const entries: Array<{ key: string; value: string }> = [];

  for (const [key, value] of Object.entries(record)) {
    if (value == null) continue;

    if (Array.isArray(value)) {
      const cleaned = value.filter(Boolean).map(String);
      if (cleaned.length > 0) {
        entries.push({
          key,
          value: cleaned.join(", "),
        });
      }
      continue;
    }

    if (typeof value === "number" && key === "budgetPcm") {
      entries.push({
        key,
        value: `£${value} pcm`,
      });
      continue;
    }

    if (typeof value === "string" || typeof value === "number") {
      entries.push({
        key,
        value: String(value),
      });
    }
  }

  return entries;
}
