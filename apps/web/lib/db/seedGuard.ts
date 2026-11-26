const LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "db",
  "postgres",
]);

export type SeedTarget = { host: string; database: string };

/** Host and database name from a Postgres connection string. */
export function parseDatabaseUrl(url: string | undefined): SeedTarget | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!/^postgres(ql)?:$/.test(parsed.protocol)) return null;
    const host = parsed.hostname.replace(/^\[|\]$/g, "");
    const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
    return host && database ? { host, database } : null;
  } catch {
    return null;
  }
}

/**
 * The seed deletes every enquiry, slot and property. Allow it only against
 * a local database, or a remote one whose name is repeated in
 * SEED_CONFIRM_DATABASE, so a mistyped or production DATABASE_URL can
 * never be wiped by accident. Returns an error message, or null if allowed.
 */
export function checkSeedTarget(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const target = parseDatabaseUrl(env.DATABASE_URL);
  if (!target) {
    return "DATABASE_URL is missing or is not a Postgres connection string.";
  }
  if (LOCAL_HOSTS.has(target.host)) return null;
  if (env.SEED_CONFIRM_DATABASE === target.database) return null;
  return [
    `Refusing to seed "${target.database}" on ${target.host}: seeding deletes all enquiries, slots and properties.`,
    `If this is a demo database, run again with SEED_CONFIRM_DATABASE=${target.database}.`,
  ].join("\n");
}
