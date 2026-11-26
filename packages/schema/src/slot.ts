import { z } from "zod";

export const slotSchema = z.object({
  id: z.cuid().optional(),
  propertyId: z.cuid(),
  startsAt: z.coerce.date(),
  endAt: z.coerce.date(),
  isBooked: z.boolean().default(false),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export type Slot = z.infer<typeof slotSchema>;
