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
  outboundEmails: {
    orderBy: { sentAt: "desc" },
    select: {
      id: true,
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
