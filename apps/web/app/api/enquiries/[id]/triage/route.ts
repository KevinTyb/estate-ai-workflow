import { prisma } from "@/lib/prisma";
import { runRuleBasedTriage } from "@/lib/triage";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const enquiry = await prisma.enquiry.findUnique({
      where: { id },
    });
    if (!enquiry) {
      return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    }

    const triage = runRuleBasedTriage(enquiry.rawText);

    const savedResult = await prisma.triageResult.upsert({
      where: { enquiryId: enquiry.id },
      update: {
        intent: triage.intent,
        confidence: triage.confidence,
        entities: triage.entities,
        method: triage.method,
      },
      create: {
        enquiryId: enquiry.id,
        intent: triage.intent,
        confidence: triage.confidence,
        entities: triage.entities,
        method: triage.method,
      },
    });

    return NextResponse.json(savedResult);
  } catch (error) {
    console.error("Triage route failed:", error);

    return NextResponse.json(
      { error: "Failed to triage enquiry" },
      { status: 500 },
    );
  }
}
