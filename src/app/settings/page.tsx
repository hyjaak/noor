"use client";
import { useEffect, useState } from "react";

type Settings = {
  location: string;
  latitude: number;
  longitude: number;
  locationSet: boolean;
  calculationMethod: string;
  madhab: string;
  prayerOffsets: Partial<Record<"Fajr" | "Sunrise" | "Dhuhr" | "Asr" | "Maghrib" | "Isha", number>>;
  silenceEnabled: boolean;
  silenceWindowMinutes: number;
  transliteration: boolean;
  notifications: boolean;
  recordingRetention: string;
  learningLevel: string;
  language: string;
};

const CALCULATION_METHODS: [string, string][] = [
  ["MWL", "Muslim World League"],
  ["Egyptian", "Egyptian General Authority"],
  ["Karachi", "University of Islamic Sciences, Karachi"],
  ["UmmAlQura", "Umm al-Qura, Makkah"],
  ["Dubai", "Dubai"],
  ["MoonsightingCommittee", "Moonsighting Committee"],
  ["NorthAmerica", "ISNA (North America)"],
  ["Kuwait", "Kuwait"],
  ["Qatar", "Qatar"],
  ["Singapore", "Singapore"],
  ["Tehran", "Tehran"],
  ["Turkey", "Turkey"],
];

const OFFSET_PRAYERS = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/settings");
      if (!response.ok) return;
      const body = (await response.json()) as { data: Settings };
      setSettings(body.data);
    })();
  }, []);

  const updateFont = (value: string) => {
    const normalized = value.toLowerCase();
    if (["small", "medium", "large"].includes(normalized)) {
      localStorage.setItem("noor:font-size", normalized);
      document.documentElement.dataset.font = normalized;
    }
  };

  const patch = (changes: Partial<Settings>) => {
    setSettings((current) => (current ? { ...current, ...changes } : current));
    setSaved(false);
  };

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocationError("Geolocation is not available in this browser.");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        patch({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          location: "Current location",
          locationSet: true,
        });
        setLocating(false);
      },
      () => {
        setLocationError("Could not read your location. You can leave it as-is or try again.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const save = async () => {
    if (!settings) return;
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaved(true);
  };

  if (!settings) {
    return (
      <main className="page-shell narrow-shell">
        <p className="muted">Loading your settings…</p>
      </main>
    );
  }

  return (
    <main className="page-shell narrow-shell">
      <div className="section-heading">
        <div>
          <p className="eyebrow">PREFERENCES</p>
          <h1>Settings</h1>
          <p className="lede">Shape Noor around the way you learn and worship.</p>
        </div>
        <button className="primary-button save-button" onClick={() => void save()}>
          {saved ? "Saved" : "Save changes"}
        </button>
      </div>

      <div className="settings-groups">
        <section className="settings-group glass-card">
          <p className="eyebrow">READING</p>
          <label className="setting-row">
            <span>Transliteration</span>
            <select
              value={settings.transliteration ? "On" : "Off"}
              onChange={(event) => patch({ transliteration: event.target.value === "On" })}
            >
              <option>Off</option>
              <option>On</option>
            </select>
          </label>
          <label className="setting-row">
            <span>Font size</span>
            <select defaultValue="Medium" onChange={(event) => updateFont(event.target.value)}>
              <option>Small</option>
              <option>Medium</option>
              <option>Large</option>
            </select>
          </label>
        </section>

        <section className="settings-group glass-card">
          <p className="eyebrow">PRAYER &amp; QIBLA</p>
          <label className="setting-row">
            <span>Calculation method</span>
            <select
              value={settings.calculationMethod}
              onChange={(event) => patch({ calculationMethod: event.target.value })}
            >
              {CALCULATION_METHODS.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="setting-row">
            <span>Madhab</span>
            <select value={settings.madhab} onChange={(event) => patch({ madhab: event.target.value })}>
              <option value="shafii">Shafi&apos;i</option>
              <option value="hanafi">Hanafi</option>
            </select>
          </label>
          <div className="setting-row location-row">
            <span>
              Location
              <br />
              <small className="muted">
                {settings.locationSet
                  ? `${settings.latitude.toFixed(4)}, ${settings.longitude.toFixed(4)}`
                  : "Not set · using a placeholder location"}
              </small>
            </span>
            <button className="quiet-button" disabled={locating} onClick={useMyLocation} type="button">
              {locating ? "Locating…" : "Use my location"}
            </button>
          </div>
          {locationError ? (
            <p className="muted" role="alert">
              {locationError}
            </p>
          ) : null}

          <p className="eyebrow offsets-heading">PER-PRAYER MINUTE OFFSETS</p>
          <div className="offsets-grid">
            {OFFSET_PRAYERS.map((prayer) => (
              <label className="offset-field" key={prayer}>
                <span>{prayer}</span>
                <input
                  type="number"
                  step={1}
                  value={settings.prayerOffsets[prayer] ?? 0}
                  onChange={(event) =>
                    patch({
                      prayerOffsets: {
                        ...settings.prayerOffsets,
                        [prayer]: Number(event.target.value),
                      },
                    })
                  }
                />
              </label>
            ))}
          </div>
        </section>

        <section className="settings-group glass-card">
          <p className="eyebrow">PRAYER SILENCE</p>
          <label className="setting-row">
            <span>Noor is quiet during prayer</span>
            <select
              value={settings.silenceEnabled ? "On" : "Off"}
              onChange={(event) => patch({ silenceEnabled: event.target.value === "On" })}
            >
              <option>On</option>
              <option>Off</option>
            </select>
          </label>
          <label className="setting-row">
            <span>Quiet window length (minutes after prayer starts)</span>
            <input
              type="number"
              min={0}
              max={120}
              value={settings.silenceWindowMinutes}
              onChange={(event) => patch({ silenceWindowMinutes: Number(event.target.value) })}
            />
          </label>
          <p className="muted quiet-explainer">
            This only mutes Noor&apos;s own in-app sounds, badges, and non-urgent pushes. It does not
            change your device&apos;s ringer or Do Not Disturb settings.
          </p>
        </section>

        <section className="settings-group glass-card">
          <p className="eyebrow">YOUR NOOR</p>
          <label className="setting-row">
            <span>Learning level</span>
            <select value={settings.learningLevel} onChange={(event) => patch({ learningLevel: event.target.value })}>
              <option value="adult_beginner">Adult beginner</option>
              <option value="child">Child</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
          <label className="setting-row">
            <span>Language</span>
            <select value={settings.language} onChange={(event) => patch({ language: event.target.value })}>
              <option>English</option>
            </select>
          </label>
          <label className="setting-row">
            <span>Notifications</span>
            <select
              value={settings.notifications ? "On" : "Off"}
              onChange={(event) => patch({ notifications: event.target.value === "On" })}
            >
              <option>On</option>
              <option>Off</option>
            </select>
          </label>
        </section>

        <section className="settings-group glass-card">
          <p className="eyebrow">VOICE PRIVACY</p>
          <label className="setting-row">
            <span>Recording retention</span>
            <select
              value={settings.recordingRetention}
              onChange={(event) => patch({ recordingRetention: event.target.value })}
            >
              <option value="session">Session only</option>
              <option value="7d">7 days</option>
              <option value="30d">30 days</option>
            </select>
          </label>
        </section>
      </div>

      <p className="privacy-note">
        Your preferences are yours. Noor does not sell personal data or store voice recordings in this
        foundation phase.
      </p>
    </main>
  );
}

