import { describe, expect, it, vi } from "vitest";
import { AiFailure } from "@/lib/ai/client";
import { SIGN_OFF, type LlmDraft } from "@/lib/ai/draft";
import type { DraftInput } from "./generateDraft";
import { hybridDraft } from "./hybridDraft";

const slot = {
  id: "s1",
  propertyId: "p1",
  startsAt: new Date("2026-12-04T10:00:00Z"), // 10:00 UK
  endAt: new Date("2026-12-04T10:30:00Z"),
};

const input: DraftInput = {
  enquiry: {
    contactName: "Sam Carter",
    rawText: "Can I view BST-12A on Friday morning?",
    propertyRef: "BST-12A",
  },
  triageResult: { intent: "VIEWING", entities: {} },
  property: { ref: "BST-12A", address: "12A Baker Street, London" },
  slots: [slot],
};

const llmReturning = (draft: LlmDraft) =>
  vi.fn(async () => ({ data: draft, model: "claude-test", latencyMs: 50 }));

const body = (middle: string) => `Hi Sam,\n\n${middle}\n\n${SIGN_OFF}`;

describe("hybridDraft", () => {
  it("uses the template when AI is off", async () => {
    const draft = await hybridDraft(input, null);
    expect(draft).toMatchObject({ method: "template", fallbackReason: null });
  });

  it("uses a valid AI draft that only offers listed slots", async () => {
    const draft = await hybridDraft(
      input,
      llmReturning({
        subject: "Viewing BST-12A",
        body: body(
          "We can show you round on Friday 4 Dec from 10:00 to 10:30. Does that suit?",
        ),
      }),
    );
    expect(draft).toMatchObject({
      method: "llm",
      model: "claude-test",
      fallbackReason: null,
    });
  });

  it("rejects an AI draft that invents a viewing time", async () => {
    const draft = await hybridDraft(
      input,
      llmReturning({
        subject: "Viewing",
        body: body("How about Saturday at 2pm?"),
      }),
    );
    expect(draft.method).toBe("template");
    expect(draft.fallbackReason).toContain("not an available slot");
  });

  it("rejects any time when there are no slots", async () => {
    const draft = await hybridDraft(
      { ...input, slots: [] },
      llmReturning({
        subject: "Viewing",
        body: body("Would 10:00 on Friday work?"),
      }),
    );
    expect(draft.method).toBe("template");
  });

  it("rejects an AI draft that claims the viewing is booked", async () => {
    const draft = await hybridDraft(
      input,
      llmReturning({
        subject: "Viewing confirmed",
        body: body("Your viewing has been booked for Friday 10:00."),
      }),
    );
    expect(draft.fallbackReason).toContain("already booked");
  });

  it("rejects placeholders", async () => {
    const draft = await hybridDraft(
      input,
      llmReturning({ subject: "Hello", body: body("Regards, [Agent name]") }),
    );
    expect(draft.fallbackReason).toContain("placeholder");
  });

  it("falls back to the template when the model fails", async () => {
    const draft = await hybridDraft(
      input,
      vi.fn(async () => {
        throw new AiFailure("refusal", "declined");
      }),
    );
    expect(draft).toMatchObject({
      method: "template",
      fallbackReason: "AI unavailable (refusal: declined)",
    });
  });

  it("never asks the model to reply to spam", async () => {
    const llm = llmReturning({ subject: "x", body: "y" });
    const draft = await hybridDraft(
      { ...input, triageResult: { intent: "SPAM", entities: {} } },
      llm,
    );
    expect(llm).not.toHaveBeenCalled();
    expect(draft.replyRecommended).toBe(false);
  });
});
