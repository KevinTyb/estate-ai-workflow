export type DemoCredentials = { user: string; password: string };

/** Demo protection is on only when both variables are set. */
export function getDemoCredentials(
  env: Record<string, string | undefined> = process.env,
): DemoCredentials | null {
  const user = env.DEMO_USER;
  const password = env.DEMO_PASSWORD;
  return user && password ? { user, password } : null;
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
