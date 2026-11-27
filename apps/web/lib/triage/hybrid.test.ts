import { describe, expect, it, vi } from "vitest";
import { AiFailure } from "@/lib/ai/client";
import type { LlmTriage } from "@/lib/ai/triage";
import { hybridTriage } from "./hybrid";

function llmReturning(data: Partial<LlmTriage>) {
  return vi.fn(async () => ({
    model: "test-model",
    latencyMs: 120,
    data: {
      intent: "GENERAL",
      confidence: 0.9,
      needsHumanReview: false,
      reason: "test",
      entities: {
        email: null,
        phone: null,
        propertyRef: null,
        postcode: null,
        dates: [],
        budgetPcm: null,
      },
      ...data,
    } as LlmTriage,
  }));
}

describe("hybridTriage", () => {
  it("uses rules alone when AI is not configured", async () => {
    const result = await hybridTriage("What are your opening hours?", null);
    expect(result).toMatchObject({
      method: "rules",
      intent: "GENERAL",
      llm: null,
    });
  });

  it("skips the model when the rules are confident", async () => {
    const llm = llmReturning({ intent: "SPAM" });
    const result = await hybridTriage(
      "I'd like to book a viewing of BST-12A on Saturday",
      llm,
    );
    expect(llm).not.toHaveBeenCalled();
    expect(result).toMatchObject({ method: "rules", intent: "VIEWING" });
  });

  it("asks the model when the rules are unsure and uses its answer", async () => {
    const llm = llmReturning({ intent: "MAINTENANCE", confidence: 0.86 });
    const result = await hybridTriage(
      "The bathroom extractor has given up and the window won't shut",
      llm,
    );
    expect(llm).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      method: "llm",
      intent: "MAINTENANCE",
      confidence: 0.86,
      needsReview: false,
      llm: { model: "test-model", reason: "test" },
    });
  });

  it("falls back to rules and flags review when the model fails", async () => {
    const llm = vi.fn(async () => {
      throw new AiFailure("api_error", "overloaded");
    });
    const result = await hybridTriage("Hello there", llm);
    expect(result).toMatchObject({
      method: "rules-fallback",
      intent: "GENERAL",
      needsReview: true,
      llm: { failure: "api_error: overloaded" },
    });
  });

  it("drops entities the model invented that are not in the message", async () => {
    const llm = llmReturning({
      intent: "VIEWING",
      entities: {
        email: "made.up@example.com",
        phone: "07700 900999",
        propertyRef: "ZZZ-99",
        postcode: "SW1A 1AA",
        dates: ["next tuesday", "sometime soon"],
        budgetPcm: 1500,
      },
    });
    const result = await hybridTriage(
      "Could I pop round next Tuesday to have a look? Around 1500 a month is my limit",
      llm,
    );
    expect(result.entities).toEqual({
      email: null,
      phone: null,
      propertyRef: null,
      postcode: null,
      dates: ["next tuesday"],
      budgetPcm: 1500,
    });
  });

  it.each([
    ["Looking for somewhere nice in Hackney", 1800],
    ["I'd say 1500 is about right", 1600],
    ["Flat 12, I can pay 1,200", 12],
    ["Call me on 07700 900123", 900123],
  ])(
    "drops a budget the message does not support: %j",
    async (text, budgetPcm) => {
      const llm = llmReturning({
        intent: "GENERAL",
        entities: {
          email: null,
          phone: null,
          propertyRef: null,
          postcode: null,
          dates: [],
          budgetPcm,
        },
      });
      const result = await hybridTriage(text, llm);
      expect(result.entities.budgetPcm).toBeNull();
    },
  );

  it.each([
    ["Up to 2.2k a month", 2200],
    ["About 400 per week", 1733],
    ["Around £1,450", 1450],
  ])("keeps a budget the message states: %j", async (text, budgetPcm) => {
    const llm = llmReturning({
      intent: "GENERAL",
      entities: {
        email: null,
        phone: null,
        propertyRef: null,
        postcode: null,
        dates: [],
        budgetPcm,
      },
    });
    const result = await hybridTriage(text, llm);
    expect(result.entities.budgetPcm).toBe(budgetPcm);
  });

  it("keeps deterministic regex values over the model's", async () => {
    const llm = llmReturning({
      intent: "GENERAL",
      entities: {
        email: "SAM@EXAMPLE.COM",
        phone: null,
        propertyRef: null,
        postcode: null,
        dates: [],
        budgetPcm: null,
      },
    });
    const result = await hybridTriage("Reply to sam@example.com please", llm);
    expect(result.entities.email).toBe("sam@example.com");
  });

  it("flags review when the model is unsure, ambiguous or disagrees with rules", async () => {
    const unsure = await hybridTriage(
      "Hello there",
      llmReturning({ confidence: 0.4 }),
    );
    expect(unsure).toMatchObject({
      needsReview: true,
      reviewReason: "Low AI confidence",
    });

    const disagrees = await hybridTriage(
      "Can someone visit? The tap drips.",
      llmReturning({ intent: "VIEWING", needsHumanReview: true }),
    );
    expect(disagrees.needsReview).toBe(true);
    expect(disagrees.reviewReason).toContain("Rules suggested MAINTENANCE");
    expect(disagrees.reviewReason).toContain("ambiguous");
  });
});
