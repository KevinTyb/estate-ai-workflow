import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const subject =
      typeof body.subject === "string" || body.subject === null
        ? body.subject
        : null;

    const message = typeof body.body === "string" ? body.body.trim() : "";

    const method =
      typeof body.method === "string" && body.method.trim()
        ? body.method
        : "template";

    if (!message) {
      return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    }
    const savedDraft = await prisma.draftReply.upsert({
      where: { enquiryId: id },
      update: {
        subject,
        body: message,
        method,
      },
      create: {
        enquiryId: id,
        subject,
        body: message,
        method,
      },
    });

    await prisma.enquiry.update({
      where: { id },
      data: {
        status: "DRAFTED",
      },
    });

    return NextResponse.json({
      success: true,
      draftReply: savedDraft,
    });
  } catch (error) {
    console.error("Accept draft route failed:", error);

    return NextResponse.json(
      { error: "Failed to accept draft" },
      { status: 500 },
    );
  }
}
