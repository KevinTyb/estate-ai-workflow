import { Prisma, type EnquiryStatus } from "@prisma/client";
import { WorkflowError } from "@/lib/api/errors";
import { recordEvent } from "@/lib/events/recordEvent";
import { prisma } from "@/lib/prisma";

type BookSlotInput = {
  enquiryId: string;
  slotId: string;
  notes?: string | null;
  now?: Date;
};

/**
 * Confirm a viewing. Everything happens in one transaction, so a failure
 * at any step leaves no partial booking behind.
 *
 * Double booking is prevented twice over: the slot is claimed with a
 * conditional update (only one concurrent request can flip isBooked from
 * false to true), and the unique activeSlotId index rejects a second
 * confirmed booking at the database level.
 */
export async function bookSlot({
  enquiryId,
  slotId,
  notes,
  now = new Date(),
}: BookSlotInput) {
  try {
    return await prisma.$transaction(async (tx) => {
      // Lock the enquiry row so two agents cannot book different slots for
      // the same enquiry at the same moment.
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "Enquiry" WHERE id = ${enquiryId} FOR UPDATE`;
      if (locked.length === 0) {
        throw new WorkflowError("ENQUIRY_NOT_FOUND", "Enquiry not found", 404);
      }

      const enquiry = await tx.enquiry.findUniqueOrThrow({
        where: { id: enquiryId },
        select: { id: true, propertyId: true },
      });

      const existing = await tx.booking.findFirst({
        where: { enquiryId, status: "CONFIRMED" },
        select: { id: true },
      });
      if (existing) {
        throw new WorkflowError(
          "ENQUIRY_ALREADY_BOOKED",
          "This enquiry already has a confirmed viewing. Cancel it before booking another slot.",
        );
      }

      const slot = await tx.slot.findUnique({ where: { id: slotId } });
      if (!slot) {
        throw new WorkflowError(
          "SLOT_NOT_FOUND",
          "Viewing slot not found",
          404,
        );
      }
      if (!enquiry.propertyId) {
        throw new WorkflowError(
          "ENQUIRY_NOT_LINKED",
          "Link this enquiry to a property before booking a viewing.",
          422,
        );
      }
      if (slot.propertyId !== enquiry.propertyId) {
        throw new WorkflowError(
          "SLOT_PROPERTY_MISMATCH",
          "That slot belongs to a different property.",
          422,
        );
      }
      if (slot.startsAt <= now) {
        throw new WorkflowError(
          "SLOT_IN_PAST",
          "That slot has already started.",
        );
      }

      const claimed = await tx.slot.updateMany({
        where: { id: slotId, isBooked: false },
        data: { isBooked: true },
      });
      if (claimed.count === 0) {
        throw slotUnavailable();
      }

      const booking = await tx.booking.create({
        data: {
          enquiryId,
          slotId,
          activeSlotId: slotId,
          notes: notes ?? null,
        },
        include: { slot: true },
      });

      await tx.enquiry.update({
        where: { id: enquiryId },
        data: { status: "SCHEDULED" },
      });

      await recordEvent(tx, enquiryId, "VIEWING_BOOKED", {
        bookingId: booking.id,
        slotId,
        startsAt: slot.startsAt.toISOString(),
      });

      return booking;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw slotUnavailable();
    }
    throw error;
  }
}

function slotUnavailable() {
  return new WorkflowError(
    "SLOT_UNAVAILABLE",
    "Sorry, that slot has just been booked. Please choose another time.",
  );
}

/**
 * Cancel a confirmed booking, free its slot and move the enquiry back to
 * the furthest stage it reached before the booking.
 */
export async function cancelBooking(bookingId: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        enquiry: {
          select: {
            id: true,
            draftReply: { select: { id: true } },
            _count: { select: { outboundEmails: true } },
          },
        },
      },
    });
    if (!booking) {
      throw new WorkflowError("BOOKING_NOT_FOUND", "Booking not found", 404);
    }

    const cancelled = await tx.booking.updateMany({
      where: { id: bookingId, status: "CONFIRMED" },
      data: {
        status: "CANCELLED",
        activeSlotId: null,
        cancelledAt: new Date(),
      },
    });
    if (cancelled.count === 0) {
      throw new WorkflowError(
        "BOOKING_NOT_ACTIVE",
        "This booking has already been cancelled.",
      );
    }

    await tx.slot.update({
      where: { id: booking.slotId },
      data: { isBooked: false },
    });

    const { enquiry } = booking;
    const status: EnquiryStatus =
      enquiry._count.outboundEmails > 0
        ? "SENT"
        : enquiry.draftReply
          ? "DRAFTED"
          : "PENDING";

    await tx.enquiry.update({ where: { id: enquiry.id }, data: { status } });
    await recordEvent(tx, enquiry.id, "BOOKING_CANCELLED", {
      bookingId,
      slotId: booking.slotId,
    });

    return tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
  });
}
