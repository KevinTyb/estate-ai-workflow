import { hybridDraft } from "@/lib/drafting/hybridDraft";
import { recordEvent } from "@/lib/events/recordEvent";
import { prisma } from "@/lib/prisma";
import { getNextAvailableSlots } from "@/lib/slots/getNextAvailableSlot";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const enquiry = await prisma.enquiry.findUnique({
      where: { id },
      include: {
        triageResult: true,
        property: true,
      },
    });

    if (!enquiry) {
      return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    }

    const shouldSuggestSlots =
      enquiry.triageResult?.intent === "VIEWING" && !!enquiry.propertyId;

    const slots = shouldSuggestSlots
      ? await getNextAvailableSlots({
          propertyId: enquiry.propertyId!,
          limit: 3,
        })
      : [];

    const draft = await hybridDraft({
      enquiry: {
        contactName: enquiry.contactName,
        rawText: enquiry.rawText,
        propertyRef: enquiry.propertyRef,
      },
      triageResult: enquiry.triageResult
        ? {
            intent: enquiry.triageResult.intent,
            entities: enquiry.triageResult.entities,
          }
        : null,
      property: enquiry.property
        ? {
            ref: enquiry.property.ref,
            address: enquiry.property.address,
          }
        : null,
      slots,
    });

    await recordEvent(prisma, enquiry.id, "DRAFT_GENERATED", {
      method: draft.method,
      model: draft.model,
      fallbackReason: draft.fallbackReason,
      intent: enquiry.triageResult?.intent ?? null,
      replyRecommended: draft.replyRecommended,
      slotsSuggested: slots.length,
    });

    return NextResponse.json({
      ...draft,
      slots,
    });
  } catch (error) {
    console.error("Draft route failed:", error);

    return NextResponse.json(
      { error: "Failed to generate draft" },
      { status: 500 },
    );
  }
}
