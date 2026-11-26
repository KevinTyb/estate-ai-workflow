import { errorResponse, readJson, validationError } from "@/lib/api/http";
import { prisma } from "@/lib/prisma";
import { triageEnquiry } from "@/lib/triage/triageEnquiry";
import { createEnquirySchema, enquirySchema } from "@estate-ai/schema";
import { NextResponse } from "next/server";

export async function GET() {
  const enquiries = await prisma.enquiry.findMany({
    orderBy: { createdAt: "desc" },
  });

  const parsed = enquirySchema.array().parse(enquiries);

  return Response.json(parsed);
}

/**
 * Receive a new enquiry and triage it straight away. Triage failing does
 * not lose the enquiry: it is saved first and can be triaged again from
 * the inbox.
 */
export async function POST(request: Request) {
  try {
    const parsed = createEnquirySchema.safeParse(await readJson(request));
    if (!parsed.success) return validationError(parsed.error);

    const enquiry = await prisma.enquiry.create({ data: parsed.data });

    let triaged = false;
    try {
      triaged = (await triageEnquiry(enquiry.id)) !== null;
    } catch (error) {
      console.error("Automatic triage failed", error);
    }

    return NextResponse.json({ id: enquiry.id, triaged }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Failed to save enquiry");
  }
}
