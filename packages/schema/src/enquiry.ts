import { z } from "zod";

export const enquiryStatusSchema = z.enum([
  "PENDING",
  "DRAFTED",
  "SENT",
  "SCHEDULED",
  "CLOSED",
]);

export const intentSchema = z.enum([
  "VIEWING",
  "VALUATION",
  "MAINTENANCE",
  "GENERAL",
  "SPAM",
]);

export const enquirySchema = z.object({
  id: z.string().cuid().optional(),
  rawText: z.string().min(1),
  source: z.enum(["email", "web", "phone"]),
  status: enquiryStatusSchema.default("PENDING"),
  intent: intentSchema.nullable().optional(),
  contactName: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  propertyRef: z.string().nullable().optional(),
  propertyId: z.string().cuid().nullable().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export type Enquiry = z.infer<typeof enquirySchema>;
export type EnquiryStatus = z.infer<typeof enquiryStatusSchema>;
export type Intent = z.infer<typeof intentSchema>;
