import { Prisma, type OutboundEmailStatus } from "@prisma/client";
import { WorkflowError } from "@/lib/api/errors";
import { recordEvent } from "@/lib/events/recordEvent";
import { prisma } from "@/lib/prisma";
import {
  getEmailTransport,
  messageIdFor,
  type EmailTransport,
} from "./transport";
import {
  isOutcomeUnknown,
  isStaleClaim,
  replyIdempotencyKey,
  STALE_CLAIM_MS,
} from "./sendState";
import { classifySendError } from "./sendErrors";

export { isStaleClaim, replyIdempotencyKey, STALE_CLAIM_MS };

/**
 * Build exactly what would be sent for an enquiry: the agent-approved
 * draft, never unsaved edits or freshly generated text.
 */
export async function previewReply(enquiryId: string) {
  const enquiry = await prisma.enquiry.findUnique({
    where: { id: enquiryId },
    include: {
      draftReply: true,
      outboundEmails: {
        where: { status: "SENT" },
        orderBy: { sentAt: "desc" },
        take: 1,
      },
    },
  });
  if (!enquiry) {
    throw new WorkflowError("ENQUIRY_NOT_FOUND", "Enquiry not found", 404);
  }
  if (!enquiry.draftReply) {
    throw new WorkflowError(
      "DRAFT_NOT_APPROVED",
      "Approve a draft before sending a reply.",
      422,
    );
  }
  if (!enquiry.email) {
    throw new WorkflowError(
      "NO_RECIPIENT",
      "This enquiry has no email address to reply to.",
      422,
    );
  }

  const lastSent = enquiry.outboundEmails[0] ?? null;
  const alreadySent =
    !!lastSent && lastSent.sentAt >= enquiry.draftReply.updatedAt;

  const idempotencyKey = replyIdempotencyKey(enquiry.draftReply);
  const claim = await prisma.outboundEmail.findUnique({
    where: { idempotencyKey },
    select: { status: true, claimedAt: true },
  });
  const outcomeUnknown = isOutcomeUnknown(claim);

  return {
    enquiryId: enquiry.id,
    status: enquiry.status,
    draftReplyId: enquiry.draftReply.id,
    idempotencyKey,
    to: enquiry.email,
    subject: enquiry.draftReply.subject ?? "Re: your enquiry",
    body: enquiry.draftReply.body,
    alreadySent,
    /** A previous attempt was interrupted; an agent must decide what next. */
    outcomeUnknown,
    lastSentAt: lastSent?.sentAt ?? null,
  };
}

type Preview = Awaited<ReturnType<typeof previewReply>>;

const alreadySentError = () =>
  new WorkflowError(
    "ALREADY_SENT",
    "This draft has already been sent. Edit and approve it again to send another reply.",
  );

const outcomeUnknownError = () =>
  new WorkflowError(
    "SEND_OUTCOME_UNKNOWN",
    "A previous attempt to send this reply was interrupted, so it may already have been delivered. Check, then confirm a resend or mark it as sent.",
  );

const inProgressError = () =>
  new WorkflowError(
    "SEND_IN_PROGRESS",
    "This reply is already being sent. Refresh in a moment to see the result.",
  );

/**
 * Durably claim the right to send this draft version before calling the
 * transport. The unique idempotency key means only one request can hold
 * the claim. A FAILED attempt (the transport reported an error) can be
 * retried. An interrupted one is never retried automatically: it becomes
 * UNKNOWN, and only an explicit `confirmResend` reclaims it.
 */
async function claimSend(
  preview: Preview,
  transportName: EmailTransport["name"],
  now: Date,
  confirmResend: boolean,
) {
  const key = preview.idempotencyKey;
  const content = {
    toEmail: preview.to,
    subject: preview.subject,
    body: preview.body,
    transport: transportName,
    messageId: messageIdFor(key),
  };

  const existing = await prisma.outboundEmail.findUnique({
    where: { idempotencyKey: key },
  });

  if (!existing) {
    try {
      return await prisma.outboundEmail.create({
        data: {
          enquiryId: preview.enquiryId,
          idempotencyKey: key,
          status: "SENDING",
          claimedAt: now,
          sentAt: now,
          ...content,
        },
      });
    } catch (error) {
      // Another request created the claim between our read and write.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw inProgressError();
      }
      throw error;
    }
  }

  // Each transition below is a compare-and-swap on the previous status and
  // claim time, so of two concurrent requests only one can make it.
  const swap = (data: Prisma.OutboundEmailUpdateManyMutationInput) =>
    prisma.outboundEmail.updateMany({
      where: {
        id: existing.id,
        status: existing.status,
        claimedAt: existing.claimedAt,
      },
      data,
    });

  if (existing.status === "SENT") throw alreadySentError();

  if (existing.status === "SENDING") {
    if (!isStaleClaim(existing.claimedAt, now)) throw inProgressError();
    await swap({
      status: "UNKNOWN",
      failureReason: "Interrupted before the outcome was recorded.",
    });
    throw outcomeUnknownError();
  }

  if (existing.status === "UNKNOWN" && !confirmResend) {
    throw outcomeUnknownError();
  }

  // FAILED, or UNKNOWN with the agent's confirmation: try again.
  const { count } = await swap({
    status: "SENDING",
    claimedAt: now,
    sentAt: now,
    failureReason: null,
    ...content,
  });
  if (count === 0) throw inProgressError();
  return {
    ...existing,
    ...content,
    status: "SENDING" as const,
    claimedAt: now,
  };
}

export type SendOptions = {
  transport?: EmailTransport;
  now?: Date;
  /** The agent checked an interrupted attempt and chose to send again. */
  confirmResend?: boolean;
};

export async function sendApprovedReply(
  enquiryId: string,
  {
    transport = getEmailTransport(),
    now = new Date(),
    confirmResend = false,
  }: SendOptions = {},
) {
  const preview = await previewReply(enquiryId);
  if (preview.alreadySent) throw alreadySentError();

  const claim = await claimSend(preview, transport.name, now, confirmResend);

  let messageId: string | null;
  try {
    ({ messageId } = await transport.send({
      to: preview.to,
      subject: preview.subject,
      body: preview.body,
      messageId: claim.messageId ?? messageIdFor(preview.idempotencyKey),
    }));
  } catch (error) {
    // Only a definite rejection may be retried freely. A timeout or dropped
    // connection may have happened after the server accepted the message.
    const outcome = classifySendError(error);
    const reason =
      error instanceof Error ? error.message.slice(0, 500) : "Unknown error";
    await prisma.outboundEmail.updateMany({
      where: { id: claim.id, status: "SENDING", claimedAt: claim.claimedAt },
      data: { status: outcome, failureReason: reason },
    });
    if (outcome === "UNKNOWN") {
      throw new WorkflowError(
        "SEND_OUTCOME_UNKNOWN",
        `The mail server did not confirm whether it accepted this reply (${reason}). Check, then confirm a resend or mark it as sent.`,
      );
    }
    throw error;
  }

  const sent = await recordSent(
    enquiryId,
    { id: claim.id, claimedAt: claim.claimedAt, from: ["SENDING", "UNKNOWN"] },
    { messageId, transport: transport.name },
  );
  if (sent) return sent;

  // This attempt no longer owns the claim. If the reply is recorded as sent
  // (an agent marked it, or a newer attempt finished), report that. If a
  // newer attempt is still running, this request did not settle anything,
  // so it must not look like a successful send.
  const current = await prisma.outboundEmail.findUniqueOrThrow({
    where: { id: claim.id },
  });
  if (current.status === "SENT") return current;
  throw new WorkflowError(
    "SEND_SUPERSEDED",
    "A newer attempt to send this reply is in progress. Refresh in a moment to see the result.",
    409,
    { status: current.status },
  );
}

/** The attempt a transition applies to, and the states it may move from. */
type ClaimGuard = {
  id: string;
  claimedAt: Date;
  from: OutboundEmailStatus[];
};

/**
 * Mark a claim SENT and move the enquiry on, in one transaction. The update
 * is conditional on the guard, so it cannot overwrite a concurrent resend
 * or resolution; it returns null and changes nothing if the guard fails.
 */
function recordSent(
  enquiryId: string,
  guard: ClaimGuard,
  details: {
    messageId?: string | null;
    transport: string;
    markedByAgent?: true;
  },
) {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.outboundEmail.updateMany({
      where: {
        id: guard.id,
        claimedAt: guard.claimedAt,
        status: { in: guard.from },
      },
      data: {
        status: "SENT",
        ...(details.messageId !== undefined
          ? { messageId: details.messageId }
          : {}),
        ...(details.markedByAgent ? {} : { sentAt: new Date() }),
        failureReason: null,
      },
    });
    if (count === 0) return null;
    const email = await tx.outboundEmail.findUniqueOrThrow({
      where: { id: guard.id },
    });

    // A reply moves a new or drafted enquiry to SENT; a scheduled viewing
    // stays SCHEDULED.
    await tx.enquiry.updateMany({
      where: { id: enquiryId, status: { in: ["PENDING", "DRAFTED"] } },
      data: { status: "SENT" },
    });

    await recordEvent(tx, enquiryId, "EMAIL_SENT", {
      outboundEmailId: email.id,
      transport: details.transport,
      ...(details.markedByAgent ? { markedSentByAgent: true } : {}),
    });

    return email;
  });
}

/**
 * Resolve an interrupted send by recording that it did go out, e.g. after
 * the agent found it in the sent folder. Nothing is sent.
 */
export async function markReplySent(enquiryId: string, now: Date = new Date()) {
  const preview = await previewReply(enquiryId);
  if (preview.alreadySent) throw alreadySentError();

  const claim = await prisma.outboundEmail.findUnique({
    where: { idempotencyKey: preview.idempotencyKey },
  });
  if (!claim || !isOutcomeUnknown(claim, now)) {
    throw new WorkflowError(
      "NOTHING_TO_RESOLVE",
      "There is no interrupted send to mark as sent.",
    );
  }

  // One conditional transition from exactly the state we inspected. If a
  // concurrent "Send again" reclaimed the attempt first, this changes
  // nothing and the agent is told to refresh.
  const email = await recordSent(
    enquiryId,
    { id: claim.id, claimedAt: claim.claimedAt, from: [claim.status] },
    { transport: claim.transport, markedByAgent: true },
  );
  if (!email) throw inProgressError();
  return email;
}
