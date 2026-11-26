import { jsonError, readJson, validationError } from "@/lib/api/http";
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

    const { subject, body, method } = parsed.data;

    const [draftReply] = await prisma.$transaction([
      prisma.draftReply.upsert({
        where: { enquiryId: id },
        update: { subject, body, method },
        create: { enquiryId: id, subject, body, method },
      }),
      // Approving a draft moves a new enquiry forward, but must not move a
      // sent or scheduled enquiry backwards.
      prisma.enquiry.updateMany({
        where: { id, status: "PENDING" },
        data: { status: "DRAFTED" },
      }),
    ]);

    return NextResponse.json({ success: true, draftReply });
  } catch (error) {
    console.error("Accept draft route failed:", error);
    return jsonError("Failed to accept draft", 500);
  }
}
