import { describe, expect, it } from "vitest";
import {
  isOutcomeUnknown,
  replyIdempotencyKey,
  STALE_CLAIM_MS,
} from "./sendState";

describe("isOutcomeUnknown", () => {
  const claimedAt = new Date("2026-01-01T10:00:00Z");
  const later = new Date(claimedAt.getTime() + STALE_CLAIM_MS + 1);

  it("treats a recent SENDING claim as still in flight", () => {
    expect(isOutcomeUnknown({ status: "SENDING", claimedAt }, claimedAt)).toBe(
      false,
    );
  });

  it("treats a stale SENDING claim and an UNKNOWN one as unknown", () => {
    expect(isOutcomeUnknown({ status: "SENDING", claimedAt }, later)).toBe(
      true,
    );
    expect(isOutcomeUnknown({ status: "UNKNOWN", claimedAt }, claimedAt)).toBe(
      true,
    );
  });

  it("ignores finished attempts and missing claims", () => {
    expect(isOutcomeUnknown({ status: "SENT", claimedAt }, later)).toBe(false);
    expect(isOutcomeUnknown({ status: "FAILED", claimedAt }, later)).toBe(
      false,
    );
    expect(isOutcomeUnknown(null, later)).toBe(false);
  });
});

describe("replyIdempotencyKey", () => {
  it("matches for a Date and its serialised form", () => {
    const updatedAt = new Date("2026-01-01T10:00:00Z");
    expect(replyIdempotencyKey({ id: "d1", updatedAt })).toBe(
      replyIdempotencyKey({ id: "d1", updatedAt: updatedAt.toISOString() }),
    );
  });
});
