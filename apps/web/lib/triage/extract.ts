export type ExtractedEntities = {
  email: string | null;
  phone: string | null;
  propertyRef: string | null;
  dates: string[];
  budgetPcm: number | null;
};

const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_REGEX =
  /(?:(?:\+44\s?7\d{3}|\(?07\d{3}\)?)\s?\d{3}\s?\d{3}|\b\d{10,11}\b)/i;
const PROPERTY_REF_REGEX = /\b[A-Z]{2,5}-\d{1,4}[A-Z]?\b/i;
const BUDGET_REGEX = /£?\s?(\d{3,5})\s?(?:pcm|per month)?/i;

const DAY_WORDS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
  "today",
  "tomorrow",
  "next week",
];

export function extractEntities(rawText: string): ExtractedEntities {
  const emailMatch = rawText.match(EMAIL_REGEX);
  const phoneMatch = rawText.match(PHONE_REGEX);
  const propertyRefMatch = rawText.match(PROPERTY_REF_REGEX);
  const budgetMatch = rawText.match(BUDGET_REGEX);

  const lower = rawText.toLowerCase();
  const dates = DAY_WORDS.filter((day) => lower.includes(day));

  return {
    email: emailMatch?.[0] ?? null,
    phone: phoneMatch?.[0] ?? null,
    propertyRef: propertyRefMatch?.[0]?.toUpperCase() ?? null,
    dates,
    budgetPcm: budgetMatch?.[1] ? Number(budgetMatch[1]) : null,
  };
}
