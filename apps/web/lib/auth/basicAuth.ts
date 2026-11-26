export type DemoCredentials = { user: string; password: string };

type Env = Record<string, string | undefined>;

export type DemoAuthMode =
  | { kind: "open" }
  | { kind: "protected"; credentials: DemoCredentials }
  | { kind: "misconfigured"; reason: string };

/**
 * Decide how to guard the app. Protection is on when both DEMO_USER and
 * DEMO_PASSWORD are set. It fails closed: a half-configured pair is always
 * an error, and a production server with neither set refuses requests
 * unless ALLOW_PUBLIC_ACCESS=true says being public is intended.
 */
export function getDemoAuthMode(env: Env = process.env): DemoAuthMode {
  const user = env.DEMO_USER?.trim();
  const password = env.DEMO_PASSWORD;

  if (user && password) {
    return { kind: "protected", credentials: { user, password } };
  }
  if (user || password) {
    return {
      kind: "misconfigured",
      reason: "Set both DEMO_USER and DEMO_PASSWORD, or neither.",
    };
  }
  if (env.NODE_ENV === "production" && env.ALLOW_PUBLIC_ACCESS !== "true") {
    return {
      kind: "misconfigured",
      reason:
        "DEMO_USER and DEMO_PASSWORD are not set. Set them, or set ALLOW_PUBLIC_ACCESS=true to serve the app without a login.",
    };
  }
  return { kind: "open" };
}

/** Compare without exiting early, so timing does not reveal a prefix match. */
function safeEqual(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/** True when an `Authorization: Basic …` header matches the credentials. */
export function isAuthorised(
  header: string | null,
  credentials: DemoCredentials,
): boolean {
  if (!header?.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = atob(header.slice("Basic ".length).trim());
  } catch {
    return false;
  }
  const separator = decoded.indexOf(":");
  if (separator < 0) return false;
  const user = decoded.slice(0, separator);
  const password = decoded.slice(separator + 1);
  // Evaluate both so a wrong user takes as long as a wrong password.
  const userOk = safeEqual(user, credentials.user);
  const passwordOk = safeEqual(password, credentials.password);
  return userOk && passwordOk;
}
