import type { EventType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = Prisma.TransactionClient | typeof prisma;

/** Append an audit event. Pass the transaction client to record atomically. */
export function recordEvent(
  db: Db,
  enquiryId: string,
  type: EventType,
  metadata?: Prisma.InputJsonValue,
) {
  return db.enquiryEvent.create({
    data: { enquiryId, type, metadata },
  });
}
