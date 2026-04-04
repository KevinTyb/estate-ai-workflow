import { prisma } from "../prisma";

export type SuggestedSlot = {
  id: string;
  propertyId: string;
  startsAt: Date;
  endAt: Date;
};

type GetNextAvailableSlotsArg = {
  propertyId: string;
  limit?: number;
};

export async function GetNextAvailableSlots({
  propertyId,
  limit = 5,
}: GetNextAvailableSlotsArg): Promise<SuggestedSlot[]> {
  const now = new Date();

  const slots = await prisma.slot.findMany({
    where: {
      propertyId,
      isBooked: false,
      startsAt: {
        gt: now,
      },
    },
    orderBy: {
      startsAt: "asc",
    },
    take: limit,
    select: {
      id: true,
      propertyId: true,
      startsAt: true,
      endAt: true,
    },
  });

  return slots;
}
