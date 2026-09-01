/**
 * Next Best Action ranking.
 *
 * A presentation-layer heuristic: given signals already computed elsewhere
 * (prayer schedule, DailyGoal, WeakPoint detection, MemorizationState,
 * Habit completion), pick the single most relevant thing to feature at the
 * top of Home. This intentionally is NOT a fixed priority order -- urgency
 * is scored per signal and the highest score wins, so e.g. an imminent
 * prayer outranks a ready weak-point lesson, but a weak-point lesson still
 * outranks a prayer that's 3 hours away.
 *
 * Urgency scale is 0-100 and is a judgment call, tune freely:
 * - Prayer within 15 min: 95 (genuinely time-bound, nothing else competes)
 * - Prayer within 30 min: 55
 * - Re-entry (lapsed user): 45 -- deliberately beats routine goal/habit/
 *   weak-point nudges, which would feel like a backlog to a returning user,
 *   but still loses to an imminent prayer.
 * - Memorization due: 55
 * - Daily goal incomplete: 50 (65 after 8pm, so it doesn't get lost all day)
 * - Weak point ready (confidence >= 0.6): confidence * 70 (up to ~68)
 * - Habit incomplete: 35 (lowest -- small, always-available filler action)
 */

export type NextActionKind = "prayer" | "goal" | "weak_point" | "memorization" | "habit" | "reentry" | "done";

export type NextAction = {
  kind: NextActionKind;
  title: string;
  detail: string;
  etaMinutes: number;
  cta: string;
  href: string;
};

type Candidate = NextAction & { urgency: number };

export const REENTRY_THRESHOLD_DAYS = 5;

export function isReentry(lastActivityAt: Date | null, now = new Date()): boolean {
  if (!lastActivityAt) return false; // brand-new users get the normal Home, not "welcome back"
  const daysSince = (now.getTime() - lastActivityAt.getTime()) / 86_400_000;
  return daysSince >= REENTRY_THRESHOLD_DAYS;
}

export function rankNextAction(input: {
  minutesUntilNextPrayer: number;
  nextPrayerName: string;
  goal: { progress: number; target: number } | null;
  weakPoint: { title: string; detail: string; confidence: number } | null;
  memorizationDue: { surah: number; ayah: number } | null;
  habitsIncomplete: number;
  reentry: boolean;
  now?: Date;
}): NextAction {
  const now = input.now ?? new Date();
  const candidates: Candidate[] = [];

  if (input.minutesUntilNextPrayer <= 15) {
    candidates.push({
      kind: "prayer",
      urgency: 95,
      title: `${input.nextPrayerName} in ${Math.max(0, input.minutesUntilNextPrayer)} min`,
      detail: "Make space now so you're not rushing.",
      etaMinutes: 5,
      cta: "Open prayer",
      href: "/prayer",
    });
  } else if (input.minutesUntilNextPrayer <= 30) {
    candidates.push({
      kind: "prayer",
      urgency: 55,
      title: `${input.nextPrayerName} in ${input.minutesUntilNextPrayer} min`,
      detail: "A good moment to wrap up and get ready.",
      etaMinutes: 5,
      cta: "Open prayer",
      href: "/prayer",
    });
  }

  if (input.reentry) {
    // A lapsed user gets one small, low-effort restart -- never the full
    // backlog of goals/weak points/habits that piled up while they were away.
    candidates.push({
      kind: "reentry",
      urgency: 45,
      title: "One small ayah to begin again",
      detail: "No catching up needed -- just a gentle restart.",
      etaMinutes: 3,
      cta: "Start gently",
      href: "/quran",
    });
  } else {
    if (input.goal && input.goal.progress < input.goal.target) {
      const lateInDay = now.getHours() >= 20;
      candidates.push({
        kind: "goal",
        urgency: lateInDay ? 65 : 50,
        title: `${input.goal.target - input.goal.progress} minutes left on today's goal`,
        detail: "Small and steady beats occasional and long.",
        etaMinutes: input.goal.target - input.goal.progress,
        cta: "Continue reading",
        href: "/quran",
      });
    }

    if (input.weakPoint && input.weakPoint.confidence >= 0.6) {
      candidates.push({
        kind: "weak_point",
        urgency: Math.round(input.weakPoint.confidence * 70),
        title: input.weakPoint.title,
        detail: input.weakPoint.detail,
        etaMinutes: 5,
        cta: "Work on this",
        href: "/habits",
      });
    }

    if (input.memorizationDue) {
      candidates.push({
        kind: "memorization",
        urgency: 55,
        title: `Surah ${input.memorizationDue.surah}:${input.memorizationDue.ayah} is due for review`,
        detail: "A quick spaced-repetition check-in.",
        etaMinutes: 4,
        cta: "Review now",
        href: "/memorize",
      });
    }

    if (input.habitsIncomplete > 0) {
      candidates.push({
        kind: "habit",
        urgency: 35,
        title: `${input.habitsIncomplete} small habit${input.habitsIncomplete === 1 ? "" : "s"} left today`,
        detail: "Quick wins that add up.",
        etaMinutes: 2,
        cta: "View habits",
        href: "/habits",
      });
    }
  }

  if (!candidates.length) {
    candidates.push({
      kind: "done",
      urgency: 0,
      title: "You're all caught up for today",
      detail: "Come back whenever you're ready.",
      etaMinutes: 0,
      cta: "Open Quran",
      href: "/quran",
    });
  }

  candidates.sort((a, b) => b.urgency - a.urgency);
  const [{ kind, title, detail, etaMinutes, cta, href }] = candidates;
  return { kind, title, detail, etaMinutes, cta, href };
}
