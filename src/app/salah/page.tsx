"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createAlignmentEngine } from "../../../packages/ai-services";
import { liveImamAlignmentMock } from "../../../packages/ai-services/alignment/mock";
import type { AlignmentPoint } from "../../../packages/ai-services/types";

const rakahSteps = ["Qiyam", "Ruku", "Qawmah", "Sujood", "Jalsah", "Sujood"];
const track: AlignmentPoint[] = [{ atSeconds: 0, surah: 1, ayah: 1 }, { atSeconds: 8, surah: 1, ayah: 2 }, { atSeconds: 16, surah: 1, ayah: 3 }, { atSeconds: 24, surah: 1, ayah: 4 }, { atSeconds: 32, surah: 1, ayah: 5 }];

export default function SalahPage() {
  const router = useRouter();
  const [exiting, setExiting] = useState(false);
  const [rakah, setRakah] = useState(0); const [timestamp, setTimestamp] = useState(0); const [assistance, setAssistance] = useState(true); const [trackFollowing, setTrackFollowing] = useState(true); const [lastConfirmed, setLastConfirmed] = useState({ surah: 1, ayah: 1 });
  const aligned = createAlignmentEngine().align(timestamp, track); const liveStatus = liveImamAlignmentMock();
  const exit = (event: React.MouseEvent) => {
    event.preventDefault();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { router.push("/"); return; }
    setExiting(true);
    window.setTimeout(() => router.push("/"), 320);
  };
  const advance = () => { const next = (rakah + 1) % rakahSteps.length; setRakah(next); if (trackFollowing) { const checkpoint = track[Math.min(track.length - 1, Math.floor(timestamp / 8) + 1)]; setTimestamp(checkpoint.atSeconds); setLastConfirmed({ surah: checkpoint.surah, ayah: checkpoint.ayah }); window.localStorage.setItem("noor:quran-position", JSON.stringify({ surah: checkpoint.surah, ayah: checkpoint.ayah })); } };
  const updateFromTrack = (event: React.SyntheticEvent<HTMLAudioElement>) => { const nextTimestamp = event.currentTarget.currentTime; setTimestamp(nextTimestamp); const checkpoint = createAlignmentEngine().align(nextTimestamp, track); setLastConfirmed({ surah: checkpoint.surah, ayah: checkpoint.ayah }); window.localStorage.setItem("noor:quran-position", JSON.stringify({ surah: checkpoint.surah, ayah: checkpoint.ayah })); };
  return <main className={exiting ? "salah-mode salah-exit" : "salah-mode"}><header className="salah-header"><Link href="/" aria-label="Exit Salah Mode" onClick={exit}>×</Link><span>SALAH MODE</span><button aria-label="Toggle assistance" className={assistance ? "assistance active" : "assistance"} onClick={() => setAssistance(!assistance)}>◉</button></header><section className="salah-content"><p className="eyebrow">CURRENT PRAYER</p><h1>Asr</h1><p className="salah-time">4:42 <small>PM</small></p><div className="salah-divider" /><p className="eyebrow">QURAN FOLLOWING · KNOWN TRACK</p><div className="salah-position"><strong>{aligned.surah}:{aligned.ayah}</strong><span>Al-Fatihah · confidence {Math.round(aligned.confidence * 100)}%</span></div><div className="track-controls"><audio controls src="https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3" onTimeUpdate={updateFromTrack} /><button className={trackFollowing ? "track-button active" : "track-button"} onClick={() => setTrackFollowing(!trackFollowing)}>▶ {trackFollowing ? "Following along" : "Manual tracking"}</button><span>Reference track checkpoint {Math.round(timestamp)}s</span></div><div className="salah-divider" /><p className="eyebrow">RAKAH {Math.floor(rakah / 6) + 1} · MOVE GENTLY</p><div className="rakah-state"><span className="rakah-current">{rakahSteps[rakah]}</span><div className="rakah-dots">{rakahSteps.map((step, index) => <i className={index <= rakah ? "done" : ""} key={step + index} />)}</div></div><button className="advance-button" onClick={advance}>Advance to next position <span>→</span></button><div className="confirmed"><span>Last confirmed</span><b>Al-Fatihah {lastConfirmed.ayah}</b></div>{assistance && <p className="assistance-note">Quiet assistance is on. No notifications or navigation appear in Salah Mode.</p>}<div className="imam-note"><span>◌</span><p><b>Live imam following is not available yet.</b><br /><small>{liveStatus.status === "mock" ? "Manual tracking or a known reference track is available for now." : ""}</small></p></div></section></main>;
}
