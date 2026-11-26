/** Error thrown by apiFetch, carrying the server's message and code. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** fetch + JSON with the API's `{ error, code }` shape turned into ApiError. */
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body
      ? { "Content-Type": "application/json", ...init.headers }
      : init?.headers,
  });
  const data = (await res.json().catch(() => null)) as
    | (T & { error?: string; code?: string })
    | null;

  if (!res.ok) {
    throw new ApiError(
      data?.error ?? `Request failed (${res.status})`,
      res.status,
      data?.code,
    );
  }
  return data as T;
}
