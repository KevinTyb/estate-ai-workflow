import { recordEvent } from "@/lib/events/recordEvent";
import { prisma } from "@/lib/prisma";
import { matchProperty } from "@/lib/properties/matchProperty";
import { runRuleBasedTriage } from "./index";

/**
 * Triage an enquiry and persist the result. Also links the enquiry to a
 * known property when one can be identified, so that drafting and booking
 * can look up that property's viewing slots.
 *
 * Returns null when the enquiry does not exist.
 */
export async function triageEnquiry(enquiryId: string) {
  const enquiry = await prisma.enquiry.findUnique({ where: { id: enquiryId } });
  if (!enquiry) return null;

  const triage = runRuleBasedTriage(enquiry.rawText);

  const properties = await prisma.property.findMany({
    select: { id: true, ref: true, address: true, postcode: true },
  });
  const match = matchProperty(enquiry.rawText, triage.entities, properties);

  const data = {
    intent: triage.intent,
    confidence: triage.confidence,
    entities: triage.entities,
    method: triage.method,
  };

  const [, triageResult] = await prisma.$transaction([
    recordEvent(prisma, enquiry.id, "TRIAGED", {
      intent: triage.intent,
      confidence: triage.confidence,
      method: triage.method,
      propertyMatchedBy: match?.matchedBy ?? null,
    }),
    prisma.triageResult.upsert({
      where: { enquiryId: enquiry.id },
      update: data,
      create: { enquiryId: enquiry.id, ...data },
    }),
    prisma.enquiry.update({
      where: { id: enquiry.id },
      data: {
        intent: triage.intent,
        // Only overwrite the link when we found a property; never unlink one
        // an agent or the intake form already set.
        ...(match
          ? { propertyId: match.property.id, propertyRef: match.property.ref }
          : {}),
      },
    }),
  ]);

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
