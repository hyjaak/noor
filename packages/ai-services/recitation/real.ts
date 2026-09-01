import type { RecitationEngine, RecitationInput, RecitationResult } from "../types";

/** Batch capture-quality analysis only. Phoneme scoring needs a speech model/API and is intentionally not claimed here. */
export class BestEffortRecitationEngine implements RecitationEngine {
  async analyze(input: RecitationInput): Promise<RecitationResult> {
    const duration = Math.max(1, input.durationSeconds);
    const pacing = input.referenceDurationSeconds ? Math.max(0, Math.min(100, 100 - Math.abs(duration - input.referenceDurationSeconds) / input.referenceDurationSeconds * 100)) : Math.min(100, 45 + duration * 2);
    const capture = input.audioBytes > 500 ? 88 : 35;
    const fluency = Math.round((pacing + capture) / 2);
    return { status: "real", accuracy: capture, pronunciation: capture, fluency, analysisMode: "batch-best-effort", feedback: [
      { kind: "capture", title: capture > 60 ? "Your recording came through clearly" : "Try a quieter recording space", detail: capture > 60 ? "The recording has enough signal for this best-effort check." : "The captured file is very small. Move closer to your microphone and try again." },
      { kind: "pacing", title: fluency > 70 ? "Your pace looks steady" : "Leave a little more space", detail: fluency > 70 ? "A calm pace gives each ayah room to settle." : "Try the slow mode once, then return to your natural pace." },
      { kind: "encouragement", title: "One more gentle listen", detail: "This check cannot hear individual Arabic phonemes yet. Use the reference audio to guide your next attempt." },
    ] };
  }
}
