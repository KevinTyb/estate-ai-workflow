import { WorkflowError } from "@/lib/api/errors";
import { recordEvent } from "@/lib/events/recordEvent";
import { prisma } from "@/lib/prisma";
import { getEmailTransport, type EmailTransport } from "./transport";

/**
 * Build exactly what would be sent for an enquiry: the agent-approved
 * draft, never unsaved edits or freshly generated text.
 */
export async function previewReply(enquiryId: string) {
  const enquiry = await prisma.enquiry.findUnique({
    where: { id: enquiryId },
    include: {
      draftReply: true,
      outboundEmails: { orderBy: { sentAt: "desc" }, take: 1 },
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
    to: enquiry.email,
    subject: enquiry.draftReply.subject ?? "Re: your enquiry",
    body: enquiry.draftReply.body,
    alreadySent,
    lastSentAt: lastSent?.sentAt ?? null,
  };
}

export async function sendApprovedReply(
  enquiryId: string,
  transport: EmailTransport = getEmailTransport(),
) {
  const preview = await previewReply(enquiryId);
  if (preview.alreadySent) {
    throw new WorkflowError(
      "ALREADY_SENT",
      "This draft has already been sent. Edit and approve it again to send another reply.",
    );
  }

  const { messageId } = await transport.send({
    to: preview.to,
    subject: preview.subject,
    body: preview.body,
  });

  return prisma.$transaction(async (tx) => {
    const email = await tx.outboundEmail.create({
      data: {
        enquiryId,
        toEmail: preview.to,
        subject: preview.subject,
        body: preview.body,
        transport: transport.name,
        messageId,
      },
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
