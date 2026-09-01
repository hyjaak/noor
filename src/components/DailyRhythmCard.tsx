"use client";

import Link from "next/link";
import { useState } from "react";

type HabitRow = { id: string; label: string; done: boolean };

export function DailyRhythmCard({ habits: initialHabits }: { habits: HabitRow[] }) {
  const [habits, setHabits] = useState(initialHabits);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const toggle = async (habit: HabitRow) => {
    const nextDone = !habit.done;
    setError(null);
    setPendingId(habit.id);
    setHabits((current) =>
      current.map((item) => (item.id === habit.id ? { ...item, done: nextDone } : item)),
    );

    try {
      const response = await fetch("/api/habits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: habit.id, completed: nextDone }),
      });

      if (!response.ok) {
        throw new Error("Could not update habit.");
      }

      const body = (await response.json()) as { data: { completedAt: string | null } };
      setHabits((current) =>
        current.map((item) =>
          item.id === habit.id
            ? {
                ...item,
                done: body.data.completedAt
                  ? new Date(body.data.completedAt).toISOString().slice(0, 10) ===
                    new Date().toISOString().slice(0, 10)
                  : false,
              }
            : item,
        ),
      );
    } catch {
      setHabits((current) =>
        current.map((item) => (item.id === habit.id ? { ...item, done: habit.done } : item)),
      );
      setError("Could not save this habit. Try again.");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <article className="habit-card glass-card">
      <div className="card-heading">
        <div>
          <p className="eyebrow">SMALL STEPS</p>
          <h2>Daily rhythm</h2>
        </div>
        <Link href="/habits" className="text-link">
          View all
        </Link>
      </div>
      {error ? (
        <p className="muted" role="alert">
          {error}
        </p>
      ) : null}
      <div className="habit-list">
        {habits.length ? (
          habits.map((habit) => (
            <button
              className="habit-row habit-button"
              disabled={pendingId === habit.id}
              key={habit.id}
              onClick={() => void toggle(habit)}
              type="button"
            >
              <span className={habit.done ? "check done" : "check"}>{habit.done ? "✓" : ""}</span>
              <span>{habit.label}</span>
              <span className="habit-state">{habit.done ? "Complete" : "Start"}</span>
            </button>
          ))
        ) : (
          <p className="muted">No habits yet. Add them from the habits page.</p>
        )}
      </div>
    </article>
  );
}
