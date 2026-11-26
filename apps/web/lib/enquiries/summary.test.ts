import { describe, expect, it } from "vitest";
import { summariseInbox } from "./summary";

const enquiry = (
  overrides: Partial<Parameters<typeof summariseInbox>[0][0]>,
) => ({
  status: "PENDING" as const,
  triageResult: null,
  bookings: [],
  ...overrides,
});

describe("summariseInbox", () => {
  it("counts only confirmed bookings as viewings booked", () => {
    const summary = summariseInbox([
      enquiry({ status: "SCHEDULED", bookings: [{ status: "CONFIRMED" }] }),
      enquiry({ status: "SENT", bookings: [{ status: "CANCELLED" }] }),
      enquiry({
        status: "SCHEDULED",
        bookings: [{ status: "CANCELLED" }, { status: "CONFIRMED" }],
      }),
      enquiry({}),
    ]);
    expect(summary.viewingsBooked).toBe(2);
  });

  it("counts work awaiting a reply, excluding spam, and review flags", () => {
    const summary = summariseInbox([
      enquiry({ status: "PENDING" }),
      enquiry({
        status: "DRAFTED",
        triageResult: { intent: "VIEWING", needsReview: true },
      }),
      enquiry({
        status: "PENDING",
        triageResult: { intent: "SPAM", needsReview: false },
      }),
      enquiry({ status: "SENT" }),
    ]);
    expect(summary).toMatchObject({
      total: 4,
      awaitingReply: 2,
      needsReview: 1,
    });
  });
});
