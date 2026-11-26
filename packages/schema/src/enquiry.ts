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
  id: z.cuid().optional(),
  rawText: z.string().min(1),
  source: z.enum(["email", "web", "phone"]),
  status: enquiryStatusSchema.default("PENDING"),
  intent: intentSchema.nullable().optional(),
  contactName: z.string().nullable().optional(),
  email: z.email().nullable().optional(),
  phone: z.string().nullable().optional(),
  propertyRef: z.string().nullable().optional(),
  propertyId: z.cuid().nullable().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export type Enquiry = z.infer<typeof enquirySchema>;
export type EnquiryStatus = z.infer<typeof enquiryStatusSchema>;
export type Intent = z.infer<typeof intentSchema>;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => value || null);

/** A new enquiry submitted through the intake form or API. */
export const createEnquirySchema = z
  .object({
    contactName: z.string().trim().min(1, "Enter the contact's name").max(120),
    email: z
      .union([z.literal(""), z.email("Enter a valid email address")])
      .optional()
      .nullable()
      .transform((value) => value || null),
    phone: optionalText(40),
    source: z.enum(["email", "web", "phone"]).default("web"),
    rawText: z
      .string()
      .trim()
      .min(5, "Enter the enquiry message")
      .max(5000, "Keep the message under 5,000 characters"),
  })
  .refine((value) => value.email || value.phone, {
    message: "Enter an email address or phone number",
    path: ["email"],
  });

export type CreateEnquiry = z.infer<typeof createEnquirySchema>;
