import type { Intent } from "@prisma/client";
import cases from "./triage-cases.json";

export type EvalCase = { text: string; intent: Intent };
export const triageCases = cases as EvalCase[];

export type EvalReport = {
  total: number;
  correct: number;
  accuracy: number;
  misses: Array<{ text: string; expected: Intent; got: Intent }>;
};

/** Score a classifier against the labelled cases. */
export async function scoreTriage(
  classify: (text: string) => Promise<Intent> | Intent,
  data: EvalCase[] = triageCases,
): Promise<EvalReport> {
  const misses: EvalReport["misses"] = [];
  for (const { text, intent } of data) {
    const got = await classify(text);
    if (got !== intent) misses.push({ text, expected: intent, got });
  }
  const correct = data.length - misses.length;
  return {
    total: data.length,
    correct,
    accuracy: correct / data.length,
    misses,
  };
}
