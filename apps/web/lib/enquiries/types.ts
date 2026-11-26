import type { Prisma } from "@prisma/client";

/** Relations the inbox loads for each enquiry. */
export const inboxEnquiryInclude = {
  triageResult: true,
  draftReply: true,
  property: { select: { id: true, ref: true, address: true } },
  bookings: {
    where: { status: "CONFIRMED" },
    include: { slot: { select: { id: true, startsAt: true, endAt: true } } },
    take: 1,
  },
  // SENT replies for the history, plus any attempt still open so the UI
  // can show an interrupted send. FAILED attempts are left out.
  outboundEmails: {
    where: { status: { in: ["SENT", "SENDING", "UNKNOWN"] } },
    orderBy: { sentAt: "desc" },
    select: {
      id: true,
      status: true,
      claimedAt: true,
      idempotencyKey: true,
      toEmail: true,
      subject: true,
      sentAt: true,
      transport: true,
    },
  },
} satisfies Prisma.EnquiryInclude;

export type InboxEnquiry = Prisma.EnquiryGetPayload<{
  include: typeof inboxEnquiryInclude;
}>;
