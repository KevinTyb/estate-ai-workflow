import { errorResponse } from "@/lib/api/http";
import { cancelBooking } from "@/lib/bookings/bookings";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    return NextResponse.json(await cancelBooking(id));
  } catch (error) {
    return errorResponse(error, "Failed to cancel booking");
  }
}
