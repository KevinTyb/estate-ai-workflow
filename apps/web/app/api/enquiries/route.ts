import { prisma } from "@/lib/prisma";
import { enquirySchema } from "@estate-ai/schema";

export async function GET() {
  const enquiries = await prisma.enquiry.findMany({
    orderBy: { createdAt: "desc" },
  });

  const parsed = enquirySchema.array().parse(enquiries);

  return Response.json(parsed);
}
