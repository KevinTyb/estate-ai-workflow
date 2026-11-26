import { errorResponse, readJson, validationError } from "@/lib/api/http";
import { previewReply, sendApprovedReply } from "@/lib/email/sendReply";
import { getEmailTransport } from "@/lib/email/transport";
import { sendReplySchema } from "@estate-ai/schema";
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

/**
 * Send (or, with the default outbox transport, simulate sending) it. After
 * an interrupted attempt the agent must pass `confirmResend: true`.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const parsed = sendReplySchema.safeParse(await readJson(request));
    if (!parsed.success) return validationError(parsed.error);
    const email = await sendApprovedReply(id, parsed.data);
    return NextResponse.json(email, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Failed to send reply");
  }
}
