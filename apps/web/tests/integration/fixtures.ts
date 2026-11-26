import { prisma } from "@/lib/prisma";

export async function resetDb() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE "EnquiryEvent", "OutboundEmail", "Booking", "DraftReply",
      "triageResult", "Enquiry", "Slot", "Property" RESTART IDENTITY CASCADE`);
}

const HOUR = 60 * 60 * 1000;

export async function createProperty(ref = "BST-12A") {
  return prisma.property.create({
    data: { ref, address: `${ref} Test Street, London`, postcode: "NW1 6XE" },
  });
}

export async function createSlot(propertyId: string, hoursFromNow = 24) {
  const startsAt = new Date(Date.now() + hoursFromNow * HOUR);
  return prisma.slot.create({
    data: {
      propertyId,
      startsAt,
      endAt: new Date(startsAt.getTime() + HOUR / 2),
    },
  });
}

export async function createEnquiry(
  data: Partial<{
    propertyId: string | null;
    email: string | null;
    rawText: string;
    createdAt: Date;
  }> = {},
) {
  return prisma.enquiry.create({
    data: {
      rawText: data.rawText ?? "Can I book a viewing?",
      source: "email",
      contactName: "Sam Carter",
      email: data.email === undefined ? "sam@example.com" : data.email,
      propertyId: data.propertyId ?? null,
      createdAt: data.createdAt,
    },
  });
}
