import { z } from "zod";

export const bookingSchema = z.object({
  enquiryId: z.cuid(),
  slotId: z.cuid(),
  notes: z.string().optional(),
});

export type Booking = z.infer<typeof bookingSchema>;
