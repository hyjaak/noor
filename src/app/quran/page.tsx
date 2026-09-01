"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { useQuranPosition } from "@/lib/use-quran-position";

type WordTiming = { index: number; text: string; startMs: number; endMs: number };

type PageAyah = {
  surah: number;
  number: number;
  text: string;
  translation: string;
  transliteration: string;
  page: number;
  juz: number;
  audio: string;
  wordTiming: WordTiming[] | null;
};

type PageData = { page: number; pageCount: number; ayahs: PageAyah[] };
type SurahIndexEntry = { number: number; name: string; arabic: string; meaning: string; ayahCount: number; page: number };

const SPEEDS = [0.75, 1, 1.25, 1.5];

export default function QuranPage() {
  return (
    <Suspense fallback={<main className="page-shell"><p className="muted">Loading the reader…</p></main>}>
      <QuranReader />
    </Suspense>
  );
}

function QuranReader() {
  const searchParams = useSearchParams();
  const { notify } = useToast();

  const [pageData, setPageData] = useState<PageData | null>(null);
  const [surahIndex, setSurahIndex] = useState<SurahIndexEntry[]>([]);
  const [showTranslation, setShowTranslation] = useState(true);
  const [showTransliteration, setShowTransliteration] = useState(false);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(true);
  const [repeat, setRepeat] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [surahDrawerOpen, setSurahDrawerOpen] = useState(false);
  // Whether playback should continue onto the next page's first ayah once
  // the current page's last ayah finishes -- on by default so listening
  // doesn't stall on a manual "next page" click; easy to turn off.
  const [autoAdvancePage, setAutoAdvancePage] = useState(true);
  // Which word (by index, within the currently-playing ayah) audio is on --
  // driven off the <audio> timeupdate event, so it stays correct at any
  // playbackRate (currentTime always reflects real media position).
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);

  // Single source of truth for "where the user currently is" -- drives the
  // Surah Index highlight and the active-ayah marker, and is what gets
  // (debounced) persisted to QuranPosition.
  const { position, setPosition } = useQuranPosition();

  const audioRef = useRef<HTMLAudioElement>(null);
  const touchStartX = useRef<number | null>(null);
  const ayahRefs = useRef<Map<string, HTMLElement>>(new Map());
  const scrollRatios = useRef<Map<string, number>>(new Map());
  const pendingScrollKey = useRef<string | null>(null);
  const hasScrolled = useRef(false);
  // Set by a word tap so the next loadedmetadata seeks there instead of
  // starting the ayah from 0.
  const pendingSeekMs = useRef<number | null>(null);

  // Load the surah index (for the sidebar) and existing bookmarks once.
  useEffect(() => {
    // The browser's automatic scroll restoration on reload/back-forward would
    // otherwise fire a real `scroll` event and get mistaken for the user
    // scrolling -- we drive scroll position ourselves (page-turn, resume).
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    void fetch("/api/quran")
      .then((res) => res.json())
      .then((body: { data: { surahs: SurahIndexEntry[] } }) => setSurahIndex(body.data.surahs));
    void fetch("/api/bookmarks")
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((body: { data: { surah: number; ayah: number }[] }) =>
        setBookmarks(new Set(body.data.map((item) => `${item.surah}:${item.ayah}`))),
      );
    void fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { data: { transliteration?: boolean } } | null) => {
        if (body?.data) setShowTransliteration(Boolean(body.data.transliteration));
      });
  }, []);

  const loadPage = useCallback(
    (query: string, target?: { surah: number; ayah: number }, options?: { autoPlay?: boolean }) => {
      void fetch(`/api/quran?${query}`)
        .then((res) => res.json())
        .then((body: { data: PageData }) => {
          setPageData(body.data);
          const first = body.data.ayahs[0];
          // Inlined rather than calling playAyah() -- loadPage is memoized
          // with a stable dep list and shouldn't take on a changing dep just
          // to start playback; this only touches stable refs/setters anyway.
          if (options?.autoPlay && first) {
            pendingSeekMs.current = null;
            setActiveWordIndex(null);
            setPlayingIndex(0);
          } else {
            setPlayingIndex(null);
          }
          if (!first) return;
          const resolved =
            target && body.data.ayahs.some((item) => item.surah === target.surah && item.number === target.ayah)
              ? target
              : { surah: first.surah, ayah: first.number };
          // If we're resuming mid-page, scroll that ayah into view once its
          // ref is attached so the scroll-tracker agrees with it immediately.
          const isFirstAyah = resolved.surah === first.surah && resolved.ayah === first.number;
          pendingScrollKey.current = isFirstAyah ? null : `${resolved.surah}:${resolved.ayah}`;
          setPosition({ ...resolved, page: body.data.page }, { immediate: true });
        });
    },
    [setPosition],
  );

  // Track the most-visible ayah as the user scrolls the page, without
  // hammering the API -- setPosition() only debounces the persisted write.
  // Gated on a real `scroll` event so that a short page which already shows
  // every ayah at once can't "tie-break" the marker back to the first ayah
  // on load -- the explicitly navigated-to position stands until the user
  // actually scrolls.
  useEffect(() => {
    if (!pageData) return;
    scrollRatios.current.clear();
    hasScrolled.current = false;
    const markScrolled = () => {
      hasScrolled.current = true;
    };
    // Registered a frame late so a same-tick restoration/programmatic scroll
    // (e.g. the scrollIntoView below) isn't mistaken for a real user scroll.
    const armTimer = window.requestAnimationFrame(() => {
      window.addEventListener("scroll", markScrolled, { passive: true, once: true });
    });

    if (pendingScrollKey.current) {
      ayahRefs.current.get(pendingScrollKey.current)?.scrollIntoView({ block: "center" });
      pendingScrollKey.current = null;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const key = entry.target.getAttribute("data-ayah-key");
          if (!key) continue;
          scrollRatios.current.set(key, entry.isIntersecting ? entry.intersectionRatio : 0);
        }
        if (!hasScrolled.current) return;
        let bestKey: string | null = null;
        let bestRatio = 0;
        for (const [key, ratio] of scrollRatios.current) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestKey = key;
          }
        }
        if (bestKey === null) return;
        const [surahPart, ayahPart] = bestKey.split(":");
        setPosition({ surah: Number(surahPart), ayah: Number(ayahPart), page: pageData.page });
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    ayahRefs.current.forEach((el) => observer.observe(el));
    return () => {
      window.cancelAnimationFrame(armTimer);
      window.removeEventListener("scroll", markScrolled);
      observer.disconnect();
    };
  }, [pageData, setPosition]);

  const selectAyah = (ayah: PageAyah) => {
    if (!pageData) return;
    setPosition({ surah: ayah.surah, ayah: ayah.number, page: pageData.page }, { immediate: true });
  };

  // Resolve the initial page: continue-reading link (?surah&ayah), saved
  // position, or the first page of the mushaf.
  useEffect(() => {
    const surahParam = searchParams.get("surah");
    const ayahParam = searchParams.get("ayah");
    if (surahParam) {
      loadPage(`surah=${surahParam}&ayah=${ayahParam ?? "1"}`, { surah: Number(surahParam), ayah: Number(ayahParam ?? "1") });
      return;
    }
    void fetch("/api/position")
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { data: { surah: number; ayah: number } | null } | null) => {
        if (body?.data) loadPage(`surah=${body.data.surah}&ayah=${body.data.ayah}`, body.data);
        else loadPage("page=1");
      });
    // Runs once on mount; loadPage/searchParams are stable enough for this flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToPage = (page: number) => {
    if (!pageData || page < 1 || page > pageData.pageCount) return;
    loadPage(`page=${page}`);
  };

  const toggleBookmark = (ayah: PageAyah) => {
    const key = `${ayah.surah}:${ayah.number}`;
    setBookmarks((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    void fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "USER_BOOKMARKED_AYAH", surah: ayah.surah, ayah: ayah.number }),
    });
    notify(bookmarks.has(key) ? "Bookmark removed." : "Ayah bookmarked.");
  };

  const toggleTransliteration = () => {
    const next = !showTransliteration;
    setShowTransliteration(next);
    void fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transliteration: next }),
    });
  };

  // seekMs (if given) is applied once the new src's metadata loads -- see the
  // loadedmetadata effect below. Passing it also for the *current* ayah (tap
  // on a word while it's already playing) is handled directly in seekToWord.
  const playAyah = (index: number, seekMs?: number) => {
    pendingSeekMs.current = seekMs ?? null;
    setActiveWordIndex(null);
    setPlayingIndex(index);
  };

  // Actually start/seek playback once the audio element's src is ready --
  // src changes asynchronously load metadata, so setting currentTime right
  // after setPlayingIndex would often be ignored.
  useEffect(() => {
    if (playingIndex === null) return;
    const audio = audioRef.current;
    if (!audio) return;
    const start = () => {
      audio.playbackRate = speed;
      if (pendingSeekMs.current !== null) {
        audio.currentTime = pendingSeekMs.current / 1000;
        pendingSeekMs.current = null;
      }
      void audio.play();
    };
    if (audio.readyState >= 1) start();
    else {
      audio.addEventListener("loadedmetadata", start, { once: true });
      return () => audio.removeEventListener("loadedmetadata", start);
    }
    // speed intentionally excluded -- the speed <select> already updates
    // audioRef.current.playbackRate directly without replaying the ayah.
    // pageData?.page is included so auto-advancing into a page whose first
    // ayah happens to reuse index 0 (same as before) still retriggers --
    // otherwise React would see an unchanged playingIndex and skip this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playingIndex, pageData?.page]);

  const seekToWord = (index: number, word: WordTiming) => {
    if (playingIndex === index) {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = word.startMs / 1000;
      setActiveWordIndex(word.index);
      if (audio.paused) void audio.play();
    } else {
      playAyah(index, word.startMs);
    }
  };

  // Moves the highlighted word forward as audio plays -- currentTime always
  // reflects real media position, so this stays in sync at any playbackRate.
  const handleTimeUpdate = () => {
    const words = currentAyah?.wordTiming;
    const audio = audioRef.current;
    if (!words?.length || !audio) return;
    const ms = audio.currentTime * 1000;
    let found = words[0].index;
    for (const word of words) {
      if (ms >= word.startMs) found = word.index;
      else break;
    }
    setActiveWordIndex((prev) => (prev === found ? prev : found));
  };

  const handleEnded = () => {
    if (!pageData || playingIndex === null) return;
    if (repeat) {
      playAyah(playingIndex);
      return;
    }
    const nextIndex = playingIndex + 1;
    if (nextIndex < pageData.ayahs.length) {
      playAyah(nextIndex);
      // Smooth, physically-eased scroll to the new ayah so auto-advance
      // doesn't jump the page -- instant for prefers-reduced-motion.
      const next = pageData.ayahs[nextIndex];
      const el = ayahRefs.current.get(`${next.surah}:${next.number}`);
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      return;
    }
    // Last ayah of the page just finished.
    if (autoAdvancePage && pageData.page < pageData.pageCount) {
      // loadPage's own page-turn (the .mushaf-page remount) supplies the
      // same motion as a manual "next page" click -- nothing extra needed.
      loadPage(`page=${pageData.page + 1}`, undefined, { autoPlay: true });
      return;
    }
    setPlayingIndex(null);
  };

  const onTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current === null || !pageData) return;
    const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 60) return;
    if (delta < 0) goToPage(pageData.page + 1);
    else goToPage(pageData.page - 1);
  };

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSurahDrawerOpen(false);
        return;
      }
      if (!pageData) return;
      if (event.key === "ArrowRight") goToPage(pageData.page + 1);
      if (event.key === "ArrowLeft") goToPage(pageData.page - 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  const currentAyah = playingIndex !== null ? pageData?.ayahs[playingIndex] : undefined;

  return (
    <main className="page-shell reader-layout">
      <section className="reader-main">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              QURAN READER · MUSHAF PAGE {pageData?.page ?? "…"} OF {pageData?.pageCount ?? 604}
            </p>
            <h1>Read with presence.</h1>
          </div>
          <div className="reader-actions">
            <button
              aria-expanded={surahDrawerOpen}
              aria-controls="surah-index"
              className="quiet-button surah-index-toggle"
              onClick={() => setSurahDrawerOpen(true)}
            >
              Surahs
            </button>
            <button className="quiet-button" onClick={toggleTransliteration}>
              {showTransliteration ? "Hide transliteration" : "Show transliteration"}
            </button>
            <button className="quiet-button" onClick={() => setShowTranslation(!showTranslation)}>
              {showTranslation ? "Hide translation" : "Show translation"}
            </button>
          </div>
        </div>

        <div className="mushaf" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div className="mushaf-page" key={pageData?.page ?? 0}>
            <p className="mushaf-arabic">
              {pageData?.ayahs.map((ayah, index) => {
                const key = `${ayah.surah}:${ayah.number}`;
                const active = position?.surah === ayah.surah && position?.ayah === ayah.number;
                const playingHere = playingIndex === index;
                return (
                  <span
                    key={key}
                    data-ayah-key={key}
                    ref={(el) => {
                      if (el) ayahRefs.current.set(key, el);
                      else ayahRefs.current.delete(key);
                    }}
                  >
                    {ayah.wordTiming ? (
                      ayah.wordTiming.map((word) => (
                        <span
                          key={`${key}:${word.index}`}
                          className={playingHere && activeWordIndex === word.index ? "mushaf-word active-word" : "mushaf-word"}
                          onClick={() => seekToWord(index, word)}
                        >
                          {word.text}{" "}
                        </span>
                      ))
                    ) : (
                      <span onClick={() => selectAyah(ayah)} style={{ cursor: "pointer" }}>
                        {ayah.text}{" "}
                      </span>
                    )}
                    <span
                      className={active ? "mushaf-ayah-marker active" : "mushaf-ayah-marker"}
                      onClick={() => selectAyah(ayah)}
                      style={{ cursor: "pointer" }}
                    >
                      {ayah.number}
                    </span>{" "}
                  </span>
                );
              })}
            </p>

            {showTransliteration && (
              <div className="mushaf-translation">
                {pageData?.ayahs.map((ayah, index) => {
                  const active = position?.surah === ayah.surah && position?.ayah === ayah.number;
                  const playingHere = playingIndex === index;
                  return (
                    <p
                      className={[active && "active-ayah", playingHere && "active-audio"].filter(Boolean).join(" ") || undefined}
                      key={`translit-${ayah.surah}:${ayah.number}`}
                      onClick={() => selectAyah(ayah)}
                    >
                      <b>
                        {ayah.surah}:{ayah.number}
                      </b>{" "}
                      {ayah.transliteration}
                    </p>
                  );
                })}
              </div>
            )}

            {showTranslation && (
              <div className="mushaf-translation">
                {pageData?.ayahs.map((ayah, index) => {
                  const active = position?.surah === ayah.surah && position?.ayah === ayah.number;
                  return (
                    <p className={active ? "active-ayah" : undefined} key={`translation-${ayah.surah}:${ayah.number}`}>
                      <button
                        aria-label="Play ayah audio"
                        className="quiet-button"
                        onClick={() => {
                          selectAyah(ayah);
                          playAyah(index);
                        }}
                        style={{ marginRight: 8, padding: "3px 8px" }}
                      >
                        ▶
                      </button>
                      <button
                        aria-label="Bookmark ayah"
                        className="quiet-button"
                        onClick={() => toggleBookmark(ayah)}
                        style={{ marginRight: 8, padding: "3px 8px" }}
                      >
                        {bookmarks.has(`${ayah.surah}:${ayah.number}`) ? "★" : "☆"}
                      </button>
                      <b onClick={() => selectAyah(ayah)} style={{ cursor: "pointer" }}>
                        {ayah.surah}:{ayah.number}
                      </b>{" "}
                      {ayah.translation}
                    </p>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mushaf-nav">
            <button disabled={!pageData || pageData.page <= 1} onClick={() => pageData && goToPage(pageData.page - 1)}>
              ← Previous page
            </button>
            <button
              disabled={!pageData || pageData.page >= pageData.pageCount}
              onClick={() => pageData && goToPage(pageData.page + 1)}
            >
              Next page →
            </button>
          </div>
        </div>


        <div className="audio-bar">
          <button
            aria-label={isPaused ? "Play" : "Pause"}
            onClick={() => {
              if (playingIndex === null) playAyah(0);
              else {
                const audio = audioRef.current;
                if (audio?.paused) void audio.play();
                else audio?.pause();
              }
            }}
          >
            {isPaused ? "▶" : "❚❚"}
          </button>
          <button
            aria-label="Toggle repeat"
            className={repeat ? "active" : undefined}
            onClick={() => setRepeat(!repeat)}
            style={{ color: repeat ? "var(--teal)" : undefined }}
          >
            ↻
          </button>
          <button
            aria-label="Toggle auto-advance to next page"
            title={autoAdvancePage ? "Auto-advance to next page: on" : "Auto-advance to next page: off"}
            className={autoAdvancePage ? "active" : undefined}
            onClick={() => setAutoAdvancePage(!autoAdvancePage)}
            style={{ color: autoAdvancePage ? "var(--teal)" : undefined }}
          >
            ⏭
          </button>
          <select
            value={speed}
            onChange={(event) => {
              const next = Number(event.target.value);
              setSpeed(next);
              if (audioRef.current) audioRef.current.playbackRate = next;
            }}
          >
            {SPEEDS.map((value) => (
              <option key={value} value={value}>
                {value}×
              </option>
            ))}
          </select>
          <span className="muted">
            {currentAyah ? `Playing ${currentAyah.surah}:${currentAyah.number}` : "Tap ▶ on any ayah to listen"}
          </span>
          <audio
            ref={audioRef}
            src={currentAyah?.audio}
            onEnded={handleEnded}
            onPlay={() => setIsPaused(false)}
            onPause={() => setIsPaused(true)}
            onTimeUpdate={handleTimeUpdate}
          />
        </div>
      </section>

      <button
        aria-label="Close Surah Index"
        className={surahDrawerOpen ? "surah-backdrop open" : "surah-backdrop"}
        onClick={() => setSurahDrawerOpen(false)}
      />
      <aside
        aria-hidden={!surahDrawerOpen}
        aria-label="Surah Index"
        className={surahDrawerOpen ? "surah-list glass-card open" : "surah-list glass-card"}
        id="surah-index"
      >
        <button aria-label="Close Surah Index" className="surah-list-close" onClick={() => setSurahDrawerOpen(false)}>
          ×
        </button>
        <p className="eyebrow">SURAH INDEX</p>
        {surahIndex.map((surah) => (
          <button
            className={position?.surah === surah.number ? "surah-option active" : "surah-option"}
            key={surah.number}
            onClick={() => {
              goToPage(surah.page);
              setSurahDrawerOpen(false);
            }}
          >
            <span>{surah.number}</span>
            <span>
              <b>{surah.name}</b>
              <small>{surah.meaning}</small>
            </span>
            <i>{surah.arabic}</i>
          </button>
        ))}
      </aside>
    </main>
  );
}
