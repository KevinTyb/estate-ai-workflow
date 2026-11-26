import {
  EnquiryStatus,
  EventType,
  Prisma,
  PrismaClient,
  type Property,
  type Slot,
} from "@prisma/client";
import { checkSeedTarget } from "../lib/db/seedGuard";
import { generateDraft } from "../lib/drafting/generateDraft";
import { runRuleBasedTriage } from "../lib/triage";
import { REVIEW_BELOW } from "../lib/triage/hybrid";

const prisma = new PrismaClient();

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const now = new Date();
const ago = (ms: number) => new Date(now.getTime() - ms);
const after = (date: Date, ms: number) => new Date(date.getTime() + ms);

/** A 30-minute slot `days` from today at the given hour (server time). */
function slotAt(days: number, hour: number) {
  const startsAt = new Date(now);
  startsAt.setDate(startsAt.getDate() + days);
  startsAt.setHours(hour, 0, 0, 0);
  return { startsAt, endAt: after(startsAt, 30 * MINUTE) };
}

const PROPERTIES = [
  {
    ref: "BST-12A",
    address: "12A Baker Street, London",
    postcode: "NW1 6XE",
    bedrooms: 2,
    rentPcm: 1700,
  },
  {
    ref: "W12-33",
    address: "33 Wood Lane, London",
    postcode: "W12 7DT",
    bedrooms: 1,
    rentPcm: 1550,
  },
  {
    ref: "ENF-88",
    address: "88 Green Lanes, Enfield",
    postcode: "EN1 2RR",
    bedrooms: 2,
    rentPcm: 1800,
  },
  {
    ref: "CLP-07",
    address: "7 Clapton Common, London",
    postcode: "E5 9AA",
    bedrooms: 3,
    rentPcm: 2200,
  },
  {
    ref: "ISL-19",
    address: "19 Upper Street, Islington, London",
    postcode: "N1 0PQ",
    bedrooms: 1,
    rentPcm: 1950,
  },
  {
    ref: "HAC-04",
    address: "4 Mare Street, Hackney, London",
    postcode: "E8 4RP",
    bedrooms: 2,
    rentPcm: 2050,
  },
];

/** [property ref, days from today, hour]. Negative days are past viewings. */
const SLOTS: Array<[string, number, number]> = [
  ["BST-12A", -6, 11],
  ["BST-12A", 1, 10],
  ["BST-12A", 2, 14],
  ["W12-33", -13, 17],
  ["W12-33", 1, 11],
  ["W12-33", 3, 16],
  ["ENF-88", 2, 9],
  ["ENF-88", 4, 15],
  ["CLP-07", -9, 12],
  ["CLP-07", 1, 13],
  ["CLP-07", 3, 10],
  ["ISL-19", 2, 17],
  ["ISL-19", 5, 12],
  ["HAC-04", 3, 11],
];

type DemoEnquiry = {
  contactName: string;
  email: string;
  phone?: string;
  source: "email" | "web" | "phone";
  rawText: string;
  propertyRef?: string;
  receivedAgo: number;
  /** How far the enquiry got through the workflow. */
  stage: "new" | "triaged" | "drafted" | "sent" | "booked" | "cancelled";
  /** Minutes from receipt to the reply being sent. */
  replyAfterMinutes?: number;
  /** Minutes from receipt to the viewing being booked. */
  bookAfterMinutes?: number;
  /** Index into the property's slots (by start time) to book. */
  slotIndex?: number;
  edited?: boolean;
};

const ENQUIRIES: DemoEnquiry[] = [
  // Fresh enquiries waiting for triage.
  {
    contactName: "Sam Carter",
    email: "sam.carter@example.com",
    source: "email",
    rawText: "Hi, can I view 12A Baker St this Friday?",
    propertyRef: "BST-12A",
    receivedAgo: 40 * MINUTE,
    stage: "new",
  },
  {
    contactName: "A. Khan",
    email: "a.khan@example.com",
    source: "web",
    rawText: "Boiler making noises at 33 Wood Lane, need urgent help.",
    propertyRef: "W12-33",
    receivedAgo: 2 * HOUR,
    stage: "new",
  },
  {
    contactName: "Maria Lopez",
    email: "maria.lopez@example.com",
    phone: "07700 900123",
    source: "phone",
    rawText:
      "Interested in a valuation for my flat in Enfield. Call me on 07700 900123.",
    receivedAgo: 3 * HOUR,
    stage: "new",
  },
  {
    contactName: "Daniel Price",
    email: "daniel.price@example.com",
    source: "web",
    rawText: "Can I view CLP-07 this Saturday? My budget is £2200pcm.",
    propertyRef: "CLP-07",
    receivedAgo: 5 * HOUR,
    stage: "new",
  },

  // Triaged, still with the agent.
  {
    contactName: "Ben Okafor",
    email: "ben.okafor@example.com",
    source: "email",
    rawText: "Quick question, do you allow pets in any of your places?",
    receivedAgo: 1 * DAY,
    stage: "triaged",
  },
  {
    contactName: "Priya Shah",
    email: "priya.shah@example.com",
    source: "web",
    rawText:
      "Is ISL-19 still available? I'd love to arrange a viewing this week.",
    propertyRef: "ISL-19",
    receivedAgo: 7 * HOUR,
    stage: "drafted",
  },
  {
    contactName: "Unknown sender",
    email: "promo@seo-boost.example",
    source: "email",
    rawText:
      "Boost your SEO rankings today! Click here for a free trial, limited offer.",
    receivedAgo: 1 * DAY + 4 * HOUR,
    stage: "triaged",
  },

  // Replied.
  {
    contactName: "Tom Reed",
    email: "tom.reed@example.com",
    source: "email",
    rawText: "Hi, the kitchen tap at 33 Wood Lane is leaking under the sink.",
    propertyRef: "W12-33",
    receivedAgo: 2 * DAY,
    stage: "sent",
    replyAfterMinutes: 25,
  },
  {
    contactName: "Hannah Lee",
    email: "hannah.lee@example.com",
    source: "web",
    rawText:
      "I'm thinking of selling my 3 bed in Hackney. Could you do a valuation?",
    receivedAgo: 6 * DAY,
    stage: "sent",
    replyAfterMinutes: 130,
    edited: true,
  },
  {
    contactName: "Grace Kim",
    email: "grace.kim@example.com",
    source: "phone",
    rawText:
      "No hot water since this morning at 19 Upper Street, can someone come out?",
    propertyRef: "ISL-19",
    receivedAgo: 20 * DAY,
    stage: "sent",
    replyAfterMinutes: 18,
    edited: true,
  },

  // Viewings booked.
  {
    contactName: "Olivia Grant",
    email: "olivia.grant@example.com",
    source: "email",
    rawText: "Hello, could I book a viewing of ENF-88 please?",
    propertyRef: "ENF-88",
    receivedAgo: 3 * DAY,
    stage: "booked",
    replyAfterMinutes: 40,
    bookAfterMinutes: 26 * 60,
    slotIndex: 0,
  },
  {
    contactName: "James Wu",
    email: "james.wu@example.com",
    source: "web",
    rawText: "Can I view 12A Baker Street? Budget around £1700 pcm.",
    propertyRef: "BST-12A",
    receivedAgo: 9 * DAY,
    stage: "booked",
    replyAfterMinutes: 55,
    bookAfterMinutes: 5 * 60,
    slotIndex: 0,
  },
  {
    contactName: "Mohammed Ali",
    email: "mohammed.ali@example.com",
    source: "email",
    rawText: "I'd like to arrange a viewing of 33 Wood Lane please.",
    propertyRef: "W12-33",
    receivedAgo: 16 * DAY,
    stage: "booked",
    replyAfterMinutes: 12,
    bookAfterMinutes: 3 * 60,
    slotIndex: 0,
  },
  {
    contactName: "Chloe Martin",
    email: "chloe.martin@example.com",
    source: "web",
    rawText: "Could I view CLP-07 next week? Looking for a family home.",
    propertyRef: "CLP-07",
    receivedAgo: 12 * DAY,
    stage: "cancelled",
    replyAfterMinutes: 75,
    bookAfterMinutes: 8 * 60,
    slotIndex: 0,
  },
];

const STAGE_ORDER = ["new", "triaged", "drafted", "sent", "booked"] as const;
const reached = (stage: DemoEnquiry["stage"], target: string) =>
  STAGE_ORDER.indexOf(stage === "cancelled" ? "booked" : stage) >=
  STAGE_ORDER.indexOf(target as (typeof STAGE_ORDER)[number]);

function statusFor(item: DemoEnquiry, isSpam: boolean): EnquiryStatus {
  if (isSpam) return EnquiryStatus.CLOSED;
  switch (item.stage) {
    case "booked":
      return EnquiryStatus.SCHEDULED;
    case "sent":
    case "cancelled":
      return EnquiryStatus.SENT;
    case "drafted":
      return EnquiryStatus.DRAFTED;
    default:
      return EnquiryStatus.PENDING;
  }
}

async function seedEnquiry(
  item: DemoEnquiry,
  properties: Map<string, Property>,
  slotsByProperty: Map<string, Slot[]>,
) {
  const receivedAt = ago(item.receivedAgo);
  const property = item.propertyRef ? properties.get(item.propertyRef) : null;
  const triage = runRuleBasedTriage(item.rawText);
  const triaged = item.stage !== "new";
  const isSpam = triaged && triage.intent === "SPAM";

  const enquiry = await prisma.enquiry.create({
    data: {
      rawText: item.rawText,
      source: item.source,
      contactName: item.contactName,
      email: item.email,
      phone: item.phone,
      status: statusFor(item, isSpam),
      intent: triaged ? triage.intent : null,
      propertyRef: property?.ref ?? null,
      propertyId: property?.id ?? null,
      createdAt: receivedAt,
    },
  });
  if (!triaged) return;

  const events: Prisma.EnquiryEventCreateManyInput[] = [];
  const event = (type: EventType, at: Date, metadata: object = {}) =>
    events.push({
      enquiryId: enquiry.id,
      type,
      createdAt: at,
      metadata: metadata as Prisma.InputJsonObject,
    });

  const triagedAt = after(receivedAt, 2 * MINUTE);
  const needsReview = triage.confidence < REVIEW_BELOW;
  await prisma.triageResult.create({
    data: {
      enquiryId: enquiry.id,
      intent: triage.intent,
      confidence: triage.confidence,
      entities: triage.entities,
      method: "rules",
      needsReview,
      reviewReason: needsReview
        ? "Low confidence: check the intent before replying."
        : null,
      createdAt: triagedAt,
    },
  });
  event(EventType.TRIAGED, triagedAt, {
    intent: triage.intent,
    confidence: triage.confidence,
    method: "rules",
    needsReview,
    propertyMatchedBy: property ? "ref" : null,
  });

  if (!reached(item.stage, "drafted") || isSpam) {
    await prisma.enquiryEvent.createMany({ data: events });
    return;
  }

  // Suggest the property's upcoming slots, as the app does.
  const propertySlots = property
    ? (slotsByProperty.get(property.id) ?? [])
    : [];
  const draft = generateDraft({
    enquiry: {
      contactName: item.contactName,
      rawText: item.rawText,
      propertyRef: property?.ref ?? null,
    },
    triageResult: { intent: triage.intent, entities: triage.entities },
    property,
    slots: propertySlots
      .filter((slot) => slot.startsAt > receivedAt)
      .slice(0, 3),
  });
  const draftedAt = after(receivedAt, 3 * MINUTE);
  const body = item.edited
    ? `${draft.body}\n\nP.S. I'll call you today to follow up.`
    : (draft.body ?? "");
  const subject = draft.subject ?? "Re: your enquiry";

  await prisma.draftReply.create({
    data: {
      enquiryId: enquiry.id,
      subject,
      body,
      method: "template",
      edited: !!item.edited,
      createdAt: draftedAt,
    },
  });
  event(EventType.DRAFT_GENERATED, draftedAt, { method: "template" });

  if (!reached(item.stage, "sent") || item.replyAfterMinutes == null) {
    await prisma.enquiryEvent.createMany({ data: events });
    return;
  }

  const sentAt = after(receivedAt, item.replyAfterMinutes * MINUTE);
  event(EventType.DRAFT_APPROVED, after(sentAt, -MINUTE), {
    edited: !!item.edited,
  });
  await prisma.outboundEmail.create({
    data: {
      enquiryId: enquiry.id,
      toEmail: item.email,
      subject,
      body,
      transport: "outbox",
      sentAt,
    },
  });
  event(EventType.EMAIL_SENT, sentAt, { transport: "outbox" });

  if (item.bookAfterMinutes != null && property && item.slotIndex != null) {
    const slot = propertySlots[item.slotIndex];
    const bookedAt = after(receivedAt, item.bookAfterMinutes * MINUTE);
    const cancelled = item.stage === "cancelled";
    const cancelledAt = cancelled ? after(bookedAt, DAY) : null;

    const booking = await prisma.booking.create({
      data: {
        enquiryId: enquiry.id,
        slotId: slot.id,
        status: cancelled ? "CANCELLED" : "CONFIRMED",
        activeSlotId: cancelled ? null : slot.id,
        cancelledAt,
        createdAt: bookedAt,
      },
    });
    if (!cancelled) {
      await prisma.slot.update({
        where: { id: slot.id },
        data: { isBooked: true },
      });
    }
    event(EventType.VIEWING_BOOKED, bookedAt, {
      bookingId: booking.id,
      slotId: slot.id,
    });
    if (cancelledAt) {
      event(EventType.BOOKING_CANCELLED, cancelledAt, {
        bookingId: booking.id,
      });
    }
  }

  await prisma.enquiryEvent.createMany({ data: events });
}

async function main() {
  const refusal = checkSeedTarget();
  if (refusal) {
    console.error(refusal);
    process.exitCode = 1;
    return;
  }

  // Clear data in relation-safe order. Deleting enquiries cascades to their
  // triage results, drafts, bookings, sent emails and events; slots can only
  // go once no booking references them.
  await prisma.enquiry.deleteMany();
  await prisma.slot.deleteMany();
  await prisma.property.deleteMany();

  await prisma.property.createMany({ data: PROPERTIES });
  const properties = new Map(
    (await prisma.property.findMany()).map((p) => [p.ref, p]),
  );

  await prisma.slot.createMany({
    data: SLOTS.map(([ref, days, hour]) => ({
      propertyId: properties.get(ref)!.id,
      ...slotAt(days, hour),
    })),
  });
  const slotsByProperty = new Map<string, Slot[]>();
  for (const slot of await prisma.slot.findMany({
    orderBy: { startsAt: "asc" },
  })) {
    slotsByProperty.set(slot.propertyId, [
      ...(slotsByProperty.get(slot.propertyId) ?? []),
      slot,
    ]);
  }

  for (const item of ENQUIRIES) {
    await seedEnquiry(item, properties, slotsByProperty);
  }

  console.log(
    `Seeded ${PROPERTIES.length} properties, ${SLOTS.length} slots and ${ENQUIRIES.length} enquiries with workflow history`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
