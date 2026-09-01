import type { VisionEngine, VisionInput, VisionResult } from "../types";

/** Placeholder boundary: reliable Arabic OCR matching is not available without an OCR runtime and full licensed corpus. */
export class VisionMockEngine implements VisionEngine {
  async identify(input: VisionInput): Promise<VisionResult> {
    void input;
    return { status: "mock", confidence: 0, surah: null, page: null, ayah: null, reason: "OCR text matching is not configured for this foundation build." };
  }
}
