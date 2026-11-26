import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkflowError } from "@/lib/api/errors";
import { bookSlot } from "@/lib/bookings/bookings";
import { sendApprovedReply } from "@/lib/email/sendReply";
import type { EmailTransport } from "@/lib/email/transport";
import { prisma } from "@/lib/prisma";
import { createEnquiry, createProperty, createSlot, resetDb } from "./fixtures";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

function fakeTransport(): EmailTransport & { send: ReturnType<typeof vi.fn> } {
  return { name: "outbox", send: vi.fn(async () => ({ messageId: null })) };
}

async function approveDraft(enquiryId: string, body = "Hi Sam, thanks!") {
  await prisma.draftReply.create({
    data: { enquiryId, subject: "Your enquiry", body, method: "template" },
  });
}

async function codeOf(promise: Promise<unknown>) {
  return promise.then(
    () => null,
    (error: WorkflowError) => error.code,
  );
}

describe("sendApprovedReply", () => {
  it("sends the approved draft, marks the enquiry SENT and logs the event", async () => {
    const enquiry = await createEnquiry();
    await approveDraft(enquiry.id);
    const transport = fakeTransport();

    const email = await sendApprovedReply(enquiry.id, transport);

    expect(transport.send).toHaveBeenCalledWith({
      to: "sam@example.com",
      subject: "Your enquiry",
      body: "Hi Sam, thanks!",
    });
    expect(email).toMatchObject({
      toEmail: "sam@example.com",
      transport: "outbox",
    });
    expect(
      await prisma.enquiry.findUnique({ where: { id: enquiry.id } }),
    ).toMatchObject({ status: "SENT" });
    expect(
      await prisma.enquiryEvent.count({ where: { type: "EMAIL_SENT" } }),
    ).toBe(1);
  });

  it("refuses to send without an approved draft or a recipient", async () => {
    const noDraft = await createEnquiry();
    expect(await codeOf(sendApprovedReply(noDraft.id, fakeTransport()))).toBe(
      "DRAFT_NOT_APPROVED",
    );

    const noEmail = await createEnquiry({ email: null });
    await approveDraft(noEmail.id);
    expect(await codeOf(sendApprovedReply(noEmail.id, fakeTransport()))).toBe(
      "NO_RECIPIENT",
    );
    expect(await prisma.outboundEmail.count()).toBe(0);
  });

  it("does not send the same approved draft twice", async () => {
    const enquiry = await createEnquiry();
    await approveDraft(enquiry.id);
    const transport = fakeTransport();

    await sendApprovedReply(enquiry.id, transport);
    expect(await codeOf(sendApprovedReply(enquiry.id, transport))).toBe(
      "ALREADY_SENT",
    );
    expect(transport.send).toHaveBeenCalledTimes(1);
  });

  it("keeps a scheduled enquiry SCHEDULED after sending", async () => {
    const property = await createProperty();
    const slot = await createSlot(property.id);
    const enquiry = await createEnquiry({ propertyId: property.id });
    await approveDraft(enquiry.id);
    await bookSlot({ enquiryId: enquiry.id, slotId: slot.id });

    await sendApprovedReply(enquiry.id, fakeTransport());
    expect(
      await prisma.enquiry.findUnique({ where: { id: enquiry.id } }),
    ).toMatchObject({ status: "SCHEDULED" });
  });

  it("records nothing when the transport fails", async () => {
    const enquiry = await createEnquiry();
    await approveDraft(enquiry.id);
    const transport = fakeTransport();
    transport.send.mockRejectedValueOnce(new Error("SMTP down"));

    await expect(sendApprovedReply(enquiry.id, transport)).rejects.toThrow(
      "SMTP down",
    );
    expect(await prisma.outboundEmail.count()).toBe(0);
  });
});
