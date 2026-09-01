import type { AlignmentEngine, AlignmentPoint, AlignmentResult } from "../types";

/** Achievable MVP: map a known local/reference track timestamp to supplied ayah checkpoints. */
export class KnownTrackAlignmentEngine implements AlignmentEngine {
  align(timestampSeconds: number, points: AlignmentPoint[]): AlignmentResult {
    const ordered = [...points].sort((first, second) => first.atSeconds - second.atSeconds);
    const current = ordered.reduce((match, point) => point.atSeconds <= timestampSeconds ? point : match, ordered[0]);
    return { status: "real", mode: "known-track", confidence: current ? 0.98 : 0, surah: current?.surah ?? 1, ayah: current?.ayah ?? 1 };
  }
}