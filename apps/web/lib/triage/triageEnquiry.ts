import { getAiConfig } from "@/lib/ai/client";
import { llmTriage } from "@/lib/ai/triage";
import { replyIdempotencyKey } from "@/lib/email/sendState";
import { recordEvent } from "@/lib/events/recordEvent";
import { prisma } from "@/lib/prisma";
import { matchProperty } from "@/lib/properties/matchProperty";
import { hybridTriage, type LlmTriageFn } from "./hybrid";

function defaultLlm(): LlmTriageFn | null {
  const config = getAiConfig();
  return config.enabled ? (text) => llmTriage(text, config.model) : null;
}

/**
 * Triage an enquiry and persist the result. Also links the enquiry to a
 * known property when one can be identified, so that drafting and booking
 * can look up that property's viewing slots.
 *
 * Returns null when the enquiry does not exist.
 */
export async function triageEnquiry(
  enquiryId: string,
  { llm = defaultLlm() }: { llm?: LlmTriageFn | null } = {},
) {
  const enquiry = await prisma.enquiry.findUnique({
    where: { id: enquiryId },
    include: {
      triageResult: { select: { intent: true } },
      draftReply: true,
      property: { select: { ref: true } },
    },
  });
  if (!enquiry) return null;

  const triage = await hybridTriage(enquiry.rawText, llm);

  const properties = await prisma.property.findMany({
    select: { id: true, ref: true, address: true, postcode: true },
  });
  const match = matchProperty(enquiry.rawText, triage.entities, properties);

  const data = {
    intent: triage.intent,
    confidence: triage.confidence,
    entities: triage.entities,
    method: triage.method,
    needsReview: triage.needsReview,
    reviewReason: triage.reviewReason,
  };

  const staleReason = draftStaleReason(enquiry, triage.intent, match);

  const triageResult = await prisma.$transaction(async (tx) => {
    // An approved draft written for a different intent or property is no
    // longer safe to send as it is. Flag it unless it is already sent or
    // mid-send, which an agent resolves separately.
    let draftFlagged = false;
    if (staleReason && enquiry.draftReply) {
      const claim = await tx.outboundEmail.findUnique({
        where: { idempotencyKey: replyIdempotencyKey(enquiry.draftReply) },
        select: { status: true },
      });
      if (!claim || claim.status === "FAILED") {
        await tx.draftReply.update({
          where: { id: enquiry.draftReply.id },
          // Keep updatedAt so the send key and history stay unchanged.
          data: { staleReason, updatedAt: enquiry.draftReply.updatedAt },
        });
        draftFlagged = true;
      }
    }

    await recordEvent(tx, enquiry.id, "TRIAGED", {
      intent: triage.intent,
      confidence: triage.confidence,
      method: triage.method,
      needsReview: triage.needsReview,
      propertyMatchedBy: match?.matchedBy ?? null,
      llm: triage.llm,
      ...(draftFlagged ? { draftFlagged: true } : {}),
    });
    const result = await tx.triageResult.upsert({
      where: { enquiryId: enquiry.id },
      update: data,
      create: { enquiryId: enquiry.id, ...data },
    });
    await tx.enquiry.update({
      where: { id: enquiry.id },
      data: {
        intent: triage.intent,
        // Only overwrite the link when we found a property; never unlink one
        // an agent or the intake form already set.
        ...(match
          ? { propertyId: match.property.id, propertyRef: match.property.ref }
          : {}),
      },
    });
    return result;
  });

  return {
    triageResult,
    propertyMatch: match
      ? {
          propertyId: match.property.id,
          ref: match.property.ref,
          matchedBy: match.matchedBy,
        }
      : null,
  };
}

/** Why an approved draft no longer fits the new triage, if it doesn't. */
function draftStaleReason(
  enquiry: {
    draftReply: unknown;
    triageResult: { intent: string | null } | null;
    propertyId: string | null;
    property: { ref: string } | null;
  },
  intent: string,
  match: { property: { id: string; ref: string } } | null,
): string | null {
  if (!enquiry.draftReply) return null;
  const changes: string[] = [];
  const previousIntent = enquiry.triageResult?.intent;
  if (previousIntent && previousIntent !== intent) {
    changes.push(
      `intent changed from ${previousIntent.toLowerCase()} to ${intent.toLowerCase()}`,
    );
  }
  if (match && match.property.id !== enquiry.propertyId) {
    changes.push(
      enquiry.property
        ? `property changed from ${enquiry.property.ref} to ${match.property.ref}`
        : `property ${match.property.ref} was identified`,
    );
  }
  return changes.length ? `Re-triage: ${changes.join(", ")}.` : null;
}
