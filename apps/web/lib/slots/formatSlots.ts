import { SuggestedSlot } from "./getNextAvailableSlot";

export function formatSlot(slot: SuggestedSlot): string {
  const start = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(slot.startsAt);

  const end = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(slot.endAt);

  return `${start} - ${end}`;
}
