import { errorResponse } from "@/lib/api/http";
import { markReplySent } from "@/lib/email/sendReply";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * Resolve an interrupted send by recording that the reply did go out, for
 * example after the agent found it in the sent folder. Nothing is sent.
 */
export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const email = await markReplySent(id);
    return NextResponse.json(email);
  } catch (error) {
    return errorResponse(error, "Failed to mark reply as sent");
  }
}
