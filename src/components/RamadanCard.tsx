"use client";

import { useEffect, useState } from "react";
import { formatCountdown } from "@/lib/prayer-utils";

type RamadanData = {
  day: number;
  daysRemaining: number;
  khatam: { readAyahs: number; totalAyahs: number; percentage: number };
  suhoor: { atIso: string; time: { time: string; period: string } };
  iftar: { atIso: string; time: { time: string; period: string } };
  emphasis: "suhoor" | "iftar";
};

export function RamadanCard({ ramadan }: { ramadan: RamadanData }) {
  const emphasized = ramadan.emphasis === "suhoor" ? ramadan.suhoor : ramadan.iftar;
  const [countdown, setCountdown] = useState(() => formatCountdown(new Date(emphasized.atIso)));

  useEffect(() => {
    const at = new Date(emphasized.atIso);
    const tick = () => setCountdown(formatCountdown(at));
    tick();
    const timer = window.setInterval(tick, 60000);
    return () => window.clearInterval(timer);
  }, [emphasized.atIso]);

  return (
    <article className="hero-card glass-card">
      <div className="card-topline">
        <span>RAMADAN {ramadan.day.toString().padStart(2, "0")}</span>
        <span className="live-dot">● {ramadan.daysRemaining} DAYS LEFT</span>
      </div>
      <div className="prayer-time">
        {ramadan.emphasis === "suhoor" ? "Suhoor ends" : "Iftar"}{" "}
        <strong>{emphasized.time.time}</strong>
        <small>{emphasized.time.period}</small>
      </div>
      <p className="muted">{countdown}</p>
      <div className="progress-line">
        <span style={{ width: `${ramadan.khatam.percentage}%` }} />
      </div>
      <div className="prayer-meta">
        <span>Khatam progress</span>
        <b>
          {ramadan.khatam.readAyahs} of {ramadan.khatam.totalAyahs} ayahs · {ramadan.khatam.percentage}%
        </b>
      </div>
    </article>
  );
}
