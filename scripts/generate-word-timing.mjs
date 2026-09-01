// Turns the real per-word audio segment data published by cpfair/quran-align
// (packages/quran-content/source/alafasy-word-timing.raw.json) into a compact
// surah:ayah-keyed lookup: packages/quran-content/word-timing.json. Run with:
//   node scripts/generate-word-timing.mjs
//
// The raw file times the "Alafasy_128kbps" everyayah.com recording -- the
// same Mishary Alafasy 128kbps recitation our audio URLs already point at
// (cdn.islamic.network/quran/audio/128/ar.alafasy), so the timestamps line
// up with the audio files this app plays.
//
// Each raw entry is { surah, ayah, segments: [[wordStart, wordEnd, startMs, endMs], ...] }
// where word indices are 0-based positions in the ayah's text split on
// whitespace. We validate that against our own Arabic text (packages/quran-
// content/quran.json) and only emit ayahs where the segments' word range
// exactly covers every word -- anything that doesn't line up is left out
// entirely (the reader falls back to ayah-level sync for those ayahs) rather
// than shipping a guessed/partial alignment.
import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "packages", "quran-content");

const raw = JSON.parse(readFileSync(path.join(outDir, "source", "alafasy-word-timing.raw.json"), "utf8"));
const quran = JSON.parse(readFileSync(path.join(outDir, "quran.json"), "utf8"));

const textByAyah = new Map();
for (const surah of quran.surahs) {
  for (const ayah of surah.ayahs) {
    textByAyah.set(`${surah.number}:${ayah.number}`, ayah.text);
  }
}

const ayahs = {};
let covered = 0;
let skipped = 0;

for (const entry of raw) {
  const key = `${entry.surah}:${entry.ayah}`;
  const text = textByAyah.get(key);
  if (!text) {
    skipped++;
    continue;
  }
  const words = text.split(/\s+/).filter(Boolean);
  const segments = [...entry.segments].sort((a, b) => a[2] - b[2]);

  // Segments must be contiguous, in word order, and cover every word --
  // otherwise we can't trust the index-to-word mapping for this ayah.
  let expectedStart = 0;
  let valid = segments.length > 0;
  for (const [wordStart, wordEnd] of segments) {
    if (wordStart !== expectedStart || wordEnd <= wordStart) {
      valid = false;
      break;
    }
    expectedStart = wordEnd;
  }
  if (valid && expectedStart !== words.length) valid = false;

  if (!valid) {
    skipped++;
    continue;
  }

  ayahs[key] = segments.map(([wordStart, wordEnd, startMs, endMs], index) => ({
    i: index,
    t: words.slice(wordStart, wordEnd).join(" "),
    s: startMs,
    e: endMs,
  }));
  covered++;
}

writeFileSync(
  path.join(outDir, "word-timing.json"),
  JSON.stringify({
    source: "cpfair/quran-align (release-2016-11-24, Alafasy_128kbps.json)",
    license: "CC-BY 4.0 -- see packages/quran-content/source/quran-align-LICENSE.txt",
    reciter: "Mishary Rashid Alafasy, 128kbps (everyayah.com-style recording; matches the ar.alafasy audio this app already plays)",
    note: "Machine-aligned (CMU Sphinx forced alignment against the recitation audio), not manually verified per-word. Ayahs whose segment word-ranges didn't exactly cover the ayah's text were omitted rather than guessed.",
    ayahCount: covered,
    skippedAyahCount: skipped,
    ayahs,
  }),
);

console.log(`Word timing: ${covered} ayahs covered, ${skipped} skipped (no reliable alignment).`);
