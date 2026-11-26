import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AiFailure } from "@/lib/ai/client";
import { prisma } from "@/lib/prisma";
import { triageEnquiry } from "@/lib/triage/triageEnquiry";
import { createEnquiry, createProperty, resetDb } from "./fixtures";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe("triageEnquiry", () => {
  it("stores the result, links the property and records an event", async () => {
    const property = await createProperty("BST-12A");
    const enquiry = await createEnquiry({
      rawText: "Hi, can I book a viewing of BST-12A on Saturday?",
    });

    const result = await triageEnquiry(enquiry.id);

    expect(result?.triageResult.intent).toBe("VIEWING");
    expect(result?.propertyMatch).toMatchObject({
      propertyId: property.id,
      matchedBy: "ref",
    });
    expect(
      await prisma.enquiry.findUnique({ where: { id: enquiry.id } }),
    ).toMatchObject({
      intent: "VIEWING",
      propertyId: property.id,
      propertyRef: "BST-12A",
    });
    expect(
      await prisma.enquiryEvent.count({ where: { type: "TRIAGED" } }),
    ).toBe(1);
  });

  it("re-triaging updates rather than duplicates the result", async () => {
    const enquiry = await createEnquiry({ rawText: "The boiler is broken" });
    await triageEnquiry(enquiry.id);
    await triageEnquiry(enquiry.id);
    expect(await prisma.triageResult.count()).toBe(1);
  });

  it("never unlinks a property that was already set", async () => {
    const property = await createProperty();
    const enquiry = await createEnquiry({
      propertyId: property.id,
      rawText: "Any update on my application?",
    });
    await triageEnquiry(enquiry.id);
    expect(
      (await prisma.enquiry.findUnique({ where: { id: enquiry.id } }))
        ?.propertyId,
    ).toBe(property.id);
  });

  it("returns null for an unknown enquiry", async () => {
    expect(await triageEnquiry("missing")).toBeNull();
  });

  it("stores the fallback method and review flag when the AI engine fails", async () => {
    const enquiry = await createEnquiry({ rawText: "Hello, quick question" });
    const llm = vi.fn(async () => {
      throw new AiFailure("api_error", "timeout");
    });

    await triageEnquiry(enquiry.id, { llm });

    expect(llm).toHaveBeenCalledOnce();
    expect(
      await prisma.triageResult.findUnique({
        where: { enquiryId: enquiry.id },
      }),
    ).toMatchObject({
      method: "rules-fallback",
      needsReview: true,
      reviewReason: "Low confidence and the AI engine was unavailable",
    });
    const event = await prisma.enquiryEvent.findFirst({
      where: { type: "TRIAGED" },
    });
    expect(event?.metadata).toMatchObject({
      llm: { failure: "api_error: timeout" },
    });
  });
});
