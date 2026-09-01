export type LearningEvent = { type: string; payload: Record<string, unknown>; createdAt?: Date };
export type WeakPoint = { title: string; detail: string; category: "consistency" | "fluency" | "focus" | "pronunciation"; confidence: number };
export type WeakPointResult = { status: "mock" | "real"; points: WeakPoint[] };
export interface WeakPointEngine { detect(events: LearningEvent[]): Promise<WeakPointResult>; }
export type RecitationInput = { surah: number; ayah: number; durationSeconds: number; audioBytes: number; referenceDurationSeconds?: number };
export type RecitationFeedback = { title: string; detail: string; kind: "pacing" | "capture" | "encouragement" };
export type RecitationResult = { status: "mock" | "real"; accuracy: number; fluency: number; pronunciation: number; feedback: RecitationFeedback[]; analysisMode: "batch-best-effort" };
export interface RecitationEngine { analyze(input: RecitationInput): Promise<RecitationResult>; }
export type AlignmentPoint = { atSeconds: number; surah: number; ayah: number };
export type AlignmentResult = { status: "mock" | "real"; mode: "known-track" | "live-imam"; confidence: number; surah: number; ayah: number };
export interface AlignmentEngine { align(timestampSeconds: number, points: AlignmentPoint[]): AlignmentResult; }
export type VisionInput = { imageBytes: number; mimeType: string };
export type VisionResult = { status: "mock" | "real"; confidence: number; surah: number | null; page: number | null; ayah: number | null; reason?: string };
export interface VisionEngine { identify(input: VisionInput): Promise<VisionResult>; }
