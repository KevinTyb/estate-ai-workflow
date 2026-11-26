import type { Prisma } from "@prisma/client";

/** Relations the inbox loads for each enquiry. */
export const inboxEnquiryInclude = {
  triageResult: true,
  draftReply: true,
  property: { select: { id: true, ref: true, address: true } },
} satisfies Prisma.EnquiryInclude;

export type InboxEnquiry = Prisma.EnquiryGetPayload<{
  include: typeof inboxEnquiryInclude;
}>;
