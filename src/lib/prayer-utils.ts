const DAILY_PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;

export type DailyPrayer = (typeof DAILY_PRAYERS)[number];

export function parsePrayerTime(time: string, date: Date): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const parsed = new Date(date);
  parsed.setHours(hours, minutes, 0, 0);
  return parsed;
}

export function formatPrayerTime(time24: string): { time: string; period: string } {
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return { time: `${hour12}:${minutes.toString().padStart(2, "0")}`, period };
}

export function getPrayerWindow(times: Record<string, string>, now = new Date()) {
  const ordered = DAILY_PRAYERS.map((name) => ({ name, at: parsePrayerTime(times[name], now) }));
  let next = ordered.find((prayer) => prayer.at > now);
  let previous = ordered.filter((prayer) => prayer.at <= now).at(-1);

  if (!next) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    next = { name: "Fajr" as DailyPrayer, at: parsePrayerTime(times.Fajr, tomorrow) };
    previous = ordered.at(-1);
  }

  if (!previous) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    previous = { name: "Isha" as DailyPrayer, at: parsePrayerTime(times.Isha, yesterday) };
  }

  const elapsed = now.getTime() - previous.at.getTime();
  const total = next.at.getTime() - previous.at.getTime();
  const progress = total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0;

  return { next, previous, progress };
}

export function formatCountdown(until: Date, now = new Date()): string {
  const minutesTotal = Math.max(0, Math.floor((until.getTime() - now.getTime()) / 60000));
  const hours = Math.floor(minutesTotal / 60);
  const minutes = minutesTotal % 60;

  if (hours > 0) {
    return `in ${hours} hour${hours === 1 ? "" : "s"} ${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  return `in ${minutes} minute${minutes === 1 ? "" : "s"}`;
}

export { DAILY_PRAYERS };
