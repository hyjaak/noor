import Link from "next/link";
import { redirect } from "next/navigation";
import { ContinueCard } from "@/components/ContinueCard";
import { DailyRhythmCard } from "@/components/DailyRhythmCard";
import { UpNextCard } from "@/components/UpNextCard";
import { NextActionCard } from "@/components/NextActionCard";
import { RamadanCard } from "@/components/RamadanCard";
import { getDashboardData } from "@/lib/dashboard-data";
import { surahs } from "@/lib/quran";

export default async function Home() {
  let dashboard;

  try {
    dashboard = await getDashboardData();
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") redirect("/auth");
    throw error;
  }

  const goalPercent = dashboard.goal.target
    ? Math.round((dashboard.goal.progress / dashboard.goal.target) * 100)
    : 0;
  const topSurah = dashboard.profile.quranProgress[0];
  const topSurahName = surahs.find((surah) => surah.number === topSurah?.surah)?.name ?? "Al-Fatihah";

  return (
    <main className="page-shell">
      <section className="welcome-row">
        <div>
          <p className="eyebrow">{dashboard.dateLine}</p>
          <h1>{dashboard.reentry ? "Welcome back." : `Assalamu alaikum, ${dashboard.userName}.`}</h1>
          <p className="lede">
            {dashboard.reentry
              ? "No need to catch up on anything -- just begin again, gently."
              : "A little consistency becomes a beautiful journey."}
          </p>
        </div>
        {!dashboard.reentry && (
          <div className="streak-chip">
            <span>✦</span> {dashboard.streakDays} day rhythm
          </div>
        )}
      </section>

      <NextActionCard action={dashboard.nextAction} />

      <section className="dashboard-grid">
        {dashboard.ramadan ? (
          <RamadanCard ramadan={dashboard.ramadan} />
        ) : (
          <UpNextCard
            completedToday={dashboard.prayer.completedToday}
            initialCountdown={dashboard.prayer.countdown}
            location={dashboard.prayer.location}
            nextAtIso={dashboard.prayer.nextAtIso}
            nextName={dashboard.prayer.nextName}
            nextPeriod={dashboard.prayer.nextPeriod}
            nextTime={dashboard.prayer.nextTime}
            progress={dashboard.prayer.progress}
            totalPrayers={dashboard.prayer.totalPrayers}
          />
        )}

        <ContinueCard position={dashboard.position} />

        <article className="goal-card glass-card">
          <div className="card-topline">
            <span>TODAY&apos;S GOAL</span>
            <span className="gold-text">{goalPercent}%</span>
          </div>
          <div className="goal-ring">
            <strong>{dashboard.goal.progress}</strong>
            <span>
              of {dashboard.goal.target}
              <br />
              minutes
            </span>
          </div>
          <p className="muted">You&apos;re building a steady habit.</p>
        </article>

        <DailyRhythmCard habits={dashboard.habits} />

        <article className="weak-card glass-card">
          <div className="card-topline">
            <span>TODAY&apos;S WEAK POINT</span>
            <span className="weak-status">REAL · RULE-BASED</span>
          </div>
          <h2>{dashboard.weakPoint.title}</h2>
          <p>{dashboard.weakPoint.detail}</p>
          <Link href="/habits" className="text-link">
            Work on this gently →
          </Link>
        </article>

        <article className="skills-card glass-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">LEARNING AREAS</p>
              <h2>Your profile</h2>
            </div>
            <Link href="/profile" className="text-link">
              View profile
            </Link>
          </div>
          {dashboard.profile.skills.slice(0, 2).map((skill) => (
            <div className="skill-row" key={skill.category}>
              <span>{skill.category.replaceAll("_", " ")}</span>
              <b>{skill.score}%</b>
              <i>
                <span style={{ width: `${skill.score}%` }} />
              </i>
            </div>
          ))}
          {topSurah ? (
            <div className="skill-row">
              <span>{topSurahName}</span>
              <b>{topSurah.percentage}%</b>
              <i>
                <span style={{ width: `${topSurah.percentage}%` }} />
              </i>
            </div>
          ) : null}
        </article>
      </section>
    </main>
  );
}
