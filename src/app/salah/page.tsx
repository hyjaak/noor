"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createAlignmentEngine } from "../../../packages/ai-services";
import { liveImamAlignmentMock } from "../../../packages/ai-services/alignment/mock";
import type { AlignmentPoint } from "../../../packages/ai-services/types";
import { isRamadan } from "../../../packages/config/hijri";
import { DAILY_PRAYERS } from "@/lib/prayer-utils";
import { surahs } from "@/lib/quran";

const rakahSteps = ["Qiyam", "Ruku", "Qawmah", "Sujood", "Jalsah", "Sujood"];
const track: AlignmentPoint[] = [{ atSeconds: 0, surah: 1, ayah: 1 }, { atSeconds: 8, surah: 1, ayah: 2 }, { atSeconds: 16, surah: 1, ayah: 3 }, { atSeconds: 24, surah: 1, ayah: 4 }, { atSeconds: 32, surah: 1, ayah: 5 }];
const RAKAH_PRESETS = [8, 20];
const surahName = (number: number) => surahs.find((item) => item.number === number)?.name ?? `Surah ${number}`;

type Checkpoint = { rakah: number; surah: number; ayah: number };

// Fire the position write the instant a checkpoint happens, not batched --
// localStorage is the local buffer, keepalive lets the request survive a
// background/close, and one retry covers a brief network drop.
function saveConfirmedPosition(position: { surah: number; ayah: number }) {
  window.localStorage.setItem("noor:quran-position", JSON.stringify(position));
  const send = () =>
    fetch("/api/position", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(position),
      keepalive: true,
    });
  send().catch(() => window.setTimeout(() => void send().catch(() => undefined), 1500));
}

export default function SalahPage() {
  const router = useRouter();
  const [exiting, setExiting] = useState(false);
  const [phase, setPhase] = useState<"setup" | "active">("setup");
  const ramadanActive = isRamadan();

  const [prayerName, setPrayerName] = useState<string>(ramadanActive ? "Taraweeh" : "Asr");
  const [rakahTarget, setRakahTarget] = useState<number | null>(ramadanActive ? 20 : null);
  const [customRakah, setCustomRakah] = useState("");

  const [stepIndex, setStepIndex] = useState(0);
  const [rakahNumber, setRakahNumber] = useState(1);
  const [timestamp, setTimestamp] = useState(0);
  const [assistance, setAssistance] = useState(true);
  const [trackFollowing, setTrackFollowing] = useState(true);
  const [lastConfirmed, setLastConfirmed] = useState({ surah: 1, ayah: 1 });
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);

  const sessionId = useRef<string | null>(null);
  const aligned = createAlignmentEngine().align(timestamp, track);
  const liveStatus = liveImamAlignmentMock();

  const beginSession = () => {
    const finalTarget = prayerName === "Taraweeh" ? (rakahTarget ?? (Number(customRakah) || 8)) : null;
    setRakahTarget(finalTarget);
    setStepIndex(0);
    setRakahNumber(1);
    setCheckpoints([]);
    setPhase("active");
    void fetch("/api/prayer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prayer: prayerName, rakahCount: finalTarget ?? undefined }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { data: { id: string } } | null) => {
        if (body) sessionId.current = body.data.id;
      });
  };

  const finalizeSession = (completed: boolean) => {
    if (!sessionId.current) return;
    void fetch("/api/prayer", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sessionId.current, completed }),
      keepalive: true,
    });
  };

  const exit = (event: React.MouseEvent) => {
    event.preventDefault();
    if (phase === "active") finalizeSession(true);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { router.push("/"); return; }
    setExiting(true);
    window.setTimeout(() => router.push("/"), 320);
  };

  // Belt-and-suspenders: if a checkpoint write was still in flight right as
  // the tab backgrounds/closes, re-send the last confirmed position.
  useEffect(() => {
    if (phase !== "active") return;
    const flushOnHide = () => {
      if (document.visibilityState === "hidden") saveConfirmedPosition(lastConfirmed);
    };
    const flushOnUnload = () => saveConfirmedPosition(lastConfirmed);
    document.addEventListener("visibilitychange", flushOnHide);
    window.addEventListener("beforeunload", flushOnUnload);
    return () => {
      document.removeEventListener("visibilitychange", flushOnHide);
      window.removeEventListener("beforeunload", flushOnUnload);
    };
  }, [phase, lastConfirmed]);

  const advance = () => {
    const leavingQiyam = stepIndex === 0;
    const nextStep = (stepIndex + 1) % rakahSteps.length;
    const wrapsToNewRakah = nextStep === 0;

    if (leavingQiyam) {
      // The exact moment Qiyam ends -- checkpoint synchronously, not after.
      let position: { surah: number; ayah: number };
      if (trackFollowing) {
        const checkpoint = track[Math.min(track.length - 1, Math.floor(timestamp / 8) + 1)];
        setTimestamp(checkpoint.atSeconds);
        position = { surah: checkpoint.surah, ayah: checkpoint.ayah };
      } else {
        position = { surah: aligned.surah, ayah: aligned.ayah };
      }
      setLastConfirmed(position);
      saveConfirmedPosition(position);
      setCheckpoints((prev) => [...prev, { rakah: rakahNumber, ...position }]);
      if (sessionId.current) {
        void fetch("/api/prayer", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: sessionId.current, checkpoint: { rakah: rakahNumber, ...position } }),
          keepalive: true,
        });
      }
    }

    setStepIndex(nextStep);
    if (wrapsToNewRakah) setRakahNumber((current) => current + 1);
  };

  const updateFromTrack = (event: React.SyntheticEvent<HTMLAudioElement>) => {
    setTimestamp(event.currentTarget.currentTime);
  };

  const finish = () => {
    finalizeSession(true);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { router.push("/"); return; }
    setExiting(true);
    window.setTimeout(() => router.push("/"), 320);
  };

  const sessionDone = rakahTarget !== null && rakahNumber > rakahTarget;

  if (phase === "setup") {
    return (
      <main className={exiting ? "salah-mode salah-exit" : "salah-mode"}>
        <header className="salah-header">
          <Link href="/" aria-label="Exit Salah Mode" onClick={exit}>×</Link>
          <span>SALAH MODE</span>
          <span />
        </header>
        <section className="salah-content salah-setup">
          <p className="eyebrow">{ramadanActive ? "RAMADAN · BEGIN SALAH MODE" : "BEGIN SALAH MODE"}</p>
          <h1>Choose your prayer.</h1>
          {ramadanActive && <p className="lede">Ramadan is active -- Taraweeh is suggested below.</p>}
          <div className="prayer-type-row">
            {[...DAILY_PRAYERS, "Taraweeh"].map((name) => (
              <button
                className={prayerName === name ? "prayer-type-option active" : "prayer-type-option"}
                key={name}
                onClick={() => setPrayerName(name)}
              >
                {name}
              </button>
            ))}
          </div>
          {prayerName === "Taraweeh" && (
            <div className="rakah-count-row">
              <p className="eyebrow">RAKAHS</p>
              {RAKAH_PRESETS.map((count) => (
                <button
                  className={rakahTarget === count ? "rakah-count-option active" : "rakah-count-option"}
                  key={count}
                  onClick={() => { setRakahTarget(count); setCustomRakah(""); }}
                >
                  {count}
                </button>
              ))}
              <input
                aria-label="Custom rakah count"
                className="rakah-count-custom"
                inputMode="numeric"
                onChange={(event) => { setCustomRakah(event.target.value); setRakahTarget(null); }}
                placeholder="Custom"
                type="number"
                value={customRakah}
              />
            </div>
          )}
          <button className="advance-button" onClick={beginSession}>
            Begin Salah Mode <span>→</span>
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className={exiting ? "salah-mode salah-exit" : "salah-mode"}>
      <header className="salah-header">
        <Link href="/" aria-label="Exit Salah Mode" onClick={exit}>×</Link>
        <span>SALAH MODE</span>
        <button aria-label="Toggle assistance" className={assistance ? "assistance active" : "assistance"} onClick={() => setAssistance(!assistance)}>◉</button>
      </header>
      <section className="salah-content">
        <p className="eyebrow">CURRENT PRAYER</p>
        <h1>{prayerName}</h1>

        {/* The one thing that matters most on this screen: where reading
            stopped before the last bow. Always visible, never buried. */}
        <div className="salah-confirmed-card">
          <span className="eyebrow">LAST CONFIRMED POSITION</span>
          <strong>{surahName(lastConfirmed.surah)} {lastConfirmed.ayah}</strong>
          <small>Rakah {rakahNumber}{rakahTarget ? ` of ${rakahTarget}` : ""} · locked in the instant Qiyam ended</small>
        </div>

        <p className="eyebrow">QURAN FOLLOWING · KNOWN TRACK</p>
        <div className="salah-position">
          <strong>{aligned.surah}:{aligned.ayah}</strong>
          <span>Al-Fatihah · confidence {Math.round(aligned.confidence * 100)}%</span>
        </div>
        <div className="track-controls">
          <audio controls src="https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3" onTimeUpdate={updateFromTrack} />
          <button className={trackFollowing ? "track-button active" : "track-button"} onClick={() => setTrackFollowing(!trackFollowing)}>
            ▶ {trackFollowing ? "Following along" : "Manual tracking"}
          </button>
          <span>Reference track checkpoint {Math.round(timestamp)}s</span>
        </div>

        <div className="salah-divider" />
        <p className="eyebrow">RAKAH {rakahNumber}{rakahTarget ? ` OF ${rakahTarget}` : ""} · MOVE GENTLY</p>
        <div className="rakah-state">
          <span className="rakah-current">{rakahSteps[stepIndex]}</span>
          <div className="rakah-dots">
            {rakahSteps.map((step, index) => <i className={index <= stepIndex ? "done" : ""} key={step + index} />)}
          </div>
        </div>
        {sessionDone ? (
          <button className="advance-button" onClick={finish}>
            Finish Salah Mode <span>→</span>
          </button>
        ) : (
          <button className="advance-button" onClick={advance}>
            Advance to next position <span>→</span>
          </button>
        )}

        {checkpoints.length > 0 && (
          <div className="rakah-checkpoints">
            <p className="eyebrow">CHECKPOINTS THIS SESSION</p>
            <ul>
              {checkpoints.map((checkpoint) => (
                <li key={checkpoint.rakah}>
                  <span>Rakah {checkpoint.rakah}</span>
                  <b>{surahName(checkpoint.surah)} {checkpoint.ayah}</b>
                </li>
              ))}
            </ul>
          </div>
        )}

        {assistance && <p className="assistance-note">Quiet assistance is on. No notifications or navigation appear in Salah Mode.</p>}
        <div className="imam-note">
          <span>◌</span>
          <p>
            <b>Live imam following is not available yet.</b>
            <br />
            <small>{liveStatus.status === "mock" ? "Manual tracking or a known reference track are used instead." : ""}</small>
          </p>
        </div>
      </section>
    </main>
  );
}
