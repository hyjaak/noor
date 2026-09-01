import type { LearningEvent, WeakPointEngine, WeakPointResult } from "../types";

export class RuleBasedWeakPointEngine implements WeakPointEngine {
  async detect(events: LearningEvent[]): Promise<WeakPointResult> {
    const incompleteGoals = events.filter((event) => event.type === "USER_CHANGED_GOAL" && event.payload.completed === false).length;
    const shortSessions = events.filter((event) => event.type === "USER_READ_AYAH" && Number(event.payload.durationSeconds ?? 0) < 30).length;
    const recitationAttempts = events.filter((event) => event.type === "USER_RECITATION_ATTEMPT");
    const pronunciationNeedsWork = recitationAttempts.filter((event) => Number(event.payload.pronunciation ?? 100) < 60).length;
    const points = [];
    if (pronunciationNeedsWork >= 1) points.push({ title: "Stay with the letter shape", detail: "Your latest recitation check suggests returning to the reference ayah slowly before trying it at normal speed.", category: "pronunciation" as const, confidence: 0.72 });
    if (incompleteGoals >= 2) points.push({ title: "A gentler reading rhythm", detail: "Your recent goals have been a little ambitious. Try a smaller daily target and let consistency grow from there.", category: "consistency" as const, confidence: Math.min(0.95, 0.55 + incompleteGoals * 0.08) });
    if (shortSessions >= 2) points.push({ title: "Give one ayah more room", detail: "Several short sessions touched the same place. A slower read of one ayah may help it settle.", category: "focus" as const, confidence: 0.68 });
    if (!points.length) points.push({ title: "Keep your steady beginning", detail: "Your reading pattern is forming well. Return to one familiar surah today and stay with it for a few minutes.", category: "consistency" as const, confidence: 0.51 });
    return { status: "real", points };
  }
}
