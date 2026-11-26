/**
 * Colour tones for status pills and callouts, tuned for both themes.
 * Kept in one place so a status reads the same everywhere in the app.
 */
export const TONES = {
  amber:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300",
  blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/25 dark:bg-blue-400/10 dark:text-blue-300",
  emerald:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300",
  violet:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-300",
  sky: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-300",
  indigo:
    "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-400/25 dark:bg-indigo-400/10 dark:text-indigo-300",
  rose: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-300",
  pink: "border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-400/25 dark:bg-pink-400/10 dark:text-pink-300",
  neutral: "border-border bg-muted text-muted-foreground",
} as const;

export type Tone = keyof typeof TONES;

const VALUE_TONES: Record<string, Tone> = {
  PENDING: "amber",
  DRAFTED: "blue",
  SENT: "emerald",
  SCHEDULED: "violet",
  CLOSED: "neutral",
  VIEWING: "sky",
  VALUATION: "indigo",
  MAINTENANCE: "rose",
  GENERAL: "neutral",
  SPAM: "pink",
};

/** Tone classes for an enquiry status or intent. */
export function toneFor(value: string | null | undefined): string {
  return TONES[(value && VALUE_TONES[value]) || "neutral"];
}
