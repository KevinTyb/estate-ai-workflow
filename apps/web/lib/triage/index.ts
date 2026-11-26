import type { Intent } from "@prisma/client";
import { classifyIntent } from "./classify";
import { scoreConfidence } from "./confidence";
import { type ExtractedEntities, extractEntities } from "./extract";

export type { ExtractedEntities } from "./extract";

export type TriageOutput = {
  intent: Intent;
  confidence: number;
  entities: ExtractedEntities;
  method: "rules";
};

export function runRuleBasedTriage(rawText: string): TriageOutput {
  const classification = classifyIntent(rawText);
  const entities = extractEntities(rawText);
  const confidence = scoreConfidence(classification, entities);

  return {
    intent: classification.intent,
    confidence,
    entities,
    method: "rules",
  };
}
