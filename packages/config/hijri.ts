export type HijriDate = { year: number; month: number; monthName: string; day: number };

// Uses the ICU "islamic" calendar via Intl (same mechanism the Phase 1
// dashboard date line already relied on) -- no separate astronomical
// moon-sighting calculation, consistent with what's already in the app.
const numericParts = new Intl.DateTimeFormat("en-US", {
  calendar: "islamic",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});
const monthNameFormat = new Intl.DateTimeFormat("en-US", { calendar: "islamic", month: "long" });

function partsOf(date: Date): { year: number; month: number; day: number } {
  const parts = numericParts.formatToParts(date);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

export function getHijriDate(date = new Date()): HijriDate {
  const { year, month, day } = partsOf(date);
  return { year, month, day, monthName: monthNameFormat.format(date) };
}

export const RAMADAN_MONTH = 9;

export function isRamadan(date = new Date()): boolean {
  return getHijriDate(date).month === RAMADAN_MONTH;
}

// Counts full days remaining after `date` while the Hijri month stays the
// same as `date`'s -- avoids hardcoding 29/30-day months, which vary by
// year under the ICU islamic calendar.
export function daysRemainingInMonth(date = new Date()): number {
  const { month } = getHijriDate(date);
  let cursor = new Date(date);
  let count = 0;
  for (let i = 0; i < 31; i++) {
    cursor = new Date(cursor.getTime() + 86_400_000);
    if (getHijriDate(cursor).month !== month) break;
    count++;
  }
  return count;
}

export function formatGregorianHijri(date = new Date()): string {
  const gregorian = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  const hijri = new Intl.DateTimeFormat("en-US", {
    calendar: "islamic",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  return `${gregorian} · ${hijri}`;
}
