import { z } from "zod";

export const bookingSchema = z.object({
  enquiryId: z.string().cuid(),
  slotId: z.string().cuid(),
  notes: z.string().optional(),
});

export type Booking = z.infer<typeof bookingSchema>;
