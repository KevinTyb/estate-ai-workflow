import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AiFailure } from "@/lib/ai/client";
import { sendApprovedReply } from "@/lib/email/sendReply";
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

  describe("an already approved draft", () => {
    const outbox = {
      name: "outbox" as const,
      send: async () => ({ messageId: null }),
    };

    async function triagedWithDraft(rawText: string, propertyId?: string) {
      const enquiry = await createEnquiry({ rawText, propertyId });
      await triageEnquiry(enquiry.id, { llm: null });
      return prisma.draftReply.create({
        data: { enquiryId: enquiry.id, body: "Hi Sam", method: "template" },
      });
    }

    const retriageAs = async (enquiryId: string, rawText: string) => {
      await prisma.enquiry.update({
        where: { id: enquiryId },
        data: { rawText },
      });
      await triageEnquiry(enquiryId, { llm: null });
      return prisma.draftReply.findUniqueOrThrow({ where: { enquiryId } });
    };

    it("is flagged and cannot be sent when the intent changes", async () => {
      const draft = await triagedWithDraft("The boiler is broken, please help");

      const after = await retriageAs(
        draft.enquiryId,
        "Can I book a viewing this Saturday?",
      );

      expect(after.staleReason).toBe(
        "Re-triage: intent changed from maintenance to viewing.",
      );
      // The approval version, and so the send key, is unchanged.
      expect(after.updatedAt).toEqual(draft.updatedAt);
      await expect(
        sendApprovedReply(draft.enquiryId, { transport: outbox }),
      ).rejects.toMatchObject({ code: "DRAFT_NEEDS_REAPPROVAL" });
      expect(
        await prisma.enquiryEvent.findFirst({
          where: { type: "TRIAGED" },
          orderBy: { createdAt: "desc" },
        }),
      ).toMatchObject({ metadata: { draftFlagged: true } });
    });

    it("is flagged when re-triage links a different property", async () => {
      const original = await createProperty("BST-12A");
      await createProperty("W12-33");
      const draft = await triagedWithDraft(
        "Can I book a viewing of BST-12A?",
        original.id,
      );

      const after = await retriageAs(
        draft.enquiryId,
        "Sorry, I meant a viewing of W12-33",
      );

      expect(after.staleReason).toBe(
        "Re-triage: property changed from BST-12A to W12-33.",
      );
    });

    it("is left alone when the intent and property are unchanged", async () => {
      const draft = await triagedWithDraft("The boiler is broken, please help");
      const after = await retriageAs(
        draft.enquiryId,
        "The boiler is still broken, please help",
      );
      expect(after.staleReason).toBeNull();
    });

    it("is not flagged once it has been sent", async () => {
      const draft = await triagedWithDraft("The boiler is broken, please help");
      await sendApprovedReply(draft.enquiryId, { transport: outbox });

      const after = await retriageAs(
        draft.enquiryId,
        "Can I book a viewing this Saturday?",
      );
      expect(after.staleReason).toBeNull();
    });
  });
});
