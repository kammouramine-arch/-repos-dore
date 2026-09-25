// The DoOnce gateway contract. Mirrors DoOnceCore's ProcedureAnalysisRequest / Response exactly
// (camelCase keys, seconds as numbers, ISO-8601 dates). Change both sides together.
import { z } from "zod";

export const RiskLevel = z.enum(["low", "medium", "high"]);
export const Provenance = z.enum(["observed", "inferred", "unclear"]);

export const TranscriptSegment = z.object({
  id: z.string().optional(),
  start: z.number().min(0),
  end: z.number().min(0),
  text: z.string(),
  words: z.array(z.object({ text: z.string(), start: z.number(), end: z.number() })).optional(),
});

export const Transcript = z.object({
  segments: z.array(TranscriptSegment),
  keyPhrases: z.array(z.string()).default([]),
  language: z.string().default("en"),
});

export const DetectedMoment = z.object({
  id: z.string().optional(),
  time: z.number().min(0),
  kind: z.string(),
  confidence: z.number().min(0).max(1).default(1),
  label: z.string().nullable().optional(),
});

export const KeyFrameReference = z.object({
  id: z.string().min(1),
  time: z.number().min(0),
  jpegBase64: z.string().nullable().optional(),
  url: z.string().url().nullable().optional(),
});

export const ObjectHint = z.object({
  name: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
});

export const AnalysisRequest = z.object({
  recordingID: z.string().uuid(),
  duration: z.number().positive(),
  locale: z.string().default("en"),
  transcript: Transcript,
  markers: z.array(z.number().min(0)).default([]),
  moments: z.array(DetectedMoment).default([]),
  keyFrames: z.array(KeyFrameReference).max(24).default([]),
  objectHint: ObjectHint.nullable().optional(),
  demonstratorName: z.string().nullable().optional(),
});
export type AnalysisRequest = z.infer<typeof AnalysisRequest>;

export const AnalyzedStep = z.object({
  order: z.number().int().min(1),
  instruction: z.string(),
  detail: z.string().nullable(),
  sourceStart: z.number().nullable(),
  sourceEnd: z.number().nullable(),
  sourceTranscript: z.string().nullable(),
  keyFrameReference: z.string().nullable(),
  warning: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  provenance: Provenance,
});
export type AnalyzedStep = z.infer<typeof AnalyzedStep>;

export const ObjectCandidate = z.object({
  name: z.string(),
  category: z.string(),
  brand: z.string().nullable(),
  model: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

export const AnalysisResponse = z.object({
  title: z.string(),
  shortDescription: z.string(),
  objectCandidate: ObjectCandidate.nullable(),
  durationEstimate: z.number().nullable(),
  tools: z.array(z.string()),
  warnings: z.array(z.string()),
  riskLevel: RiskLevel,
  steps: z.array(AnalyzedStep),
  uncertainties: z.array(z.string()),
});
export type AnalysisResponse = z.infer<typeof AnalysisResponse>;

/** The sentence the app shows for a step that was not captured. Must match DoOnceCore. */
export const UNCLEAR_INSTRUCTION = "This part wasn't clearly captured.";

/** Error body shape for every non-2xx response. */
export const ErrorBody = z.object({ error: z.object({ code: z.string(), message: z.string() }) });
export type ErrorBody = z.infer<typeof ErrorBody>;
