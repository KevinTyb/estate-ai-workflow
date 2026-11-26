import { prisma } from "@/lib/prisma";
import { computeMetrics } from "./metrics";

export type MetricsRange = { since?: Date };

/** Load the rows analytics needs (optionally for enquiries since a date). */
export async function loadMetrics({ since }: MetricsRange = {}) {
  const enquiryWhere = since ? { createdAt: { gte: since } } : {};
  const relatedWhere = since ? { enquiry: { createdAt: { gte: since } } } : {};

  const [enquiries, draftsApproved, emailsSent, bookings] = await Promise.all([
    prisma.enquiry.findMany({
      where: enquiryWhere,
      select: {
        id: true,
        createdAt: true,
        status: true,
        triageResult: { select: { intent: true } },
      },
    }),
    prisma.draftReply.findMany({
      where: relatedWhere,
      select: { enquiryId: true, edited: true },
    }),
    prisma.outboundEmail.findMany({
      // Claims that are still sending, or failed, are not replies.
      where: { ...relatedWhere, status: "SENT" },
      select: { enquiryId: true, sentAt: true },
    }),
    prisma.booking.findMany({
      where: relatedWhere,
      select: { enquiryId: true, status: true, createdAt: true },
    }),
  ]);

  return computeMetrics({
    enquiries: enquiries.map((e) => ({
      id: e.id,
      createdAt: e.createdAt,
      status: e.status,
      intent: e.triageResult?.intent ?? null,
    })),
    draftsApproved,
    emailsSent,
    bookings,
  });
}
