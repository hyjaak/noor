import Link from "next/link";

type ContinueCardProps = {
  position: {
    surah: number;
    ayah: number;
    surahName: string;
    arabic: string;
  } | null;
};

export function ContinueCard({ position }: ContinueCardProps) {
  if (!position) {
    return (
      <article className="continue-card glass-card">
        <div className="card-heading">
          <span className="surah-mark">☽</span>
          <div>
            <p className="eyebrow">CONTINUE QURAN</p>
            <h2>Start reading</h2>
          </div>
        </div>
        <p className="muted">Your synced reading position will appear here once you begin.</p>
        <Link className="primary-button" href="/quran">
          Open Quran <span>→</span>
        </Link>
      </article>
    );
  }

  return (
    <article className="continue-card glass-card">
      <div className="card-heading">
        <span className="surah-mark">{position.surah}</span>
        <div>
          <p className="eyebrow">CONTINUE QURAN</p>
          <h2>{position.surahName}</h2>
        </div>
      </div>
      {position.arabic ? <p className="arabic">{position.arabic}</p> : null}
      <p className="muted">Ayah {position.ayah}</p>
      <Link className="primary-button" href={`/quran?surah=${position.surah}&ayah=${position.ayah}`}>
        Continue reading <span>→</span>
      </Link>
    </article>
  );
}
