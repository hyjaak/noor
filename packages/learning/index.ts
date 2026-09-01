export type SkillCategory = "reading_consistency" | "surah_familiarity" | "letters" | "harakat" | "pronunciation" | "fluency";
export type DerivedSkill = { category: SkillCategory; score: number; status: "strong" | "developing" | "weak" };
export type QuranProgress = { surah: number; percentage: number; readAyahs: number; totalAyahs: number };
export type LearningEvent = { type: string; payload: Record<string, unknown>; createdAt?: Date };
const statusFor = (score: number): DerivedSkill["status"] => score >= 75 ? "strong" : score >= 40 ? "developing" : "weak";
export function deriveLearningProfile(events: LearningEvent[], surahTotals: Record<number, number>): { skills: DerivedSkill[]; quranProgress: QuranProgress[] } {
  const reads = events.filter((event) => event.type === "USER_READ_AYAH");
  const uniqueSurahs = new Set(reads.map((event) => Number(event.payload.surah))).size;
  const consistency = Math.min(100, reads.length * 12 + uniqueSurahs * 8);
  const progress = Object.entries(surahTotals).map(([surah, totalAyahs]) => { const readAyahs = new Set(reads.filter((event) => Number(event.payload.surah) === Number(surah)).map((event) => Number(event.payload.ayah))).size; return { surah: Number(surah), percentage: Math.round((readAyahs / totalAyahs) * 100), readAyahs, totalAyahs }; });
  const skills = ([{ category: "reading_consistency", score: consistency }, { category: "surah_familiarity", score: Math.min(100, uniqueSurahs * 20) }, { category: "letters", score: 0 }, { category: "harakat", score: 0 }, { category: "pronunciation", score: 0 }, { category: "fluency", score: 0 }] as const).map(({ category, score }) => ({ category, score, status: statusFor(score) }));
  return { skills, quranProgress: progress };
}
export function deriveEncounteredVocabulary(events: LearningEvent[]) { const readSurahs = new Set(events.filter((event) => event.type === "USER_READ_AYAH").map((event) => Number(event.payload.surah))); const vocabulary = [{ word: "رَبِّ", sound: "rabb", meaning: "Lord", source: "Al-Fatihah 1:2", surah: 1 }, { word: "الْحَمْدُ", sound: "al-hamdu", meaning: "praise", source: "Al-Fatihah 1:2", surah: 1 }, { word: "نَعْبُدُ", sound: "na'budu", meaning: "we worship", source: "Al-Fatihah 1:5", surah: 1 }]; return vocabulary.filter((item) => readSurahs.has(item.surah)); }
// Whole-Quran ("Khatam") completion: unique ayahs read across every surah,
// out of the real total ayah count -- same USER_READ_AYAH event contract
// deriveLearningProfile already uses for per-surah progress.
export function deriveKhatamProgress(events: LearningEvent[], totalAyahs: number): { readAyahs: number; totalAyahs: number; percentage: number } {
  const reads = events.filter((event) => event.type === "USER_READ_AYAH");
  const readAyahs = new Set(reads.map((event) => `${event.payload.surah}:${event.payload.ayah}`)).size;
  return { readAyahs, totalAyahs, percentage: totalAyahs ? Math.round((readAyahs / totalAyahs) * 100) : 0 };
}
export * from "./next-action";
export const foundationEvents: LearningEvent[] = [
  { type: "USER_READ_AYAH", payload: { surah: 1, ayah: 1, durationSeconds: 72 } }, { type: "USER_READ_AYAH", payload: { surah: 1, ayah: 2, durationSeconds: 65 } }, { type: "USER_READ_AYAH", payload: { surah: 1, ayah: 3, durationSeconds: 58 } }, { type: "USER_READ_AYAH", payload: { surah: 1, ayah: 4, durationSeconds: 61 } }, { type: "USER_READ_AYAH", payload: { surah: 1, ayah: 5, durationSeconds: 55 } }, { type: "USER_BOOKMARKED_AYAH", payload: { surah: 1, ayah: 5 } }, { type: "USER_CHANGED_GOAL", payload: { previous: 10, target: 5, completed: true } },
];
