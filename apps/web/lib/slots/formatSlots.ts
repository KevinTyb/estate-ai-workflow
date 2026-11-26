import type { SuggestedSlot } from "./getNextAvailableSlot";

/** All viewing times are shown in UK time, whatever the server's zone. */
export const AGENCY_TIME_ZONE = "Europe/London";

const startFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: AGENCY_TIME_ZONE,
});

const endFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: AGENCY_TIME_ZONE,
});

export function formatSlot(slot: Pick<SuggestedSlot, "startsAt" | "endAt">) {
  return `${startFormatter.format(slot.startsAt)} - ${endFormatter.format(slot.endAt)}`;
}
