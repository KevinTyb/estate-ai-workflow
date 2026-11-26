import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import { WorkflowError } from "./errors";

export function jsonError(
  message: string,
  status: number,
  extra?: { code?: string; details?: unknown },
) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function validationError(error: ZodError) {
  return jsonError(error.issues[0]?.message ?? "Invalid request", 400, {
    code: "VALIDATION_FAILED",
    details: error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  });
}

/** Parse a JSON body without throwing on malformed input. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

/** Map a thrown error to a response: workflow errors keep their status. */
export function errorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof WorkflowError) {
    return jsonError(error.message, error.status, {
      code: error.code,
      ...(error.details ? { details: error.details } : {}),
    });
  }
  console.error(fallbackMessage, error);
  return jsonError(fallbackMessage, 500);
}
