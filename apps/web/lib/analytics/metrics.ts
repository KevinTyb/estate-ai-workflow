import type { EnquiryStatus, Intent } from "@prisma/client";

export type MetricsInput = {
  enquiries: Array<{
    id: string;
    createdAt: Date;
    status: EnquiryStatus;
    /** Triage intent when triaged, otherwise null. */
    intent: Intent | null;
  }>;
  draftsApproved: Array<{ enquiryId: string; edited: boolean }>;
  emailsSent: Array<{ enquiryId: string; sentAt: Date }>;
  bookings: Array<{
    enquiryId: string;
    status: "CONFIRMED" | "CANCELLED";
    createdAt: Date;
  }>;
};

export type DurationStats = {
  count: number;
  medianMinutes: number | null;
  averageMinutes: number | null;
};

export type Metrics = {
  totals: {
    enquiries: number;
    triaged: number;
    draftsApproved: number;
    replied: number;
    viewingsBooked: number;
    bookingsCancelled: number;
  };
  rates: {
    /** Share of enquiries that have been triaged. */
    triageCoverage: number | null;
    /** Share of non-spam enquiries that received a reply. */
    replyRate: number | null;
    /** Share of viewing enquiries with a confirmed viewing. */
    viewingConversion: number | null;
    /** Share of approved drafts the agent sent without editing. */
    draftsApprovedUnedited: number | null;
    /** Share of replied enquiries answered within an hour. */
    respondedWithinHour: number | null;
  };
  firstResponse: DurationStats;
  timeToBooking: DurationStats;
  byIntent: Record<Intent | "UNTRIAGED", number>;
  byStatus: Record<EnquiryStatus, number>;
};

const MINUTE = 60_000;

const ratio = (part: number, whole: number) =>
  whole === 0 ? null : part / whole;

function durationStats(minutes: number[]): DurationStats {
  if (minutes.length === 0) {
    return { count: 0, medianMinutes: null, averageMinutes: null };
  }
  const sorted = [...minutes].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const average = sorted.reduce((sum, m) => sum + m, 0) / sorted.length;
  return {
    count: sorted.length,
    medianMinutes: Math.round(median),
    averageMinutes: Math.round(average),
  };
}

/** Earliest timestamp per enquiry. */
function firstBy<T extends { enquiryId: string }>(
  rows: T[],
  at: (row: T) => Date,
) {
  const first = new Map<string, Date>();
  for (const row of rows) {
    const time = at(row);
    const current = first.get(row.enquiryId);
    if (!current || time < current) first.set(row.enquiryId, time);
  }
  return first;
}

/**
 * Operational metrics computed purely from stored records and their
 * timestamps. Nothing here estimates "time saved": every number can be
 * traced back to rows in the database.
 */
export function computeMetrics(input: MetricsInput): Metrics {
  const { enquiries, draftsApproved, emailsSent, bookings } = input;

  const byIntent: Metrics["byIntent"] = {
    VIEWING: 0,
    VALUATION: 0,
    MAINTENANCE: 0,
    GENERAL: 0,
    SPAM: 0,
    UNTRIAGED: 0,
  };
  const byStatus: Metrics["byStatus"] = {
    PENDING: 0,
    DRAFTED: 0,
    SENT: 0,
    SCHEDULED: 0,
    CLOSED: 0,
  };
  for (const enquiry of enquiries) {
    byIntent[enquiry.intent ?? "UNTRIAGED"] += 1;
    byStatus[enquiry.status] += 1;
  }

  const createdAt = new Map(enquiries.map((e) => [e.id, e.createdAt]));
  const elapsedMinutes = (first: Map<string, Date>) =>
    [...first].flatMap(([enquiryId, at]) => {
      const start = createdAt.get(enquiryId);
      return start
        ? [Math.max(0, (at.getTime() - start.getTime()) / MINUTE)]
        : [];
    });

  const firstReply = firstBy(emailsSent, (e) => e.sentAt);
  const firstResponseMinutes = elapsedMinutes(firstReply);

  const confirmed = bookings.filter((b) => b.status === "CONFIRMED");
  const bookedEnquiries = new Set(confirmed.map((b) => b.enquiryId));
  const firstBooking = firstBy(bookings, (b) => b.createdAt);

  const viewingEnquiries = enquiries.filter((e) => e.intent === "VIEWING");
  const nonSpam = enquiries.filter((e) => e.intent !== "SPAM");
  const triaged = enquiries.length - byIntent.UNTRIAGED;

  return {
    totals: {
      enquiries: enquiries.length,
      triaged,
      draftsApproved: draftsApproved.length,
      replied: firstReply.size,
      viewingsBooked: confirmed.length,
      bookingsCancelled: bookings.length - confirmed.length,
    },
    rates: {
      triageCoverage: ratio(triaged, enquiries.length),
      replyRate: ratio(
        nonSpam.filter((e) => firstReply.has(e.id)).length,
        nonSpam.length,
      ),
      viewingConversion: ratio(
        viewingEnquiries.filter((e) => bookedEnquiries.has(e.id)).length,
        viewingEnquiries.length,
      ),
      draftsApprovedUnedited: ratio(
        draftsApproved.filter((d) => !d.edited).length,
        draftsApproved.length,
      ),
      respondedWithinHour: ratio(
        firstResponseMinutes.filter((m) => m <= 60).length,
        firstResponseMinutes.length,
      ),
    },
    firstResponse: durationStats(firstResponseMinutes),
    timeToBooking: durationStats(elapsedMinutes(firstBooking)),
    byIntent,
    byStatus,
  };
}
