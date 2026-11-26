import type { Intent } from "@prisma/client";
import { AiFailure, type StructuredResult } from "@/lib/ai/client";
import { groundEntities, type LlmTriage } from "@/lib/ai/triage";
import type { ExtractedEntities } from "./extract";
import { runRuleBasedTriage, type TriageOutput } from "./index";

/** Rule results at or above this confidence skip the model entirely. */
export const RULES_CONFIDENT = 0.8;
/** Final results below this confidence are flagged for a human. */
export const REVIEW_BELOW = 0.6;

export type TriageMethod = "rules" | "llm" | "rules-fallback";

export type HybridTriageOutput = Omit<TriageOutput, "method"> & {
  method: TriageMethod;
  needsReview: boolean;
  reviewReason: string | null;
  llm: {
    model?: string;
    latencyMs?: number;
    reason?: string;
    failure?: string;
  } | null;
};

export type LlmTriageFn = (
  rawText: string,
) => Promise<StructuredResult<LlmTriage>>;

/** Deterministic regex results win; the model only fills gaps. */
function mergeEntities(
  rules: ExtractedEntities,
  llm: ExtractedEntities,
): ExtractedEntities {
  return {
    email: rules.email ?? llm.email,
    phone: rules.phone ?? llm.phone,
    propertyRef: rules.propertyRef ?? llm.propertyRef,
    postcode: rules.postcode ?? llm.postcode,
    dates: rules.dates.length ? rules.dates : llm.dates,
    budgetPcm: rules.budgetPcm ?? llm.budgetPcm,
  };
}

/**
 * Hybrid triage: the rule engine always runs first because it is fast,
 * free and explainable. The model is consulted only when the rules are
 * unsure (or found nothing), and any model failure falls back to the
 * rules result. Low-confidence or model-flagged results are marked for
 * human review.
 */
export async function hybridTriage(
  rawText: string,
  llm: LlmTriageFn | null,
): Promise<HybridTriageOutput> {
  const rules = runRuleBasedTriage(rawText);
  const rulesConfident =
    rules.intent !== "GENERAL" && rules.confidence >= RULES_CONFIDENT;

  const fromRules = (
    method: TriageMethod,
    llmMeta: HybridTriageOutput["llm"],
  ): HybridTriageOutput => {
    const needsReview = rules.confidence < REVIEW_BELOW;
    return {
      ...rules,
      method,
      needsReview,
      reviewReason: needsReview
        ? method === "rules-fallback"
          ? "Low confidence and the AI engine was unavailable"
          : "Low confidence from the rule engine"
        : null,
      llm: llmMeta,
    };
  };

  if (!llm || rulesConfident) return fromRules("rules", null);

  try {
    const { data, model, latencyMs } = await llm(rawText);
    const confidence = Number(
      Math.min(Math.max(data.confidence, 0), 1).toFixed(2),
    );
    const entities = mergeEntities(
      rules.entities,
      groundEntities(rawText, data.entities),
    );
    const disagrees =
      rules.intent !== "GENERAL" && rules.intent !== data.intent;

    const reasons = [
      data.needsHumanReview ? "Flagged as ambiguous by the AI engine" : null,
      confidence < REVIEW_BELOW ? "Low AI confidence" : null,
      disagrees ? `Rules suggested ${rules.intent}` : null,
    ].filter(Boolean);

    return {
      intent: data.intent as Intent,
      confidence,
      entities,
      method: "llm",
      needsReview: reasons.length > 0,
      reviewReason: reasons.length ? reasons.join("; ") : null,
      llm: { model, latencyMs, reason: data.reason },
    };
  } catch (error) {
    const failure =
      error instanceof AiFailure
        ? `${error.kind}: ${error.message}`
        : String(error);
    return fromRules("rules-fallback", { failure });
  }
}
