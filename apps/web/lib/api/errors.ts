/**
 * An expected failure in a workflow step (not found, conflict, invalid
 * state). Routes turn it into a JSON error with the given status and code
 * so the UI can show a precise message.
 */
export class WorkflowError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: 400 | 404 | 409 | 422 = 409,
  ) {
    super(message);
    this.name = "WorkflowError";
  }
}
