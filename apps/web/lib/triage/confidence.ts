import type { Classification } from "./classify";
import type { ExtractedEntities } from "./extract";

/**
 * Confidence reflects how clearly the text points at one intent, not how
 * many contact details it contains. Strong, unambiguous signals score high;
 * competing signals and fallbacks to GENERAL score low.
 */
export function scoreConfidence(
  classification: Pick<Classification, "intent" | "topScore" | "runnerUpScore">,
  entities: ExtractedEntities,
): number {
  const { intent, topScore, runnerUpScore } = classification;

  if (topScore === 0) {
    // Nothing matched: GENERAL is a guess.
    return 0.35;
  }

  let score = 0.5 + Math.min(topScore, 6) * 0.07;

  const margin = topScore - runnerUpScore;
  if (runnerUpScore > 0 && margin < 2) score -= 0.2;
  else if (runnerUpScore > 0) score -= 0.08;

  // Supporting evidence for the specific intent.
  if (intent === "VIEWING" && (entities.propertyRef || entities.dates.length)) {
    score += 0.05;
  }
  if (intent === "VALUATION" && entities.postcode) score += 0.05;

  return Number(Math.min(Math.max(score, 0.1), 0.95).toFixed(2));
}
