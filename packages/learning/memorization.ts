export type MemorizationState = { ease: number; interval: number; dueAt: Date; repetitions: number };
export type AttemptQuality = 0 | 1 | 2 | 3 | 4 | 5;
export function updateMemorization(state: MemorizationState, quality: AttemptQuality, now = new Date()): MemorizationState {
  const ease = Math.max(1.3, state.ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  const repetitions = quality < 3 ? 0 : state.repetitions + 1;
  const interval = quality < 3 ? 1 : repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.round(state.interval * ease);
  const dueAt = new Date(now.getTime() + interval * 86400000);
  return { ease: Number(ease.toFixed(2)), interval, dueAt, repetitions };
}
export function memorizationStatus(state: MemorizationState, now = new Date()): "Strong" | "Developing" | "Needs Review" { if (state.dueAt <= now || state.repetitions === 0) return "Needs Review"; return state.repetitions >= 3 ? "Strong" : "Developing"; }
