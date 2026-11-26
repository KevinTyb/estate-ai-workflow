import { errorResponse } from "@/lib/api/http";
import { previewReply, sendApprovedReply } from "@/lib/email/sendReply";
import { getEmailTransport } from "@/lib/email/transport";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

/** Preview the approved reply exactly as it would be sent. */
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const preview = await previewReply(id);
    return NextResponse.json({
      ...preview,
      transport: getEmailTransport().name,
    });
  } catch (error) {
    return errorResponse(error, "Failed to preview reply");
  }
}

/** Send (or, with the default outbox transport, simulate sending) it. */
export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const email = await sendApprovedReply(id);
    return NextResponse.json(email, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Failed to send reply");
  }
}
