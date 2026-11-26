import { Prisma } from "@prisma/client";
import { WorkflowError } from "@/lib/api/errors";
import { recordEvent } from "@/lib/events/recordEvent";
import { prisma } from "@/lib/prisma";
import { getEmailTransport, type EmailTransport } from "./transport";

/**
 * A SENDING claim older than this is assumed abandoned (the server died
 * mid-send) and may be retried. It is well above the transport timeouts.
 */
export const STALE_CLAIM_MS = 5 * 60_000;

/** One reply per approved draft version: re-approving yields a new key. */
export function replyIdempotencyKey(draft: { id: string; updatedAt: Date }) {
  return `reply:${draft.id}:${draft.updatedAt.getTime()}`;
}

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

  return {
    enquiryId: enquiry.id,
    status: enquiry.status,
    draftReplyId: enquiry.draftReply.id,
    idempotencyKey: replyIdempotencyKey(enquiry.draftReply),
    to: enquiry.email,
    subject: enquiry.draftReply.subject ?? "Re: your enquiry",
    body: enquiry.draftReply.body,
    alreadySent,
    lastSentAt: lastSent?.sentAt ?? null,
  };
}

type Preview = Awaited<ReturnType<typeof previewReply>>;

const alreadySentError = () =>
  new WorkflowError(
    "ALREADY_SENT",
    "This draft has already been sent. Edit and approve it again to send another reply.",
  );

const inProgressError = () =>
  new WorkflowError(
    "SEND_IN_PROGRESS",
    "This reply is already being sent. Refresh in a moment to see the result.",
  );

/**
 * Durably claim the right to send this draft version before calling the
 * transport. The unique idempotency key means only one request can hold
 * the claim; a FAILED or abandoned attempt can be reclaimed exactly once.
 */
async function claimSend(
  preview: Preview,
  transportName: EmailTransport["name"],
  now: Date,
) {
  const key = preview.idempotencyKey;
  const content = {
    toEmail: preview.to,
    subject: preview.subject,
    body: preview.body,
    transport: transportName,
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

  if (existing.status === "SENT") throw alreadySentError();
  const stale = now.getTime() - existing.claimedAt.getTime() > STALE_CLAIM_MS;
  if (existing.status === "SENDING" && !stale) throw inProgressError();

  // Retry a failed or abandoned attempt. The condition on the previous
  // state and claim time makes this a compare-and-swap: of two concurrent
  // retries, only one matches.
  const { count } = await prisma.outboundEmail.updateMany({
    where: {
      id: existing.id,
      status: existing.status,
      claimedAt: existing.claimedAt,
    },
    data: {
      status: "SENDING",
      claimedAt: now,
      sentAt: now,
      failureReason: null,
      ...content,
    },
  });
  if (count === 0) throw inProgressError();
  return { ...existing, ...content, status: "SENDING" as const };
}

export async function sendApprovedReply(
  enquiryId: string,
  transport: EmailTransport = getEmailTransport(),
  now: Date = new Date(),
) {
  const preview = await previewReply(enquiryId);
  if (preview.alreadySent) throw alreadySentError();

  const claim = await claimSend(preview, transport.name, now);

  let messageId: string | null;
  try {
    ({ messageId } = await transport.send({
      to: preview.to,
      subject: preview.subject,
      body: preview.body,
    }));
  } catch (error) {
    await prisma.outboundEmail.update({
      where: { id: claim.id },
      data: {
        status: "FAILED",
        failureReason:
          error instanceof Error ? error.message.slice(0, 500) : "Unknown",
      },
    });
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    const email = await tx.outboundEmail.update({
      where: { id: claim.id },
      data: { status: "SENT", messageId, sentAt: new Date() },
    });

    // A reply moves a new or drafted enquiry to SENT; a scheduled viewing
    // stays SCHEDULED.
    await tx.enquiry.updateMany({
      where: { id: enquiryId, status: { in: ["PENDING", "DRAFTED"] } },
      data: { status: "SENT" },
    });

    await recordEvent(tx, enquiryId, "EMAIL_SENT", {
      outboundEmailId: email.id,
      transport: transport.name,
    });

    return email;
  });
}
