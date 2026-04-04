import { generateDraft } from "@/lib/drafting/generateDraft";
import { prisma } from "@/lib/prisma";
import { GetNextAvailableSlots } from "@/lib/slots/getNextAvailableSlot";

async function main() {
  const enquiry = await prisma.enquiry.findFirst({
    where: {
      propertyRef: "BST-12A",
    },
    include: {
      triageResult: true,
      property: true,
    },
  });

  if (!enquiry) {
    throw new Error("Enquiry not found");
  }

  const slots = enquiry.propertyId
    ? await GetNextAvailableSlots({
        propertyId: enquiry.propertyId,
        limit: 3,
      })
    : [];
  const draft = generateDraft({
    enquiry: {
      contactName: enquiry.contactName,
      rawText: enquiry.rawText,
      propertyRef: enquiry.propertyRef,
    },

    triageResult: enquiry.triageResult
      ? {
          intent: enquiry.triageResult.intent,
          entities: enquiry.triageResult.entities,
        }
      : null,
    property: enquiry.property
      ? {
          ref: enquiry.property.ref,
          address: enquiry.property.address,
        }
      : null,
    slots,
  });

  console.dir(draft, { depth: null });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
