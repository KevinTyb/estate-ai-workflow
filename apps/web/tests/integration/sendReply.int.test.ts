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

/** Shaped like nodemailer's errors. */
const connectionRefused = () =>
  Object.assign(new Error("connect ECONNREFUSED"), {
    code: "ECONNECTION",
    command: "CONN",
    syscall: "connect",
  });
const timedOut = () =>
  Object.assign(new Error("Timeout"), { code: "ETIMEDOUT", command: "CONN" });

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
    transport.send.mockRejectedValueOnce(connectionRefused());

    await expect(sendApprovedReply(enquiry.id, { transport })).rejects.toThrow(
      "connect ECONNREFUSED",
    );
    expect(await prisma.outboundEmail.findMany()).toMatchObject([
      { status: "FAILED", failureReason: "connect ECONNREFUSED" },
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
    transport.send.mockRejectedValueOnce(connectionRefused());

    await codeOf(sendApprovedReply(enquiry.id, { transport }));
    await sendApprovedReply(enquiry.id, { transport });

    const [first, second] = transport.send.mock.calls.map((c) => c[0]);
    expect(second.messageId).toBe(first.messageId);
  });

  it("treats an uncertain transport error as unknown, not retryable", async () => {
    const enquiry = await createEnquiry();
    await approveDraft(enquiry.id);
    const transport = fakeTransport();
    transport.send.mockRejectedValueOnce(timedOut());

    expect(await codeOf(sendApprovedReply(enquiry.id, { transport }))).toBe(
      "SEND_OUTCOME_UNKNOWN",
    );
    expect(await prisma.outboundEmail.findMany()).toMatchObject([
      { status: "UNKNOWN", failureReason: "Timeout" },
    ]);

    expect(await codeOf(sendApprovedReply(enquiry.id, { transport }))).toBe(
      "SEND_OUTCOME_UNKNOWN",
    );
    expect(transport.send).toHaveBeenCalledTimes(1);

    await sendApprovedReply(enquiry.id, { transport, confirmResend: true });
    expect(transport.send).toHaveBeenCalledTimes(2);
    expect(await prisma.outboundEmail.findMany()).toMatchObject([
      { status: "SENT" },
    ]);
  });

  it("does not let mark-as-sent overwrite a resend that reclaimed the attempt", async () => {
    const enquiry = await createEnquiry();
    await approveDraft(enquiry.id);
    const { later } = await interruptedClaim(enquiry.id);

    // Open the window: after markReplySent has read the claim, a resend
    // reclaims it before markReplySent writes.
    const delegate = prisma.outboundEmail;
    const original = delegate.findUnique;
    delegate.findUnique = ((args: Parameters<typeof original>[0]) =>
      original.call(delegate, args).then(async (claim) => {
        // previewReply selects only a few fields; markReplySent reads the
        // whole row, which is the read we want to race.
        if (claim && "transport" in claim) {
          await prisma.outboundEmail.update({
            where: { id: claim.id },
            data: { status: "SENDING", claimedAt: later },
          });
        }
        return claim;
      })) as unknown as typeof original;

    try {
      expect(await codeOf(markReplySent(enquiry.id, later))).toBe(
        "SEND_IN_PROGRESS",
      );
    } finally {
      delegate.findUnique = original;
    }

    expect(await prisma.outboundEmail.findMany()).toMatchObject([
      { status: "SENDING", claimedAt: later },
    ]);
    expect(await prisma.enquiryEvent.count()).toBe(0);
  });

  it("settles a race between mark-as-sent and send-again exactly once", async () => {
    const enquiry = await createEnquiry();
    await approveDraft(enquiry.id);
    const { later } = await interruptedClaim(enquiry.id);
    // Sweep the stale claim to UNKNOWN first.
    await codeOf(
      sendApprovedReply(enquiry.id, { transport: fakeTransport(), now: later }),
    );

    const transport = fakeTransport();
    const results = await Promise.all([
      codeOf(markReplySent(enquiry.id, later)),
      codeOf(
        sendApprovedReply(enquiry.id, {
          transport,
          now: later,
          confirmResend: true,
        }),
      ),
    ]);

    expect(results.filter((code) => code === null)).toHaveLength(1);
    expect(await prisma.outboundEmail.findMany()).toMatchObject([
      { status: "SENT" },
    ]);
    expect(
      await prisma.enquiryEvent.count({ where: { type: "EMAIL_SENT" } }),
    ).toBe(1);
    // A resend only happened if it won.
    expect(transport.send).toHaveBeenCalledTimes(results[1] === null ? 1 : 0);
  });

  it("does not record a late success twice once an agent resolved the attempt", async () => {
    const enquiry = await createEnquiry();
    await approveDraft(enquiry.id);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const transport = fakeTransport();
    transport.send.mockImplementation(async () => {
      await gate;
      return { messageId: "m-late" };
    });

    const slowSend = sendApprovedReply(enquiry.id, { transport });
    await vi.waitFor(() => expect(transport.send).toHaveBeenCalled());
    const claim = await prisma.outboundEmail.findFirstOrThrow();
    const later = new Date(claim.claimedAt.getTime() + STALE_CLAIM_MS + 1000);

    await markReplySent(enquiry.id, later);
    release();
    await slowSend;

    expect(
      await prisma.enquiryEvent.count({ where: { type: "EMAIL_SENT" } }),
    ).toBe(1);
    expect(await prisma.outboundEmail.findMany()).toMatchObject([
      { status: "SENT" },
    ]);
  });

  it("reports a superseded attempt instead of success when a resend is still running", async () => {
    const enquiry = await createEnquiry();
    await approveDraft(enquiry.id);

    // 1. The original attempt hangs inside the transport.
    let releaseOriginal!: () => void;
    const originalGate = new Promise<void>((r) => (releaseOriginal = r));
    const original = fakeTransport();
    original.send.mockImplementation(async () => {
      await originalGate;
      return { messageId: "m-original" };
    });
    const originalSend = codeOf(
      sendApprovedReply(enquiry.id, { transport: original }),
    );
    await vi.waitFor(() => expect(original.send).toHaveBeenCalled());
    const claim = await prisma.outboundEmail.findFirstOrThrow();
    const later = new Date(claim.claimedAt.getTime() + STALE_CLAIM_MS + 1000);

    // 2. Past the timeout an agent confirms a resend, which also hangs.
    expect(
      await codeOf(
        sendApprovedReply(enquiry.id, {
          transport: fakeTransport(),
          now: later,
        }),
      ),
    ).toBe("SEND_OUTCOME_UNKNOWN");
    let releaseResend!: () => void;
    const resendGate = new Promise<void>((r) => (releaseResend = r));
    const resend = fakeTransport();
    resend.send.mockImplementation(async () => {
      await resendGate;
      return { messageId: "m-resend" };
    });
    const resendSend = sendApprovedReply(enquiry.id, {
      transport: resend,
      now: later,
      confirmResend: true,
    });
    await vi.waitFor(() => expect(resend.send).toHaveBeenCalled());

    // 3-5. The original finally succeeds but must not report success.
    releaseOriginal();
    expect(await originalSend).toBe("SEND_SUPERSEDED");
    expect(await prisma.outboundEmail.findMany()).toMatchObject([
      { status: "SENDING", claimedAt: later },
    ]);
    expect(await prisma.enquiryEvent.count()).toBe(0);

    // The newer attempt settles the reply.
    releaseResend();
    await expect(resendSend).resolves.toMatchObject({ status: "SENT" });
    expect(
      await prisma.enquiryEvent.count({ where: { type: "EMAIL_SENT" } }),
    ).toBe(1);
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
