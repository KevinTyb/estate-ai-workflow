export type ExtractedEntities = {
  email: string | null;
  phone: string | null;
  propertyRef: string | null;
  postcode: string | null;
  dates: string[];
  budgetPcm: number | null;
};

const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

// UK mobiles (07xxx / +44 7xxx) and landlines (01/02/03 / +44 1-3), with
// optional spaces or dashes between groups.
const PHONE_REGEX = /(?:\+44\s?\(?0?\)?\s?|\b0)[1-37](?:[\s-]?\d){8,9}\b/g;

function extractPhone(rawText: string): string | null {
  for (const match of rawText.matchAll(PHONE_REGEX)) {
    const digits = match[0].replace(/\D/g, "").replace(/^44/, "0");
    if (digits.length === 10 || digits.length === 11) return match[0].trim();
  }
  return null;
}

const PROPERTY_REF_REGEX = /\b[A-Z]{2,5}-\d{1,4}[A-Z]?\b/i;

const POSTCODE_REGEX = /\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i;

// A budget needs a currency marker or an explicit period, so that house
// numbers, phone numbers and postcodes are not mistaken for money.
const BUDGET_REGEX =
  /(?:£\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s?(k)?|\b(\d{3,5})(?=\s?(?:pcm|pm|per month|a month|pw|per week|a week)\b))\s?(pcm|pm|per month|a month|p\/m|pw|per week|a week|p\/w)?/i;

const MAX_PLAUSIBLE_RENT_PCM = 50_000;

const DATE_PATTERNS: RegExp[] = [
  /\b(?:this |next )?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
  /\b(?:today|tomorrow|tonight)\b/gi,
  /\b(?:this|next) (?:week|weekend|month)\b/gi,
  /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g,
  /\b\d{1,2}(?:st|nd|rd|th)? (?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/gi,
];

function extractDates(rawText: string): string[] {
  const found: string[] = [];
  for (const pattern of DATE_PATTERNS) {
    for (const match of rawText.matchAll(pattern)) {
      const value = match[0].toLowerCase();
      // "next friday" already covers "friday" - keep the most specific phrase.
      if (!found.some((existing) => existing.includes(value))) {
        found.push(value);
      }
    }
  }
  return found;
}

function extractBudgetPcm(rawText: string): number | null {
  const match = rawText.match(BUDGET_REGEX);
  if (!match) return null;

  const [, poundAmount, thousands, bareAmount, period] = match;
  const raw = poundAmount ?? bareAmount;
  if (!raw) return null;

  let amount = Number(raw.replace(/,/g, ""));
  if (thousands) amount *= 1000;
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const isWeekly = !!period && /w|week/i.test(period);
  if (isWeekly) amount = Math.round((amount * 52) / 12);

  // Large sums without a rental period are sale prices, not monthly rent.
  if (amount > MAX_PLAUSIBLE_RENT_PCM) return null;

  return Math.round(amount);
}

function normalisePostcode(match: RegExpMatchArray | null): string | null {
  if (!match) return null;
  return `${match[1]} ${match[2]}`.toUpperCase();
}

export function extractEntities(rawText: string): ExtractedEntities {
  return {
    email: rawText.match(EMAIL_REGEX)?.[0] ?? null,
    phone: extractPhone(rawText),
    propertyRef: rawText.match(PROPERTY_REF_REGEX)?.[0]?.toUpperCase() ?? null,
    postcode: normalisePostcode(rawText.match(POSTCODE_REGEX)),
    dates: extractDates(rawText),
    budgetPcm: extractBudgetPcm(rawText),
  };
}
