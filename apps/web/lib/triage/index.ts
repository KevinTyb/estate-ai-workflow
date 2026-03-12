import { Intent } from "@prisma/client";
import { ExtractedEntities, extractEntities } from "./extract";
import { classifyIntentRules } from "./classify";
import { scoreConfidence } from "./confidence";

export type TriageOutput = {
  intent: Intent;
  confidence: number;
  entities: ExtractedEntities;
  method: "rules";
};

export function runRuleBasedTriage(rawText: string): TriageOutput {
  const intent = classifyIntentRules(rawText);
  const entities = extractEntities(rawText);
  const confidence = scoreConfidence(intent, entities);

  return {
    intent,
    confidence,
    entities,
    method: "rules",
  };
}
