"use client";

import { useEffect, useRef, useState } from "react";
import { formatCountdown } from "@/lib/prayer-utils";
import { useQuiet } from "./QuietProvider";

type UpNextCardProps = {
  nextName: string;
  nextTime: string;
  nextPeriod: string;
  nextAtIso: string;
  initialCountdown: string;
  progress: number;
  location: string;
  completedToday: number;
  totalPrayers: number;
};

const CIRCUMFERENCE = 2 * Math.PI * 26;

export function UpNextCard({
  nextName,
  nextTime,
  nextPeriod,
  nextAtIso,
  initialCountdown,
  progress,
  location,
  completedToday,
  totalPrayers,
}: UpNextCardProps) {
  const [countdown, setCountdown] = useState(initialCountdown);
  const [minutesLeft, setMinutesLeft] = useState<number>(Infinity);
  const { quiet } = useQuiet();
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nextAt = new Date(nextAtIso);
    const tick = () => {
      setCountdown(formatCountdown(nextAt));
      setMinutesLeft(Math.max(0, Math.round((nextAt.getTime() - Date.now()) / 60000)));
    };
    tick();
    const timer = window.setInterval(tick, 60000);
    return () => window.clearInterval(timer);
  }, [nextAtIso]);

  // Gentle parallax tilt on scroll -- degrades to no motion under
  // prefers-reduced-motion (the CSS media rule also zeroes transitions).
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ringRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const viewportCenter = window.innerHeight / 2;
        const delta = Math.max(-1, Math.min(1, (center - viewportCenter) / viewportCenter));
        el.style.setProperty("--tilt", `${(delta * 4).toFixed(2)}deg`);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const approaching = minutesLeft <= 15;
  const dashoffset = CIRCUMFERENCE * (1 - progress / 100);

  return (
    <article className="hero-card glass-card">
      <div className="card-topline">
        <span>UP NEXT</span>
        {quiet ? (
          <span className="quiet-indicator" title="Noor is quiet during prayer">
            ◔ Quiet
          </span>
        ) : (
          <span className="live-dot">● LIVE</span>
        )}
      </div>
      <div
        className={approaching ? "prayer-ring-wrap approaching" : "prayer-ring-wrap"}
        ref={ringRef}
      >
        <svg className="prayer-ring" viewBox="0 0 60 60" aria-hidden="true">
          <circle className="prayer-ring-track" cx="30" cy="30" r="26" />
          <circle
            className="prayer-ring-progress"
            cx="30"
            cy="30"
            r="26"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashoffset}
          />
        </svg>
        <div className="prayer-time">
          {nextName} <strong>{nextTime}</strong>
          <small>{nextPeriod}</small>
        </div>
      </div>
      <p className="muted">
        {countdown} · {location}
      </p>
      <div className="progress-line">
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="prayer-meta">
        <span>Today&apos;s prayers</span>
        <b>
          {completedToday} of {totalPrayers} complete
        </b>
      </div>
    </article>
  );
}

