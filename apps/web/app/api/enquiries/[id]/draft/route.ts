import { generateDraft } from "@/lib/drafting/generateDraft";
import { prisma } from "@/lib/prisma";
import { GetNextAvailableSlots } from "@/lib/slots/getNextAvailableSlot";
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
      ? await GetNextAvailableSlots({
          propertyId: enquiry.propertyId!,
          limit: 3,
        })
      : [];

    const draft = generateDraft({
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
