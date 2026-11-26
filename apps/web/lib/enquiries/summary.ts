import type { EnquiryStatus, Intent } from "@prisma/client";

type SummaryEnquiry = {
  status: EnquiryStatus;
  triageResult: { intent: Intent | null; needsReview: boolean } | null;
  bookings: Array<{ status: "CONFIRMED" | "CANCELLED" }>;
};

/** Headline counts for the inbox summary cards. */
export function summariseInbox(enquiries: SummaryEnquiry[]) {
  return {
    total: enquiries.length,
    awaitingReply: enquiries.filter(
      (e) =>
        (e.status === "PENDING" || e.status === "DRAFTED") &&
        e.triageResult?.intent !== "SPAM",
    ).length,
    needsReview: enquiries.filter((e) => e.triageResult?.needsReview).length,
    // Checked explicitly rather than relying on the query's filter, so a
    // cancelled booking can never be counted as a booked viewing.
    viewingsBooked: enquiries.filter((e) =>
      e.bookings.some((b) => b.status === "CONFIRMED"),
    ).length,
  };
}
