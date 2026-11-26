/**
 * Pure helpers shared by the server and the inbox UI for reasoning about
 * a reply's send attempts. No database access here.
 */

/**
 * A SENDING claim older than this was interrupted (for example the server
 * died mid-send). The transport may or may not have accepted the message,
 * so it becomes UNKNOWN and is never retried without an agent confirming.
 * Well above the transport timeouts.
 */
export const STALE_CLAIM_MS = 5 * 60_000;

/** Is this SENDING claim old enough to count as interrupted? */
export function isStaleClaim(claimedAt: Date, now: Date = new Date()) {
  return now.getTime() - new Date(claimedAt).getTime() > STALE_CLAIM_MS;
}

/** One reply per approved draft version: re-approving yields a new key. */
export function replyIdempotencyKey(draft: {
  id: string;
  updatedAt: Date | string;
}) {
  return `reply:${draft.id}:${new Date(draft.updatedAt).getTime()}`;
}

/** Did an attempt end without us learning whether it was delivered? */
export function isOutcomeUnknown(
  claim: { status: string; claimedAt: Date } | null | undefined,
  now: Date = new Date(),
) {
  return (
    claim?.status === "UNKNOWN" ||
    (claim?.status === "SENDING" && isStaleClaim(claim.claimedAt, now))
  );
}
