# Noor learning foundation

This package derives the first learning profile from `LearningEvent` history. It is a deterministic first-pass heuristic model, not machine learning.

- Reading consistency grows from read events and the number of surahs touched.
- Per-surah progress is the number of unique read ayahs divided by the canonical surah total.
- Skill status is `weak` below 40, `developing` from 40 to 74, and `strong` at 75 or above.
- Voice-dependent skills remain at zero until the voice phase exists.

The derived output is intentionally small and replaceable. A later model can consume the same event contract without changing the UI.

Lesson content uses `packages/lessons/lessons.json`. Each lesson has an `id`, `title`, `target`, optional `level`/`surah`, and ordered `steps`. A step has `type`, `title`, `body`, optional `mediaRef`, and optional `exerciseType`; exercise types are presentation hints such as `multiple-choice`, `complete-the-ayah`, and `hide-selected-words`.

## Next Best Action (`next-action.ts`)

`rankNextAction` picks the single most relevant thing to feature at the top
of Home. It scores candidate actions (imminent prayer, incomplete daily
goal, a ready weak point, a due memorization review, incomplete habits, or
a re-entry restart) by urgency (0-100) and returns the highest scorer --
not a fixed priority order. See the comment block at the top of
`next-action.ts` for the current scoring, which is a judgment call meant to
be tuned over time.

`isReentry` flags a user whose last `LearningEvent`/`Habit` activity is
`REENTRY_THRESHOLD_DAYS` (default 5) or more days old. When true, Home
should feed `rankNextAction` a `reentry: true` input, which suppresses the
routine goal/weak-point/habit nudges (a backlog would feel like guilt) in
favor of one small restart action -- an imminent prayer can still win.

`deriveKhatamProgress` sums unique read ayahs across all surahs (same
`USER_READ_AYAH` event contract as `deriveLearningProfile`) against the
real total ayah count, for the Ramadan Khatam indicator.
