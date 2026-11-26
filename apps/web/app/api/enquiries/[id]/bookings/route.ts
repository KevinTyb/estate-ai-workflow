import { errorResponse, readJson, validationError } from "@/lib/api/http";
import { bookSlot } from "@/lib/bookings/bookings";
import { createBookingSchema } from "@estate-ai/schema";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const parsed = createBookingSchema.safeParse(await readJson(request));
    if (!parsed.success) return validationError(parsed.error);

    const booking = await bookSlot({ enquiryId: id, ...parsed.data });
    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Failed to book viewing");
  }
}
