import { triageEnquiry } from "@/lib/triage/triageEnquiry";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await triageEnquiry(id);

    if (!result) {
      return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Triage route failed:", error);
    return NextResponse.json(
      { error: "Failed to triage enquiry" },
      { status: 500 },
    );
  }
}
