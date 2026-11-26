import { describe, expect, it } from "vitest";
import { runRuleBasedTriage } from "@/lib/triage";
import { RULES_CONFIDENT } from "@/lib/triage/hybrid";
import { scoreTriage, triageCases } from "./triageEval";

/**
 * Regression guard for the deterministic engine on the labelled set. The
 * hybrid engine is measured on the same set with `pnpm eval:triage`.
 */
describe("rule-based triage on the labelled eval set", () => {
  it("covers every intent", () => {
    expect(new Set(triageCases.map((c) => c.intent)).size).toBe(5);
  });

  it("does not regress below its recorded accuracy", async () => {
    const report = await scoreTriage((text) => runRuleBasedTriage(text).intent);
    expect(report.accuracy).toBeGreaterThanOrEqual(0.8);
  });

  // The hybrid design relies on the rules knowing when they are unsure:
  // every case they get wrong must fall below the threshold, so it is
  // passed to Claude instead of being answered confidently and wrongly.
  it("never answers a case it gets wrong with confidence", () => {
    for (const { text, intent } of triageCases) {
      const result = runRuleBasedTriage(text);
      if (result.intent !== intent) {
        const routedToModel =
          result.intent === "GENERAL" || result.confidence < RULES_CONFIDENT;
        expect(routedToModel, text).toBe(true);
      }
    }
  });
});
