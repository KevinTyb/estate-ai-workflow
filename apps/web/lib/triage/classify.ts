import type { Intent } from "@prisma/client";

type Signal = { pattern: RegExp; weight: number };

/**
 * Weighted keyword signals per intent. Patterns use word boundaries so that
 * e.g. "review" does not count as "view" and "taps" does not hide inside
 * "metaphor". Weights reflect how strongly a phrase indicates the intent on
 * its own: 3 = decisive, 2 = strong, 1 = supporting.
 */
const SIGNALS: Record<Exclude<Intent, "GENERAL">, Signal[]> = {
  SPAM: [
    { pattern: /\b(crypto|bitcoin|forex)\b/i, weight: 3 },
    { pattern: /\bbuy now\b/i, weight: 3 },
    { pattern: /\binvestment opportunit(y|ies)\b/i, weight: 3 },
    { pattern: /\bclick (here|this link)\b/i, weight: 3 },
    { pattern: /\bguaranteed (returns|profit)\b/i, weight: 3 },
    { pattern: /\bseo (services|ranking)\b/i, weight: 3 },
    { pattern: /\b(you have won|prize|lottery)\b/i, weight: 2 },
    { pattern: /\bunsubscribe\b/i, weight: 1 },
  ],
  MAINTENANCE: [
    { pattern: /\bboilers?\b/i, weight: 3 },
    { pattern: /\b(leak|leaks|leaking|leaky)\b/i, weight: 3 },
    { pattern: /\b(mould|mold|damp)\b/i, weight: 3 },
    { pattern: /\bno hot water\b/i, weight: 3 },
    {
      pattern:
        /\bheating (is(n't| not)|not|stopped|broke|has stopped|won't|doesn't)\b/i,
      weight: 3,
    },
    { pattern: /\b(repair|repairs|fix|fixed|fixing)\b/i, weight: 2 },
    {
      pattern: /\b(broken|faulty|fault|not working|stopped working)\b/i,
      weight: 2,
    },
    { pattern: /\b(blocked|clogged|overflowing)\b/i, weight: 2 },
    { pattern: /\b(pests?|mice|rats|cockroach(es)?)\b/i, weight: 2 },
    { pattern: /\b(dripping|taps?|toilet|shower|radiators?)\b/i, weight: 1 },
    { pattern: /\b(urgent|emergency|asap)\b/i, weight: 1 },
  ],
  VALUATION: [
    { pattern: /\bvaluations?\b/i, weight: 3 },
    { pattern: /\bvalue my\b/i, weight: 3 },
    {
      pattern:
        /\b(how much|what) (is|would) my [\w\s]{0,20}(worth|sell for|let for)\b/i,
      weight: 3,
    },
    { pattern: /\b(appraisal|market value)\b/i, weight: 2 },
    {
      pattern:
        /\b(sell|selling|let out|letting out|rent out|renting out) my\b/i,
      weight: 2,
    },
    {
      pattern: /\b(thinking of|looking to|planning to) (sell|let)\b/i,
      weight: 1,
    },
  ],
  VIEWING: [
    { pattern: /\bbook (a|in a) viewing\b/i, weight: 3 },
    { pattern: /\b(arrange|schedule) (a )?viewing\b/i, weight: 3 },
    { pattern: /\b(view|viewing|viewings)\b/i, weight: 2 },
    { pattern: /\b(visit|look (at|round|around))\b/i, weight: 1 },
    {
      pattern: /\bsee (the|this|it|that) ?(flat|house|property|place)?\b/i,
      weight: 1,
    },
    { pattern: /\b(still available|is it available)\b/i, weight: 1 },
  ],
};

/** When two intents score equally, the more time-sensitive one wins. */
const TIE_BREAK_ORDER: Intent[] = [
  "SPAM",
  "MAINTENANCE",
  "VALUATION",
  "VIEWING",
];

export type IntentScores = Record<Intent, number>;

export type Classification = {
  intent: Intent;
  scores: IntentScores;
  /** Score of the winning intent. */
  topScore: number;
  /** Score of the best competing intent. */
  runnerUpScore: number;
};

export function scoreIntents(rawText: string): IntentScores {
  const scores: IntentScores = {
    VIEWING: 0,
    VALUATION: 0,
    MAINTENANCE: 0,
    GENERAL: 0,
    SPAM: 0,
  };

  for (const [intent, signals] of Object.entries(SIGNALS)) {
    for (const { pattern, weight } of signals) {
      if (pattern.test(rawText)) scores[intent as Intent] += weight;
    }
  }

  return scores;
}

export function classifyIntent(rawText: string): Classification {
  const scores = scoreIntents(rawText);

  let intent: Intent = "GENERAL";
  let topScore = 0;
  for (const candidate of TIE_BREAK_ORDER) {
    if (scores[candidate] > topScore) {
      intent = candidate;
      topScore = scores[candidate];
    }
  }

  const runnerUpScore = Math.max(
    0,
    ...TIE_BREAK_ORDER.filter((c) => c !== intent).map((c) => scores[c]),
  );

  return { intent, scores, topScore, runnerUpScore };
}

/** Convenience wrapper kept for callers that only need the label. */
export function classifyIntentRules(rawText: string): Intent {
  return classifyIntent(rawText).intent;
}
