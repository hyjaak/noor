import { NextResponse } from "next/server";
import { getPage, getPageForAyah, getWordTiming, PAGE_COUNT, surahs, type MushafPage } from "@/lib/quran";

// Attach real per-word audio timing where we have it (null otherwise, so the
// reader knows to fall back to ayah-level sync for that ayah).
function withWordTiming(data: MushafPage) {
  return {
    ...data,
    ayahs: data.ayahs.map((ayah) => ({ ...ayah, wordTiming: getWordTiming(ayah.surah, ayah.number) ?? null })),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pageParam = searchParams.get("page");
  const surahParam = searchParams.get("surah");
  const ayahParam = searchParams.get("ayah");

  if (pageParam) {
    const page = Number(pageParam);
    const data = getPage(page);
    if (!data) return NextResponse.json({ error: "Page not found." }, { status: 404 });
    return NextResponse.json({ status: "real", data: { ...withWordTiming(data), pageCount: PAGE_COUNT } });
  }

  if (surahParam) {
    const surah = Number(surahParam);
    const ayah = Number(ayahParam ?? "1");
    const page = getPageForAyah(surah, ayah);
    if (!page) return NextResponse.json({ error: "Ayah not found." }, { status: 404 });
    const data = getPage(page);
    if (!data) return NextResponse.json({ error: "Page not found." }, { status: 404 });
    return NextResponse.json({ status: "real", data: { ...withWordTiming(data), pageCount: PAGE_COUNT } });
  }

  return NextResponse.json({
    status: "local",
    data: {
      pageCount: PAGE_COUNT,
      surahs: surahs.map((surah) => ({
        number: surah.number,
        name: surah.name,
        arabic: surah.arabic,
        meaning: surah.meaning,
        ayahCount: surah.ayahs.length,
        page: getPageForAyah(surah.number, 1) ?? 1,
      })),
    },
  });
}
