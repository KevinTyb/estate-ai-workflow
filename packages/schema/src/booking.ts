import { z } from "zod";

export const bookingStatusSchema = z.enum(["CONFIRMED", "CANCELLED"]);

/** Payload an agent submits to confirm a viewing for an enquiry. */
export const createBookingSchema = z.object({
  slotId: z.cuid("Choose a viewing slot"),
  notes: z.string().trim().max(500).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type BookingStatus = z.infer<typeof bookingStatusSchema>;
