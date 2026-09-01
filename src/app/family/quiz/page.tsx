"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GeometricMotif } from "@/components/illustrations";
import { LanternIcon, MushafIcon, CompassIcon, MosqueIcon, PrayerMatIcon, CrescentIcon, PrayerBeadsIcon } from "@/components/illustrations";

type Category = { id: string; label: string; icon: string };
type Question = { id: string; category: string; question: string; options: string[]; answerIndex: number; explanation: string };
type LeaderboardEntry = { userId: string; name: string; attempts: number; best: { score: number; total: number } | null };

const iconByName: Record<string, (props: { className?: string }) => React.JSX.Element> = {
  lantern: LanternIcon,
  mushaf: MushafIcon,
  compass: CompassIcon,
  mosque: MosqueIcon,
  prayerMat: PrayerMatIcon,
  crescent: CrescentIcon,
  prayerBeads: PrayerBeadsIcon,
};

export default function FamilyQuizPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<{ questionId: string; optionIndex: number }[]>([]);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    void fetch("/api/family/quiz")
      .then((res) => res.json())
      .then((body: { data: { categories: Category[]; questions: Question[] } }) => {
        setCategories(body.data.categories);
        setQuestions(body.data.questions);
      });
    void fetch("/api/family/quiz/leaderboard")
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((body: { data: LeaderboardEntry[] }) => setLeaderboard(body.data));
  }, []);

  const roundQuestions = useMemo(
    () => (category && category !== "all" ? questions.filter((question) => question.category === category) : questions),
    [category, questions],
  );
  const current = roundQuestions[index];
  const score = answers.filter((answer) => {
    const question = roundQuestions.find((item) => item.id === answer.questionId);
    return question && question.answerIndex === answer.optionIndex;
  }).length;

  const choose = (optionIndex: number) => {
    if (selected !== null || !current) return;
    setSelected(optionIndex);
    setAnswers((prev) => [...prev, { questionId: current.id, optionIndex }]);
  };

  const next = () => {
    if (index + 1 < roundQuestions.length) {
      setIndex(index + 1);
      setSelected(null);
      return;
    }
    setFinished(true);
    void fetch("/api/family/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: category ?? "mixed", answers }),
    }).then(() =>
      fetch("/api/family/quiz/leaderboard")
        .then((res) => (res.ok ? res.json() : { data: [] }))
        .then((body: { data: LeaderboardEntry[] }) => setLeaderboard(body.data)),
    );
  };

  const restart = () => {
    setCategory(null);
    setIndex(0);
    setSelected(null);
    setAnswers([]);
    setFinished(false);
  };

  return (
    <main className="page-shell narrow-shell quiz-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">FAMILY · KNOWLEDGE QUIZ</p>
          <h1>A gentle game of Islamic knowledge.</h1>
          <p className="lede">Take turns on one device, or play your own round -- everyone&apos;s best score shows up below.</p>
        </div>
        <Link href="/family" className="quiet-button">
          Back to Family
        </Link>
      </div>

      {category === null && !finished && (
        <section className="quiz-categories">
          <GeometricMotif variant="star8" className="motif-corner" />
          <button className="quiz-category-card glass-card" onClick={() => setCategory("all")} key="mixed">
            <MushafIcon className="quiz-category-icon" />
            <b>Mixed round</b>
            <small>{questions.length} questions across every category</small>
          </button>
          {categories.map((cat) => {
            const Icon = iconByName[cat.icon] ?? MushafIcon;
            return (
              <button className="quiz-category-card glass-card" key={cat.id} onClick={() => setCategory(cat.id)}>
                <Icon className="quiz-category-icon" />
                <b>{cat.label}</b>
                <small>{questions.filter((question) => question.category === cat.id).length} questions</small>
              </button>
            );
          })}
        </section>
      )}

      {category !== null && !finished && current && (
        <section className="quiz-round glass-card">
          <div className="quiz-progress">
            <span>
              Question {index + 1} of {roundQuestions.length}
            </span>
            <span className="quiz-score">Score: {score}</span>
          </div>
          <div className="progress-line">
            <span style={{ width: `${((index + (selected !== null ? 1 : 0)) / roundQuestions.length) * 100}%` }} />
          </div>
          <h2 className="quiz-question">{current.question}</h2>
          <div className="quiz-options">
            {current.options.map((option, optionIndex) => {
              const isCorrect = optionIndex === current.answerIndex;
              const isChosen = optionIndex === selected;
              const revealed = selected !== null;
              return (
                <button
                  className={
                    "quiz-option" +
                    (revealed && isCorrect ? " correct" : "") +
                    (revealed && isChosen && !isCorrect ? " incorrect" : "")
                  }
                  disabled={revealed}
                  key={option}
                  onClick={() => choose(optionIndex)}
                >
                  {option}
                </button>
              );
            })}
          </div>
          {selected !== null && (
            <div className="quiz-feedback">
              <p>{selected === current.answerIndex ? "Beautiful -- that's right." : "Not quite -- here's the answer:"}</p>
              <p className="muted">{current.explanation}</p>
              <button className="primary-button" onClick={next}>
                {index + 1 < roundQuestions.length ? "Next question" : "See results"} <span>→</span>
              </button>
            </div>
          )}
        </section>
      )}

      {finished && (
        <section className="quiz-round glass-card quiz-results">
          <CrescentIcon className="quiz-category-icon" />
          <h2>
            {score} of {roundQuestions.length} -- well done for playing.
          </h2>
          <p className="muted">Every question answered is a small step of learning together as a family.</p>
          <button className="primary-button" onClick={restart}>
            Play again <span>→</span>
          </button>
        </section>
      )}

      {leaderboard.length > 0 && (
        <section className="quiz-leaderboard">
          <p className="eyebrow">FAMILY · SHARED PROGRESS</p>
          <div className="shared-grid">
            {leaderboard.map((entry) => (
              <article className="shared-card glass-card" key={entry.userId}>
                <p className="eyebrow">{entry.name}</p>
                <strong>{entry.best ? `${entry.best.score} / ${entry.best.total} best round` : "No rounds played yet"}</strong>
                <small className="muted">{entry.attempts} round{entry.attempts === 1 ? "" : "s"} played</small>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
