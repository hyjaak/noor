import { createWeakPointEngine } from "../../packages/ai-services";
import { deriveKhatamProgress, deriveLearningProfile, isReentry, rankNextAction } from "../../packages/learning";
import { prayerTimes } from "../../packages/config/prayerTimes";
import { daysRemainingInMonth, formatGregorianHijri, getHijriDate, isRamadan } from "../../packages/config/hijri";
import { requireCurrentUser } from "./current-user";
import { prisma } from "./prisma";
import { DAILY_PRAYERS, formatCountdown, formatPrayerTime, getPrayerWindow, parsePrayerTime } from "./prayer-utils";
import { surahs } from "./quran";

const SURAH_TOTALS = Object.fromEntries(surahs.map((surah) => [surah.number, surah.ayahs.length]));
const TOTAL_AYAHS = surahs.reduce((sum, surah) => sum + surah.ayahs.length, 0);

function nextOccurrence(time24: string, now: Date): Date {
  const today = parsePrayerTime(time24, now);
  if (today > now) return today;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return parsePrayerTime(time24, tomorrow);
}

export async function getDashboardData() {
  const user = await requireCurrentUser();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const startOfToday = new Date(today);
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const goalDate = new Date(today);

  const [position, goal, habits, recentPrayers, events, todayPrayers, memorizationDue] = await Promise.all([
    prisma.quranPosition.findUnique({ where: { userId: user.id } }),
    prisma.dailyGoal.findUnique({ where: { userId_date: { userId: user.id, date: goalDate } } }),
    prisma.habit.findMany({ where: { userId: user.id }, orderBy: { id: "asc" } }),
    prisma.prayerEvent.findMany({ where: { userId: user.id, createdAt: { gte: since } }, orderBy: { createdAt: "desc" } }),
    prisma.learningEvent.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
    prisma.prayerEvent.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: startOfToday },
        prayer: { in: [...DAILY_PRAYERS] },
      },
    }),
    prisma.memorizationState.findFirst({ where: { userId: user.id, dueAt: { lte: now } }, orderBy: { dueAt: "asc" } }),
  ]);

  const typedEvents = events.map((event) => ({
    type: event.type,
    payload: event.payload as Record<string, unknown>,
    createdAt: event.createdAt,
  }));

  const profile = deriveLearningProfile(typedEvents, SURAH_TOTALS);
  const weakPoint = (await createWeakPointEngine().detect(typedEvents)).points[0];

  const schedule = prayerTimes.calculate(
    {
      latitude: user.settings?.latitude ?? 40.7128,
      longitude: user.settings?.longitude ?? -74.006,
    },
    now,
    {
      method: user.settings?.calculationMethod,
      madhab: user.settings?.madhab,
      offsets: (user.settings?.prayerOffsets as Record<string, number>) ?? undefined,
    },
  );
  const prayerWindow = getPrayerWindow(schedule.times, now);
  const nextDisplay = formatPrayerTime(schedule.times[prayerWindow.next.name]);

  const activeDays = new Set([
    ...habits
      .filter((habit) => habit.completedAt)
      .map((habit) => habit.completedAt?.toISOString().slice(0, 10)),
    ...recentPrayers.map((prayer) => prayer.createdAt.toISOString().slice(0, 10)),
  ]);

  const surah = position ? surahs.find((item) => item.number === position.surah) : undefined;
  const ayah = surah?.ayahs.find((item) => item.number === position?.ayah);

  // Re-entry: most recent activity across events and habits, more than
  // REENTRY_THRESHOLD_DAYS old means Home should welcome the user back
  // gently instead of resuming full complexity. See packages/learning.
  const lastEventAt = typedEvents.at(-1)?.createdAt ?? null;
  const lastHabitAt = habits.reduce<Date | null>(
    (latest, habit) => (habit.completedAt && (!latest || habit.completedAt > latest) ? habit.completedAt : latest),
    null,
  );
  const lastActivityAt = [lastEventAt, lastHabitAt].filter((date): date is Date => Boolean(date)).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  const reentry = isReentry(lastActivityAt, now);

  const habitsIncomplete = habits.filter(
    (habit) => habit.completedAt?.toISOString().slice(0, 10) !== today,
  ).length;

  const nextAction = rankNextAction({
    minutesUntilNextPrayer: Math.round((prayerWindow.next.at.getTime() - now.getTime()) / 60000),
    nextPrayerName: prayerWindow.next.name,
    goal: { progress: goal?.progress ?? 0, target: goal?.target ?? 5 },
    weakPoint: weakPoint ? { title: weakPoint.title, detail: weakPoint.detail, confidence: weakPoint.confidence } : null,
    memorizationDue: memorizationDue ? { surah: memorizationDue.surah, ayah: memorizationDue.ayah } : null,
    habitsIncomplete,
    reentry,
    now,
  });

  const ramadan = isRamadan(now)
    ? (() => {
        const hijri = getHijriDate(now);
        const suhoorAt = nextOccurrence(schedule.times.Fajr, now);
        const iftarAt = nextOccurrence(schedule.times.Maghrib, now);
        return {
          day: hijri.day,
          daysRemaining: daysRemainingInMonth(now),
          khatam: deriveKhatamProgress(typedEvents, TOTAL_AYAHS),
          suhoor: { atIso: suhoorAt.toISOString(), time: formatPrayerTime(schedule.times.Fajr) },
          iftar: { atIso: iftarAt.toISOString(), time: formatPrayerTime(schedule.times.Maghrib) },
          emphasis: suhoorAt.getTime() < iftarAt.getTime() ? ("suhoor" as const) : ("iftar" as const),
        };
      })()
    : null;

  return {
    userName: user.name ?? "Noor",
    dateLine: formatGregorianHijri(now),
    streakDays: reentry ? 0 : activeDays.size,
    reentry,
    nextAction,
    ramadan,
    prayer: {
      nextName: prayerWindow.next.name,
      nextTime: nextDisplay.time,
      nextPeriod: nextDisplay.period,
      countdown: formatCountdown(prayerWindow.next.at, now),
      nextAtIso: prayerWindow.next.at.toISOString(),
      progress: prayerWindow.progress,
      location: user.settings?.location ?? "New York, NY",
      completedToday: todayPrayers.length,
      totalPrayers: DAILY_PRAYERS.length,
    },
    position: position
      ? {
          surah: position.surah,
          ayah: position.ayah,
          surahName: surah?.name ?? `Surah ${position.surah}`,
          arabic: ayah?.text ?? "",
        }
      : null,
    goal: {
      progress: goal?.progress ?? 0,
      target: goal?.target ?? 5,
    },
    habits: habits.map((habit) => ({
      id: habit.id,
      label: habit.label,
      done: habit.completedAt?.toISOString().slice(0, 10) === today,
    })),
    weakPoint,
    profile,
  };
}
