import { prisma } from "@/lib/prisma";
import { GetNextAvailableSlots } from "@/lib/slots/getNextAvailableSlot";

async function main() {
  const property = await prisma.property.findFirst({
    where: {
      ref: "BST-12A",
    },
  });

  if (!property) {
    throw new Error("Property not found");
  }

  const slots = await GetNextAvailableSlots({
    propertyId: property.id,
    limit: 5,
  });

  console.log("Property:", property.ref, property.address);
  console.dir(slots, { depth: null });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
