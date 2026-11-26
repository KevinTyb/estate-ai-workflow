import { describe, expect, it } from "vitest";
import { computeMetrics, type MetricsInput } from "./metrics";

const t0 = new Date("2026-11-20T09:00:00Z");
const after = (minutes: number) => new Date(t0.getTime() + minutes * 60_000);

const empty: MetricsInput = {
  enquiries: [],
  draftsApproved: [],
  emailsSent: [],
  bookings: [],
};

describe("computeMetrics", () => {
  it("returns zeros and null rates for an empty inbox", () => {
    const metrics = computeMetrics(empty);
    expect(metrics.totals.enquiries).toBe(0);
    expect(metrics.rates.replyRate).toBeNull();
    expect(metrics.firstResponse).toEqual({
      count: 0,
      medianMinutes: null,
      averageMinutes: null,
    });
  });

  it("computes response times, conversion and rates from timestamps", () => {
    const metrics = computeMetrics({
      enquiries: [
        { id: "a", createdAt: t0, status: "SCHEDULED", intent: "VIEWING" },
        { id: "b", createdAt: t0, status: "SENT", intent: "VIEWING" },
        { id: "c", createdAt: t0, status: "SENT", intent: "MAINTENANCE" },
        { id: "d", createdAt: t0, status: "PENDING", intent: "SPAM" },
        { id: "e", createdAt: t0, status: "PENDING", intent: null },
      ],
      draftsApproved: [
        { enquiryId: "a", edited: false },
        { enquiryId: "b", edited: true },
        { enquiryId: "c", edited: false },
      ],
      emailsSent: [
        { enquiryId: "a", sentAt: after(30) },
        { enquiryId: "a", sentAt: after(500) }, // follow-up ignored
        { enquiryId: "b", sentAt: after(90) },
        { enquiryId: "c", sentAt: after(10) },
      ],
      bookings: [
        { enquiryId: "a", status: "CONFIRMED", createdAt: after(120) },
        { enquiryId: "b", status: "CANCELLED", createdAt: after(200) },
      ],
    });

    expect(metrics.totals).toEqual({
      enquiries: 5,
      triaged: 4,
      draftsApproved: 3,
      replied: 3,
      viewingsBooked: 1,
      bookingsCancelled: 1,
    });
    expect(metrics.firstResponse).toEqual({
      count: 3,
      medianMinutes: 30,
      averageMinutes: 43,
    });
    expect(metrics.timeToBooking.medianMinutes).toBe(160);
    expect(metrics.rates.triageCoverage).toBe(0.8);
    expect(metrics.rates.replyRate).toBe(3 / 4); // spam excluded
    expect(metrics.rates.viewingConversion).toBe(0.5); // cancelled ≠ booked
    expect(metrics.rates.draftsApprovedUnedited).toBe(2 / 3);
    expect(metrics.rates.respondedWithinHour).toBe(2 / 3);
    expect(metrics.byIntent).toMatchObject({ VIEWING: 2, UNTRIAGED: 1 });
    expect(metrics.byStatus).toMatchObject({
      PENDING: 2,
      SENT: 2,
      SCHEDULED: 1,
    });
  });
});
