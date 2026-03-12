import { Intent } from "@prisma/client";

const KEYWORDS: Record<Intent, string[]> = {
  VIEWING: ["view", "viewing", "visit", "see the property", "book a viewing"],
  VALUATION: [
    "valuation",
    "value my property",
    "how much is my property worth",
  ],
  MAINTENANCE: [
    "boiler",
    "leak",
    "leaking",
    "repair",
    "broken",
    "damage",
    "mould",
    "heating",
    "tap",
    "urgent help",
  ],
  GENERAL: [],
  SPAM: [
    "crypto",
    "bitcoin",
    "buy now",
    "investment opportunity",
    "click here",
  ],
};

export function classifyIntentRules(rawText: string): Intent {
  const text = rawText.toLowerCase();

  for (const keyword of KEYWORDS.SPAM) {
    if (text.includes(keyword)) return "SPAM";
  }

  for (const keyword of KEYWORDS.MAINTENANCE) {
    if (text.includes(keyword)) return "MAINTENANCE";
  }

  for (const keyword of KEYWORDS.VALUATION) {
    if (text.includes(keyword)) return "VALUATION";
  }

  for (const keyword of KEYWORDS.VIEWING) {
    if (text.includes(keyword)) return "VIEWING";
  }

  return "GENERAL";
}
