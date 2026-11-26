import { errorResponse, jsonError } from "@/lib/api/http";
import { prisma } from "@/lib/prisma";
import { getNextAvailableSlots } from "@/lib/slots/getNextAvailableSlot";
import { NextResponse } from "next/server";

/** Bookable viewing slots for the property this enquiry is linked to. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const enquiry = await prisma.enquiry.findUnique({
      where: { id },
      select: { propertyId: true },
    });
    if (!enquiry) return jsonError("Enquiry not found", 404);
    if (!enquiry.propertyId) return NextResponse.json([]);

    const slots = await getNextAvailableSlots({
      propertyId: enquiry.propertyId,
      limit: 10,
    });
    return NextResponse.json(slots);
  } catch (error) {
    return errorResponse(error, "Failed to load slots");
  }
}
