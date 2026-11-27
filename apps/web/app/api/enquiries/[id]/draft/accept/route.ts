import { jsonError, readJson, validationError } from "@/lib/api/http";
import { recordEvent } from "@/lib/events/recordEvent";
import { prisma } from "@/lib/prisma";
import { acceptDraftSchema } from "@estate-ai/schema";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const parsed = acceptDraftSchema.safeParse(await readJson(request));
    if (!parsed.success) return validationError(parsed.error);

    const enquiry = await prisma.enquiry.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!enquiry) return jsonError("Enquiry not found", 404);

    const { subject, body, method, edited } = parsed.data;

    const [draftReply] = await prisma.$transaction([
      prisma.draftReply.upsert({
        where: { enquiryId: id },
        // Approving again clears any flag left by re-triage.
        update: { subject, body, method, edited, staleReason: null },
        create: { enquiryId: id, subject, body, method, edited },
      }),
      // Approving a draft moves a new enquiry forward, but must not move a
      // sent or scheduled enquiry backwards.
      prisma.enquiry.updateMany({
        where: { id, status: "PENDING" },
        data: { status: "DRAFTED" },
      }),
      recordEvent(prisma, id, "DRAFT_APPROVED", { method, edited }),
    ]);

    return NextResponse.json({ success: true, draftReply });
  } catch (error) {
    console.error("Accept draft route failed:", error);
    return jsonError("Failed to accept draft", 500);
  }
}
