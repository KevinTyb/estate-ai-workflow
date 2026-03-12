import { Intent } from "@prisma/client";
import { ExtractedEntities } from "./extract";

export function scoreConfidence(
  intent: Intent,
  entities: ExtractedEntities,
): number {
  let score = 0.4;

  if (intent !== "GENERAL") score += 0.2;
  if (intent === "SPAM") score += 0.2;

  if (entities.email) score += 0.1;
  if (entities.phone) score += 0.1;
  if (entities.propertyRef) score += 0.1;
  if (entities.dates.length > 0) score += 0.05;
  if (entities.budgetPcm) score += 0.05;

  return Math.min(Number(score.toFixed(2)), 0.99);
}
