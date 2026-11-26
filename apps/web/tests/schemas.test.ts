import { acceptDraftSchema, createEnquirySchema } from "@estate-ai/schema";
import { describe, expect, it } from "vitest";

describe("acceptDraftSchema", () => {
  it("trims and defaults optional fields", () => {
    expect(acceptDraftSchema.parse({ body: "  Hello  " })).toEqual({
      subject: null,
      body: "Hello",
      method: "template",
      edited: false,
    });
  });

  // Regression: an empty body used to come back as "Enquiry not found" (404).
  it("rejects an empty or missing body", () => {
    expect(acceptDraftSchema.safeParse({ body: "   " }).success).toBe(false);
    expect(acceptDraftSchema.safeParse({}).success).toBe(false);
    expect(acceptDraftSchema.safeParse(undefined).success).toBe(false);
  });

  it("rejects unknown draft methods", () => {
    expect(
      acceptDraftSchema.safeParse({ body: "Hi", method: "magic" }).success,
    ).toBe(false);
  });
});

describe("createEnquirySchema", () => {
  const valid = {
    contactName: "  Sam Carter ",
    email: "sam@example.com",
    rawText: "Can I view BST-12A on Friday?",
  };

  it("trims input, defaults the source and blanks empty optionals", () => {
    expect(createEnquirySchema.parse({ ...valid, phone: "  " })).toEqual({
      contactName: "Sam Carter",
      email: "sam@example.com",
      phone: null,
      source: "web",
      rawText: "Can I view BST-12A on Friday?",
    });
  });

  it("accepts a phone number instead of an email", () => {
    const result = createEnquirySchema.parse({
      ...valid,
      email: "",
      phone: "07700 900123",
      source: "phone",
    });
    expect(result.email).toBeNull();
    expect(result.phone).toBe("07700 900123");
  });

  it("rejects a missing contact method, bad email or empty message", () => {
    expect(createEnquirySchema.safeParse({ ...valid, email: "" }).success).toBe(
      false,
    );
    expect(
      createEnquirySchema.safeParse({ ...valid, email: "not-an-email" })
        .success,
    ).toBe(false);
    expect(
      createEnquirySchema.safeParse({ ...valid, rawText: " " }).success,
    ).toBe(false);
  });
});
