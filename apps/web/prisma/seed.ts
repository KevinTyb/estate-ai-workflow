import { EnquiryStatus, Intent, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clear data in relation-safe order
  await prisma.slot.deleteMany();
  await prisma.triageResult.deleteMany();
  await prisma.enquiry.deleteMany();
  await prisma.property.deleteMany();

  // Create properties
  await prisma.property.createMany({
    data: [
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
    ],
  });

  // Fetch created properties so we can map ref -> id
  const propertyList = await prisma.property.findMany({
    orderBy: { ref: "asc" },
  });

  const byRef = new Map(
    propertyList.map((property) => [property.ref, property]),
  );

  // Create slots
  const now = new Date();

  function daysFromNow(days: number, hour: number, minute = 0) {
    const date = new Date(now);
    date.setDate(date.getDate() + days);
    date.setHours(hour, minute, 0, 0);
    return date;
  }

  await prisma.slot.createMany({
    data: [
      {
        propertyId: byRef.get("BST-12A")!.id,
        startsAt: daysFromNow(1, 10),
        endAt: daysFromNow(1, 10, 30),
        isBooked: false,
      },
      {
        propertyId: byRef.get("BST-12A")!.id,
        startsAt: daysFromNow(2, 14),
        endAt: daysFromNow(2, 14, 30),
        isBooked: false,
      },
      {
        propertyId: byRef.get("W12-33")!.id,
        startsAt: daysFromNow(1, 11),
        endAt: daysFromNow(1, 11, 30),
        isBooked: false,
      },
      {
        propertyId: byRef.get("W12-33")!.id,
        startsAt: daysFromNow(3, 16),
        endAt: daysFromNow(3, 16, 30),
        isBooked: false,
      },
      {
        propertyId: byRef.get("ENF-88")!.id,
        startsAt: daysFromNow(2, 9),
        endAt: daysFromNow(2, 9, 30),
        isBooked: false,
      },
      {
        propertyId: byRef.get("ENF-88")!.id,
        startsAt: daysFromNow(4, 15),
        endAt: daysFromNow(4, 15, 30),
        isBooked: false,
      },
      {
        propertyId: byRef.get("CLP-07")!.id,
        startsAt: daysFromNow(1, 13),
        endAt: daysFromNow(1, 13, 30),
        isBooked: false,
      },
      {
        propertyId: byRef.get("ISL-19")!.id,
        startsAt: daysFromNow(5, 12),
        endAt: daysFromNow(5, 12, 30),
        isBooked: false,
      },
    ],
  });

  // Create enquiries linked to properties
  await prisma.enquiry.createMany({
    data: [
      {
        rawText: "Hi, can I view 12A Baker St this Friday?",
        source: "email",
        status: EnquiryStatus.PENDING,
        intent: Intent.VIEWING,
        contactName: "Sam Carter",
        email: "sam@example.com",
        propertyRef: "BST-12A",
        propertyId: byRef.get("BST-12A")!.id,
      },
      {
        rawText: "Boiler making noises, need urgent help.",
        source: "web",
        status: EnquiryStatus.PENDING,
        intent: Intent.MAINTENANCE,
        contactName: "A. Khan",
        email: "akhan@example.com",
        propertyRef: "W12-33",
        propertyId: byRef.get("W12-33")!.id,
      },
      {
        rawText: "Interested in a valuation for my flat in Enfield.",
        source: "phone",
        status: EnquiryStatus.PENDING,
        intent: Intent.VALUATION,
        contactName: "Maria Lopez",
        email: "test@test.com",
      },
      {
        rawText: "Can I view CLP-07 this Saturday? My budget is £2200pcm.",
        source: "web",
        status: EnquiryStatus.PENDING,
        intent: Intent.GENERAL,
        contactName: "Daniel Price",
        email: "daniel@example.com",
        propertyRef: "CLP-07",
        propertyId: byRef.get("CLP-07")!.id,
      },
    ],
  });

  console.log("✅ Seeded properties, slots, and enquiries");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
