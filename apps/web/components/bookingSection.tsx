"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api/client";
import type { InboxEnquiry } from "@/lib/enquiries/types";
import { formatSlot } from "@/lib/slots/formatSlots";
import { DetailSection } from "./detailSection";

type SlotOption = { id: string; startsAt: string; endAt: string };

const toDates = (slot: { startsAt: string | Date; endAt: string | Date }) => ({
  startsAt: new Date(slot.startsAt),
  endAt: new Date(slot.endAt),
});

/**
 * Viewing booking. Suggested slots in a draft are only suggestions: a slot
 * is booked only when an agent picks it here and confirms.
 */
export function BookingSection({ enquiry }: { enquiry: InboxEnquiry }) {
  const router = useRouter();
  const booking = enquiry.bookings[0] ?? null;
  const isLinked = !!enquiry.propertyId;

  const [slots, setSlots] = useState<SlotOption[] | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const loadSlots = useCallback(async () => {
    try {
      const data = await apiFetch<SlotOption[]>(
        `/api/enquiries/${enquiry.id}/slots`,
      );
      setSlots(data);
      setSelectedSlotId((current) =>
        data.some((slot) => slot.id === current) ? current : null,
      );
    } catch (err) {
      setSlots([]);
      setError(err instanceof Error ? err.message : "Could not load slots");
    }
  }, [enquiry.id]);

  useEffect(() => {
    if (isLinked && !booking) void loadSlots();
  }, [isLinked, booking, loadSlots]);

  async function confirmBooking() {
    if (!selectedSlotId) return;
    setError(null);
    setIsWorking(true);
    try {
      await apiFetch(`/api/enquiries/${enquiry.id}/bookings`, {
        method: "POST",
        body: JSON.stringify({ slotId: selectedSlotId }),
      });
      toast.success("Viewing booked");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Booking failed";
      setError(message);
      toast.error(message);
      // Someone else may have taken the slot: show what is left.
      if (err instanceof ApiError && err.status === 409) void loadSlots();
    } finally {
      setIsWorking(false);
    }
  }

  async function cancel() {
    if (!booking) return;
    setError(null);
    setIsWorking(true);
    try {
      await apiFetch(`/api/bookings/${booking.id}/cancel`, { method: "POST" });
      toast.success("Viewing cancelled");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Cancel failed";
      setError(message);
      toast.error(message);
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <DetailSection title="Viewing" defaultOpen>
      {booking ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-violet-700">
              Confirmed viewing
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {formatSlot(toDates(booking.slot))}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void cancel()}
            disabled={isWorking}
          >
            {isWorking ? "Cancelling..." : "Cancel viewing"}
          </Button>
        </div>
      ) : !isLinked ? (
        <p className="text-sm text-slate-500">
          This enquiry is not linked to a property yet. Run triage to link it
          before booking a viewing.
        </p>
      ) : slots === null ? (
        <p className="text-sm text-slate-500">Loading available slots...</p>
      ) : slots.length === 0 ? (
        <p className="text-sm text-slate-500">
          No upcoming viewing slots for this property.
        </p>
      ) : (
        <div className="space-y-3">
          <fieldset className="space-y-2">
            <legend className="sr-only">Choose a viewing slot</legend>
            {slots.map((slot) => (
              <label
                key={slot.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm has-checked:border-sky-400 has-checked:bg-sky-50"
              >
                <input
                  type="radio"
                  name={`slot-${enquiry.id}`}
                  value={slot.id}
                  checked={selectedSlotId === slot.id}
                  onChange={() => setSelectedSlotId(slot.id)}
                  className="accent-sky-600"
                />
                {formatSlot(toDates(slot))}
              </label>
            ))}
          </fieldset>
          <Button
            type="button"
            size="sm"
            onClick={() => void confirmBooking()}
            disabled={!selectedSlotId || isWorking}
          >
            {isWorking ? "Booking..." : "Confirm viewing"}
          </Button>
        </div>
      )}
      {error ? (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </DetailSection>
  );
}
