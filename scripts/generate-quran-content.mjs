// One-time/regeneratable build script: turns the `quran-json` (Uthmani text,
// Sahih International translation, transliteration) and `quran-meta` (Hafs
// riwaya, 604-page Madani mushaf layout) npm datasets into the static files
// this app bundles under packages/quran-content. Run with:
//   node scripts/generate-quran-content.mjs
import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { findAyahIdBySurah, findPage, findJuz, getPageMeta, meta } from "quran-meta/hafs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "packages", "quran-content");
const nm = path.join(__dirname, "..", "node_modules", "quran-json", "dist");

const arabicChapters = JSON.parse(readFileSync(path.join(nm, "quran.json"), "utf8"));
const enChapters = JSON.parse(readFileSync(path.join(nm, "quran_en.json"), "utf8"));
const translitChapters = JSON.parse(readFileSync(path.join(nm, "quran_transliteration.json"), "utf8"));

const enBySurah = new Map(enChapters.map((c) => [c.id, c]));
const translitBySurah = new Map(translitChapters.map((c) => [c.id, c]));

const surahs = [];
const pages = new Map(); // page number -> [{ surah, ayah }]

for (const chapter of arabicChapters) {
  const surahNum = chapter.id;
  const en = enBySurah.get(surahNum);
  const translit = translitBySurah.get(surahNum);
  const ayahs = chapter.verses.map((verse) => {
    const ayahNum = verse.id;
    const globalAyahId = findAyahIdBySurah(surahNum, ayahNum);
    const page = findPage(surahNum, ayahNum);
    const juz = findJuz(surahNum, ayahNum);

    if (!pages.has(page)) pages.set(page, []);
    pages.get(page).push({ surah: surahNum, ayah: ayahNum });

    return {
      number: ayahNum,
      text: verse.text,
      translation: en?.verses.find((v) => v.id === ayahNum)?.translation ?? "",
      transliteration: translit?.verses.find((v) => v.id === ayahNum)?.transliteration ?? "",
      page,
      juz,
      audio: `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalAyahId}.mp3`,
    };
  });

  surahs.push({
    number: surahNum,
    name: chapter.transliteration,
    arabic: chapter.name,
    meaning: en?.translation ?? "",
    type: chapter.type,
    ayahs,
  });
}

const pageList = Array.from({ length: meta.numPages }, (_, i) => {
  const pageNum = i + 1;
  const pageMeta = getPageMeta(pageNum);
  return {
    page: pageNum,
    firstSurah: pageMeta.first[0],
    firstAyah: pageMeta.first[1],
    lastSurah: pageMeta.last[0],
    lastAyah: pageMeta.last[1],
    ayahs: pages.get(pageNum) ?? [],
  };
});

writeFileSync(
  path.join(outDir, "quran.json"),
  JSON.stringify({
    source: "Uthmani text + transliteration: quran-json (risan/quran-json, via Tanzil/QuranEnc); translation: Sahih International (Umm Muhammad, via Tanzil)",
    license: "CC-BY-SA 4.0 (quran-json); see packages/quran-content/README.md",
    surahCount: surahs.length,
    ayahCount: surahs.reduce((sum, s) => sum + s.ayahs.length, 0),
    surahs,
  }),
);

writeFileSync(
  path.join(outDir, "pages.json"),
  JSON.stringify({
    source: "604-page Madani mushaf layout (Hafs riwaya): quran-meta (quran-center/quran-meta)",
    pageCount: meta.numPages,
    pages: pageList,
  }),
);

console.log(`Wrote ${surahs.length} surahs / ${pageList.reduce((n, p) => n + p.ayahs.length, 0)} ayahs across ${pageList.length} pages.`);
