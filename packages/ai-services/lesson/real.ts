import type { WeakPoint } from "../types";
import lessons from "../../lessons/lessons.json";
export type LessonLevel = "kids" | "teen" | "adult_beginner" | "adult_intermediate" | "advanced";
export type Lesson = (typeof lessons.items)[number];
type LessonTarget = "letters" | "harakat" | "surah";
export type LessonRecommendation = { status: "mock" | "real"; lessons: Lesson[] };
export class RuleBasedLessonEngine {
  recommend(level: LessonLevel, weakPoints: WeakPoint[] = []): LessonRecommendation {
    const targets: Array<"letters" | "harakat" | "surah"> = weakPoints.map((point) => point.category === "consistency" ? "surah" : point.category === "fluency" ? "harakat" : "letters");
    const recommended = lessons.items.filter((lesson) => lesson.level === "all" || lesson.level === level).sort((first, second) => Number(targets.includes(second.target as LessonTarget)) - Number(targets.includes(first.target as LessonTarget))).slice(0, 3);
    return { status: "real", lessons: recommended };
  }
}
