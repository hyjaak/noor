"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type QiblaData = {
  location: string | null;
  latitude: number;
  longitude: number;
  locationSet: boolean;
  bearing: number;
};

export default function QiblaPage() {
  const [data, setData] = useState<QiblaData | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [needsCalibration, setNeedsCalibration] = useState(false);
  const readings = useRef<number[]>([]);
  const orientationSupported = useRef(false);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/qibla");
      if (!response.ok) return;
      const body = (await response.json()) as { data: QiblaData };
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
            }).then(() => fetch("/api/qibla"))
              .then((res) => (res.ok ? res.json() : null))
              .then((refreshed: { data: QiblaData } | null) => {
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

  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent & { webkitCompassHeading?: number }) => {
      orientationSupported.current = true;
      const compassHeading =
        typeof event.webkitCompassHeading === "number"
          ? event.webkitCompassHeading
          : event.absolute && event.alpha !== null
            ? 360 - event.alpha
            : null;
      if (compassHeading === null) return;

      readings.current.push(compassHeading);
      if (readings.current.length > 12) readings.current.shift();
      // A compass stuck on (near) the same reading for a while, or with an
      // accuracy the device flags as unreliable, needs a figure-8 calibration.
      const distinct = new Set(readings.current.map((value) => Math.round(value)));
      if (readings.current.length >= 8 && distinct.size <= 1) {
        setNeedsCalibration(true);
      } else if (distinct.size > 1) {
        setNeedsCalibration(false);
      }

      setHeading(compassHeading);
    };

    type OrientationEventCtor = typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    const ctor = window.DeviceOrientationEvent as OrientationEventCtor | undefined;

    if (ctor?.requestPermission) {
      ctor
        .requestPermission()
        .then((state) => {
          if (state === "granted") {
            window.addEventListener("deviceorientationabsolute", handleOrientation, true);
            window.addEventListener("deviceorientation", handleOrientation, true);
          } else {
            setNeedsCalibration(true);
          }
        })
        .catch(() => setNeedsCalibration(true));
    } else if (typeof DeviceOrientationEvent !== "undefined") {
      window.addEventListener("deviceorientationabsolute", handleOrientation, true);
      window.addEventListener("deviceorientation", handleOrientation, true);
      window.setTimeout(() => {
        if (!orientationSupported.current) setNeedsCalibration(true);
      }, 2000);
    } else {
      globalThis.setTimeout(() => setNeedsCalibration(true), 0);
    }

    return () => {
      window.removeEventListener("deviceorientationabsolute", handleOrientation, true);
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, []);

  const bearing = data?.bearing ?? 0;
  const needleRotation = heading === null ? bearing : bearing - heading;

  return (
    <main className="page-shell narrow-shell">
      <div className="section-heading">
        <div>
          <p className="eyebrow">QIBLA · {data?.location ?? "LOCATING…"}</p>
          <h1>Face the sacred direction.</h1>
          <p className="lede">Bearing calculated from your real coordinates.</p>
        </div>
        <Link href="/settings" className="quiet-button">
          Update location
        </Link>
      </div>
      <section className="qibla-stage glass-card">
        <div className="compass">
          <span className="north">N</span>
          <span className="needle" style={{ transform: `rotate(${needleRotation}deg)` }}>
            ✦
          </span>
          <span className="bearing">{Math.round(bearing)}°</span>
        </div>
        <div className="qibla-note">
          <p className="eyebrow">YOUR QIBLA BEARING</p>
          <strong>{bearing.toFixed(1)}°</strong>
          <p className="muted">
            From true north · {heading === null ? "point your device to use live compass tracking" : "tracking your device heading"}
          </p>
        </div>
      </section>
      {needsCalibration ? (
        <div className="calibration-banner" role="status">
          <span>∞</span>
          <p>
            <b>Compass calibration needed.</b>
            <br />
            Move your phone in a slow figure-8 a few times to help it find true north.
          </p>
        </div>
      ) : null}
    </main>
  );
}

