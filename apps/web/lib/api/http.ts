import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    details === undefined ? { error: message } : { error: message, details },
    { status },
  );
}

export function validationError(error: ZodError) {
  return jsonError(
    error.issues[0]?.message ?? "Invalid request",
    400,
    error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  );
}

/** Parse a JSON body without throwing on malformed input. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
