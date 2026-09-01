import type { AlignmentResult } from "../types";
export function liveImamAlignmentMock(): AlignmentResult { return { status: "mock", mode: "live-imam", confidence: 0, surah: 1, ayah: 1 }; }