"use client";
import { createContext, useContext, useEffect, useState } from "react";

type QuietState = {
  quiet: boolean;
  nextPrayerName: string | null;
  silenceWindowMinutes: number;
};

const defaultState: QuietState = { quiet: false, nextPrayerName: null, silenceWindowMinutes: 15 };

const QuietContext = createContext<QuietState>(defaultState);

export function useQuiet(): QuietState {
  return useContext(QuietContext);
}

type PrayerApiResponse = {
  data?: {
    nextPrayer?: { name: string };
    previousPrayer?: { at: string };
    silence?: { enabled: boolean; windowMinutes: number };
  };
};

// Polls the real prayer schedule and derives whether Noor should be quiet
// right now -- in-app only: this never touches the device's ringer/DND.
export function QuietProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<QuietState>(defaultState);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/prayer");
        if (!response.ok) return;
        const body = (await response.json()) as PrayerApiResponse;
        const data = body.data;
        if (cancelled || !data?.previousPrayer || !data.silence) return;

        const windowMs = data.silence.windowMinutes * 60000;
        const previousAt = new Date(data.previousPrayer.at).getTime();
        const quiet = data.silence.enabled && Date.now() < previousAt + windowMs;

        setState({
          quiet,
          nextPrayerName: data.nextPrayer?.name ?? null,
          silenceWindowMinutes: data.silence.windowMinutes,
        });
      } catch {
        // Network hiccup: keep the last known state rather than guessing quiet.
      }
    };

    void load();
    const timer = window.setInterval(load, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return <QuietContext.Provider value={state}>{children}</QuietContext.Provider>;
}
