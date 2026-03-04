import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  const enquiries = await prisma.enquiry.findMany({
    orderBy: { createdAt: "desc" },
  });
  return Response.json(enquiries);
}
