import { describe, expect, it } from "vitest";
import { formatSlot } from "../slots/formatSlots";
import { generateDraft } from "./generateDraft";

const enquiry = {
  contactName: "Sam Carter",
  rawText: "Can I view BST-12A?",
  propertyRef: "BST-12A",
};

const slot = {
  id: "s1",
  propertyId: "p1",
  startsAt: new Date("2026-12-04T10:00:00Z"),
  endAt: new Date("2026-12-04T10:30:00Z"),
};

describe("generateDraft", () => {
  it("lists suggested viewing slots without booking them", () => {
    const draft = generateDraft({
      enquiry,
      triageResult: { intent: "VIEWING", entities: {} },
      property: { ref: "BST-12A", address: "12A Baker Street, London" },
      slots: [slot],
    });

    expect(draft.replyRecommended).toBe(true);
    expect(draft.subject).toBe("Viewing enquiry for BST-12A");
    expect(draft.body).toContain("Hi Sam Carter");
    expect(draft.body).toContain(formatSlot(slot));
    expect(draft.body).toContain("we will confirm the appointment");
  });

  it("promises to confirm availability when there are no slots", () => {
    const draft = generateDraft({
      enquiry,
      triageResult: { intent: "VIEWING", entities: {} },
      slots: [],
    });
    expect(draft.body).toContain("confirm availability shortly");
  });

  it("does not recommend replying to spam", () => {
    const draft = generateDraft({
      enquiry,
      triageResult: { intent: "SPAM", entities: {} },
    });
    expect(draft).toMatchObject({ replyRecommended: false, body: null });
  });

  it("falls back to a neutral greeting without a contact name", () => {
    const draft = generateDraft({
      enquiry: { ...enquiry, contactName: "  " },
      triageResult: { intent: "GENERAL", entities: {} },
    });
    expect(draft.body).toMatch(/^Hi there,/);
  });
});

describe("formatSlot", () => {
  // Regression: slots were formatted in the server's time zone.
  it("formats in UK time in winter and summer", () => {
    expect(formatSlot(slot)).toBe("Friday 4 Dec, 10:00 - 10:30");
    expect(
      formatSlot({
        startsAt: new Date("2026-06-05T09:00:00Z"),
        endAt: new Date("2026-06-05T09:30:00Z"),
      }),
    ).toBe("Friday 5 Jun, 10:00 - 10:30");
  });
});
