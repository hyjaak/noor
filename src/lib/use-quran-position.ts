"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type QuranPositionValue = { surah: number; ayah: number; page: number };

const PERSIST_DELAY_MS = 1200;

/**
 * Single source of truth for "where the user currently is" in the reader.
 * The visual `position` updates instantly (for the Surah Index highlight
 * and the active-ayah marker); the QuranPosition/LearningEvent API writes
 * are debounced so scrolling never hammers the database.
 */
export function useQuranPosition() {
  const [position, setPositionState] = useState<QuranPositionValue | null>(null);
  const pendingRef = useRef<QuranPositionValue | null>(null);
  const timerRef = useRef<number | null>(null);

  const flush = useCallback((keepalive = false) => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    void fetch("/api/position", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pending),
      keepalive,
    });
    void fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "USER_READ_AYAH", payload: { ...pending, durationSeconds: 60 } }),
      keepalive,
    });
  }, []);

  const setPosition = useCallback(
    (next: QuranPositionValue, options?: { immediate?: boolean }) => {
      setPositionState((current) =>
        current && current.surah === next.surah && current.ayah === next.ayah ? current : next,
      );

      // An explicit navigation (page/surah change, click) should persist
      // whatever scroll position was still pending before jumping away.
      if (options?.immediate) flush();

      pendingRef.current = next;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      if (options?.immediate) flush();
      else timerRef.current = window.setTimeout(() => flush(), PERSIST_DELAY_MS);
    },
    [flush],
  );

  useEffect(() => {
    const flushOnHide = () => {
      if (document.visibilityState === "hidden") flush(true);
    };
    const flushOnUnload = () => flush(true);
    window.addEventListener("beforeunload", flushOnUnload);
    document.addEventListener("visibilitychange", flushOnHide);
    return () => {
      window.removeEventListener("beforeunload", flushOnUnload);
      document.removeEventListener("visibilitychange", flushOnHide);
      flush(true);
    };
  }, [flush]);

  return { position, setPosition, flush } as const;
}
