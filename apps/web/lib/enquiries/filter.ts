import type { EnquiryStatus, Intent } from "@prisma/client";

export type InboxFilter = {
  query: string;
  status: EnquiryStatus | "ALL";
  intent: Intent | "UNTRIAGED" | "ALL";
  needsReviewOnly: boolean;
};

export const EMPTY_FILTER: InboxFilter = {
  query: "",
  status: "ALL",
  intent: "ALL",
  needsReviewOnly: false,
};

type FilterableEnquiry = {
  rawText: string;
  contactName: string | null;
  email: string | null;
  propertyRef: string | null;
  status: EnquiryStatus;
  property?: { ref: string; address: string } | null;
  triageResult?: { intent: Intent | null; needsReview: boolean } | null;
};

export function isFilterActive(filter: InboxFilter) {
  return (
    filter.query.trim() !== "" ||
    filter.status !== "ALL" ||
    filter.intent !== "ALL" ||
    filter.needsReviewOnly
  );
}

/** Case-insensitive search across contact, message and property fields. */
export function filterEnquiries<T extends FilterableEnquiry>(
  enquiries: T[],
  filter: InboxFilter,
): T[] {
  const query = filter.query.trim().toLowerCase();

  return enquiries.filter((enquiry) => {
    if (filter.status !== "ALL" && enquiry.status !== filter.status) {
      return false;
    }

    const intent = enquiry.triageResult?.intent ?? null;
    if (filter.intent === "UNTRIAGED" && enquiry.triageResult) return false;
    if (
      filter.intent !== "ALL" &&
      filter.intent !== "UNTRIAGED" &&
      intent !== filter.intent
    ) {
      return false;
    }

    if (filter.needsReviewOnly && !enquiry.triageResult?.needsReview) {
      return false;
    }

    if (!query) return true;
    return [
      enquiry.contactName,
      enquiry.email,
      enquiry.rawText,
      enquiry.propertyRef,
      enquiry.property?.ref,
      enquiry.property?.address,
    ].some((field) => field?.toLowerCase().includes(query));
  });
}
