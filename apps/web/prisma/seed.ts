import { PrismaClient, EnquiryStatus, Intent } from "@prisma/client";

const prisma = new PrismaClient();

const samples = [
  {
    rawText: "Hi, can I view 12A Baker St this Friday?",
    source: "email",
    status: EnquiryStatus.PENDING,
    intent: Intent.VIEWING,
    contactName: "Sam Carter",
    email: "sam@example.com",
    propertyRef: "BST-12A",
  },
  {
    rawText: "Boiler making noises, need urgent help.",
    source: "web",
    status: EnquiryStatus.PENDING,
    intent: Intent.MAINTENANCE,
    contactName: "A. Khan",
    email: "akhan@example.com",
    propertyRef: "W12-33",
  },
  {
    rawText: "Interested in a valuation for my flat in Enfield.",
    source: "phone",
    status: EnquiryStatus.PENDING,
    intent: Intent.VALUATION,
    contactName: "Maria Lopez",
    email: "test@test.com",
  },
];

async function main() {
  await prisma.enquiry.deleteMany();

  await prisma.enquiry.createMany({ data: samples });
  console.log("✅ Seeded samples");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
