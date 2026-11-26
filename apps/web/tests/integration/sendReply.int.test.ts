import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkflowError } from "@/lib/api/errors";
import { bookSlot } from "@/lib/bookings/bookings";
import {
  markReplySent,
  replyIdempotencyKey,
  sendApprovedReply,
  STALE_CLAIM_MS,
} from "@/lib/email/sendReply";
import { messageIdFor, type EmailTransport } from "@/lib/email/transport";
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

    const email = await sendApprovedReply(enquiry.id, { transport });

    expect(transport.send).toHaveBeenCalledWith({
      to: "sam@example.com",
      subject: "Your enquiry",
      body: "Hi Sam, thanks!",
      messageId: expect.stringMatching(/^<[0-9a-f]{32}@.+>$/),
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
    expect(
      await codeOf(
        sendApprovedReply(noDraft.id, { transport: fakeTransport() }),
      ),
    ).toBe("DRAFT_NOT_APPROVED");

    const noEmail = await createEnquiry({ email: null });
    await approveDraft(noEmail.id);
    expect(
      await codeOf(
        sendApprovedReply(noEmail.id, { transport: fakeTransport() }),
      ),
    ).toBe("NO_RECIPIENT");
    expect(await prisma.outboundEmail.count()).toBe(0);
  });

  it("does not send the same approved draft twice", async () => {
    const enquiry = await createEnquiry();
    await approveDraft(enquiry.id);
    const transport = fakeTransport();

    await sendApprovedReply(enquiry.id, { transport });
    expect(await codeOf(sendApprovedReply(enquiry.id, { transport }))).toBe(
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

    await sendApprovedReply(enquiry.id, { transport: fakeTransport() });
    expect(
      await prisma.enquiry.findUnique({ where: { id: enquiry.id } }),
    ).toMatchObject({ status: "SCHEDULED" });
  });

  it("records a failed attempt without counting it as sent, and allows a retry", async () => {
    const enquiry = await createEnquiry();
    await approveDraft(enquiry.id);
    const transport = fakeTransport();
    transport.send.mockRejectedValueOnce(new Error("SMTP down"));

    await expect(sendApprovedReply(enquiry.id, { transport })).rejects.toThrow(
      "SMTP down",
    );
    expect(await prisma.outboundEmail.findMany()).toMatchObject([
      { status: "FAILED", failureReason: "SMTP down" },
    ]);
    expect(
      await prisma.enquiry.findUnique({ where: { id: enquiry.id } }),
    ).toMatchObject({ status: "PENDING" });
    expect(await prisma.enquiryEvent.count()).toBe(0);

    await sendApprovedReply(enquiry.id, { transport });
    expect(await prisma.outboundEmail.findMany()).toMatchObject([
      { status: "SENT", failureReason: null },
    ]);
    expect(transport.send).toHaveBeenCalledTimes(2);
  });

  it("sends only once when two requests race for the same draft", async () => {
    const enquiry = await createEnquiry();
    await approveDraft(enquiry.id);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const transport = fakeTransport();
    transport.send.mockImplementation(async () => {
      await gate;
      return { messageId: "m-1" };
    });

    // Either request may win. The winner blocks inside the transport until
    // the gate opens, so the first to settle must be the refused one.
    const attempts = [
      codeOf(sendApprovedReply(enquiry.id, { transport })),
      codeOf(sendApprovedReply(enquiry.id, { transport })),
    ];
    const loserCode = await Promise.race(attempts);
    release();
    const codes = await Promise.all(attempts);

    expect(loserCode).toBe("SEND_IN_PROGRESS");
    expect(codes.sort()).toEqual(["SEND_IN_PROGRESS", null].sort());
    expect(transport.send).toHaveBeenCalledTimes(1);
    expect(await prisma.outboundEmail.count()).toBe(1);
    expect(
      await prisma.enquiryEvent.count({ where: { type: "EMAIL_SENT" } }),
    ).toBe(1);
  });

  async function interruptedClaim(enquiryId: string) {
    const draft = await prisma.draftReply.findUniqueOrThrow({
      where: { enquiryId },
    });
    const claimedAt = new Date();
    const key = replyIdempotencyKey(draft);
    await prisma.outboundEmail.create({
      data: {
        enquiryId,
        idempotencyKey: key,
        status: "SENDING",
        claimedAt,
        toEmail: "sam@example.com",
        subject: "Your enquiry",
        body: "Hi Sam, thanks!",
        transport: "outbox",
        messageId: messageIdFor(key),
      },
    });
    return {
      key,
      later: new Date(claimedAt.getTime() + STALE_CLAIM_MS + 1000),
    };
  }

  it("never retries an interrupted attempt without the agent confirming", async () => {
    const enquiry = await createEnquiry();
    await approveDraft(enquiry.id);
    const { key, later } = await interruptedClaim(enquiry.id);
    const transport = fakeTransport();

    // Still within the timeout: treat it as in flight.
    expect(await codeOf(sendApprovedReply(enquiry.id, { transport }))).toBe(
      "SEND_IN_PROGRESS",
    );

    // Past the timeout the outcome is unknown, and it stays that way.
    for (let i = 0; i < 2; i++) {
      expect(
        await codeOf(sendApprovedReply(enquiry.id, { transport, now: later })),
      ).toBe("SEND_OUTCOME_UNKNOWN");
    }
    expect(transport.send).not.toHaveBeenCalled();
    expect(await prisma.outboundEmail.findMany()).toMatchObject([
      { status: "UNKNOWN" },
    ]);
    expect(
      await prisma.enquiry.findUnique({ where: { id: enquiry.id } }),
    ).toMatchObject({ status: "PENDING" });

    // The agent confirms: it is resent with the same Message-ID.
    await sendApprovedReply(enquiry.id, {
      transport,
      now: later,
      confirmResend: true,
    });
    expect(transport.send).toHaveBeenCalledTimes(1);
    expect(transport.send.mock.calls[0][0].messageId).toBe(messageIdFor(key));
    expect(await prisma.outboundEmail.findMany()).toMatchObject([
      { status: "SENT", failureReason: null },
    ]);
  });

  it("lets an agent mark an interrupted attempt as sent without resending", async () => {
    const enquiry = await createEnquiry();
    await approveDraft(enquiry.id);
    const { later } = await interruptedClaim(enquiry.id);

    expect(await codeOf(markReplySent(enquiry.id))).toBe("NOTHING_TO_RESOLVE");

    await markReplySent(enquiry.id, later);
    expect(await prisma.outboundEmail.findMany()).toMatchObject([
      { status: "SENT" },
    ]);
    expect(
      await prisma.enquiry.findUnique({ where: { id: enquiry.id } }),
    ).toMatchObject({ status: "SENT" });
    expect(
      await prisma.enquiryEvent.findFirst({ where: { type: "EMAIL_SENT" } }),
    ).toMatchObject({ metadata: { markedSentByAgent: true } });

    const transport = fakeTransport();
    expect(
      await codeOf(sendApprovedReply(enquiry.id, { transport, now: later })),
    ).toBe("ALREADY_SENT");
    expect(transport.send).not.toHaveBeenCalled();
  });

  it("reuses the same Message-ID when retrying a failed attempt", async () => {
    const enquiry = await createEnquiry();
    await approveDraft(enquiry.id);
    const transport = fakeTransport();
    transport.send.mockRejectedValueOnce(new Error("SMTP down"));

    await codeOf(sendApprovedReply(enquiry.id, { transport }));
    await sendApprovedReply(enquiry.id, { transport });

    const [first, second] = transport.send.mock.calls.map((c) => c[0]);
    expect(second.messageId).toBe(first.messageId);
  });

  it("allows another reply once the draft is edited and approved again", async () => {
    const enquiry = await createEnquiry();
    await approveDraft(enquiry.id);
    const transport = fakeTransport();
    await sendApprovedReply(enquiry.id, { transport });

    await prisma.draftReply.update({
      where: { enquiryId: enquiry.id },
      data: { body: "Hi Sam, one more thing." },
    });
    await sendApprovedReply(enquiry.id, { transport });

    expect(transport.send).toHaveBeenCalledTimes(2);
    expect(
      await prisma.outboundEmail.count({ where: { status: "SENT" } }),
    ).toBe(2);
  });
});
