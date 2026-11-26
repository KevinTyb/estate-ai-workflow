import { acceptDraftSchema } from "@estate-ai/schema";
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
