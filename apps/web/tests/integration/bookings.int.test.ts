import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { WorkflowError } from "@/lib/api/errors";
import { bookSlot, cancelBooking } from "@/lib/bookings/bookings";
import { prisma } from "@/lib/prisma";
import { createEnquiry, createProperty, createSlot, resetDb } from "./fixtures";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function expectWorkflowError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toBeInstanceOf(WorkflowError);
  await promise.catch((error: WorkflowError) => expect(error.code).toBe(code));
}

describe("bookSlot", () => {
  it("books a slot, schedules the enquiry and records an event", async () => {
    const property = await createProperty();
    const slot = await createSlot(property.id);
    const enquiry = await createEnquiry({ propertyId: property.id });

    const booking = await bookSlot({ enquiryId: enquiry.id, slotId: slot.id });

    expect(booking).toMatchObject({
      status: "CONFIRMED",
      activeSlotId: slot.id,
    });
    expect(
      await prisma.slot.findUnique({ where: { id: slot.id } }),
    ).toMatchObject({
      isBooked: true,
    });
    expect(
      await prisma.enquiry.findUnique({ where: { id: enquiry.id } }),
    ).toMatchObject({ status: "SCHEDULED" });
    expect(
      await prisma.enquiryEvent.count({
        where: { enquiryId: enquiry.id, type: "VIEWING_BOOKED" },
      }),
    ).toBe(1);
  });

  it("lets exactly one of many simultaneous requests book the same slot", async () => {
    const property = await createProperty();
    const slot = await createSlot(property.id);
    const enquiries = await Promise.all(
      Array.from({ length: 6 }, () =>
        createEnquiry({ propertyId: property.id }),
      ),
    );

    const results = await Promise.allSettled(
      enquiries.map((e) => bookSlot({ enquiryId: e.id, slotId: slot.id })),
    );

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(5);
    for (const r of rejected) {
      expect((r.reason as WorkflowError).code).toBe("SLOT_UNAVAILABLE");
    }
    expect(await prisma.booking.count()).toBe(1);
    // Losing enquiries were left untouched: no partial bookings.
    expect(await prisma.enquiry.count({ where: { status: "SCHEDULED" } })).toBe(
      1,
    );
  });

  it("does not let one enquiry hold two viewings at once", async () => {
    const property = await createProperty();
    const [a, b] = [
      await createSlot(property.id, 24),
      await createSlot(property.id, 48),
    ];
    const enquiry = await createEnquiry({ propertyId: property.id });

    const results = await Promise.allSettled([
      bookSlot({ enquiryId: enquiry.id, slotId: a.id }),
      bookSlot({ enquiryId: enquiry.id, slotId: b.id }),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.slot.count({ where: { isBooked: true } })).toBe(1);
  });

  it("rejects slots for another property, past slots and unlinked enquiries", async () => {
    const property = await createProperty("BST-12A");
    const other = await createProperty("W12-33");
    const enquiry = await createEnquiry({ propertyId: property.id });

    await expectWorkflowError(
      bookSlot({
        enquiryId: enquiry.id,
        slotId: (await createSlot(other.id)).id,
      }),
      "SLOT_PROPERTY_MISMATCH",
    );
    await expectWorkflowError(
      bookSlot({
        enquiryId: enquiry.id,
        slotId: (await createSlot(property.id, -1)).id,
      }),
      "SLOT_IN_PAST",
    );

    const unlinked = await createEnquiry();
    await expectWorkflowError(
      bookSlot({
        enquiryId: unlinked.id,
        slotId: (await createSlot(property.id)).id,
      }),
      "ENQUIRY_NOT_LINKED",
    );

    await expectWorkflowError(
      bookSlot({ enquiryId: "missing", slotId: "missing" }),
      "ENQUIRY_NOT_FOUND",
    );
    expect(await prisma.booking.count()).toBe(0);
  });
});

describe("cancelBooking", () => {
  it("frees the slot so it can be booked again, and restores status", async () => {
    const property = await createProperty();
    const slot = await createSlot(property.id);
    const first = await createEnquiry({ propertyId: property.id });
    const second = await createEnquiry({ propertyId: property.id });

    const booking = await bookSlot({ enquiryId: first.id, slotId: slot.id });
    const cancelled = await cancelBooking(booking.id);

    expect(cancelled).toMatchObject({
      status: "CANCELLED",
      activeSlotId: null,
    });
    expect(
      await prisma.enquiry.findUnique({ where: { id: first.id } }),
    ).toMatchObject({ status: "PENDING" });

    await expect(
      bookSlot({ enquiryId: second.id, slotId: slot.id }),
    ).resolves.toMatchObject({ status: "CONFIRMED" });
  });

  it("refuses to cancel twice", async () => {
    const property = await createProperty();
    const slot = await createSlot(property.id);
    const enquiry = await createEnquiry({ propertyId: property.id });
    const booking = await bookSlot({ enquiryId: enquiry.id, slotId: slot.id });

    await cancelBooking(booking.id);
    await expectWorkflowError(cancelBooking(booking.id), "BOOKING_NOT_ACTIVE");
  });
});
