"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DAILY_PRAYERS } from "@/lib/prayer-utils";

type PrayerData = {
  location: string;
  locationSet: boolean;
  method: string;
  madhab: string;
  times: Record<string, string>;
  nextPrayer: { name: string };
};

function to12Hour(time24: string): { time: string; period: string } {
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return { time: `${hour12}:${minutes.toString().padStart(2, "0")}`, period };
}

export default function PrayerPage() {
  const [data, setData] = useState<PrayerData | null>(null);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/prayer");
      if (!response.ok) return;
      const body = (await response.json()) as { data: PrayerData };
      setData(body.data);

      if (!body.data.locationSet && "geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            void fetch("/api/settings", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                location: "Current location",
                locationSet: true,
              }),
            }).then(() => fetch("/api/prayer"))
              .then((res) => (res.ok ? res.json() : null))
              .then((refreshed: { data: PrayerData } | null) => {
                if (refreshed) setData(refreshed.data);
              });
          },
          () => {
            // Geolocation denied/unavailable: keep the saved/default coordinates.
          },
        );
      }
    })();
  }, []);

  const rows = ["Fajr", "Sunrise", ...DAILY_PRAYERS.slice(1)];

  return (
    <main className="page-shell narrow-shell">
      <div className="section-heading">
        <div>
          <p className="eyebrow">PRAYER TIMES · {data?.location ?? "LOCATING…"}</p>
          <h1>Make space for salah.</h1>
          <p className="lede">
            Calculated for your real location · {data?.method ?? "MWL"} · {data?.madhab ?? "shafii"}
          </p>
        </div>
        <Link href="/settings" className="quiet-button">
          Change location
        </Link>
      </div>
      <section className="prayer-list glass-card">
        {rows.map((name) => {
          const time24 = data?.times?.[name];
          const { time, period } = time24 ? to12Hour(time24) : { time: "--:--", period: "" };
          const isCurrent = data?.nextPrayer?.name === name;
          return (
            <div className={isCurrent ? "prayer-row current" : "prayer-row"} key={name}>
              <span className="prayer-icon">{isCurrent ? "◉" : "○"}</span>
              <b>{name}</b>
              <span className="prayer-time-small">
                {time} <small>{period}</small>
              </span>
              {isCurrent && <em>Next prayer</em>}
            </div>
          );
        })}
      </section>
      <div className="info-band">
        <span>⌖</span>
        <p>
          <b>Location-based times</b>
          <br />
          <small>Times are calculated from your real coordinates using the adhan library, including the high-latitude rule where needed. No external prayer API is required.</small>
        </p>
      </div>
    </main>
  );
}

