// The boiler demonstration, as the phone would send it (mirrors DoOnceCore SampleTranscripts).
import type { AnalysisRequest, AnalysisResponse } from "../../supabase/functions/_shared/contract.ts";

export const boilerRequest: AnalysisRequest = {
  recordingID: "6f1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
  duration: 48,
  locale: "en",
  transcript: {
    language: "en",
    keyPhrases: ["1.5 bar", "slowly"],
    segments: [
      { start: 1.2, end: 4.8, text: "Okay so, when the pressure drops below one bar the boiler will lock out." },
      { start: 5.0, end: 11.0, text: "First open the lower panel, pull it from the bottom edge, it just clips off." },
      { start: 12.4, end: 18.9, text: "Find the blue filling valve, it's the one on the left here." },
      { start: 19.8, end: 26.4, text: "Important, turn it slowly. It gets stiff near the end, don't force it." },
      { start: 27.0, end: 33.5, text: "Keep an eye on the gauge and stop when it reaches 1.5 bar." },
      { start: 34.5, end: 40.2, text: "Never go above 2 bar, that's the red zone. Close the valve fully." },
      { start: 41.0, end: 47.5, text: "Then press reset once and it'll fire back up in about a minute." },
    ],
  },
  markers: [21.0],
  moments: [
    { time: 5.0, kind: "speechCue", confidence: 0.8, label: "open the lower panel" },
    { time: 21.0, kind: "userMarked", confidence: 1, label: null },
    { time: 27.0, kind: "importantStatement", confidence: 0.9, label: "stop at 1.5 bar" },
  ],
  keyFrames: [
    { id: "f1", time: 6, jpegBase64: null, url: null },
    { id: "f2", time: 13, jpegBase64: null, url: null },
    { id: "f3", time: 28, jpegBase64: null, url: null },
  ],
  objectHint: { name: "Boiler", category: "Boiler", brand: "Vaillant", model: "ecoTEC Plus" },
  demonstratorName: "Julien",
};

export const goodModelOutput: AnalysisResponse = {
  title: "Repressurise boiler",
  shortDescription: "When the pressure drops below 1 bar the boiler locks out. Refill to 1.5 bar through the blue valve, then reset.",
  objectCandidate: { name: "Boiler", category: "Boiler", brand: "Vaillant", model: "ecoTEC Plus", confidence: 0.7 },
  durationEstimate: 120,
  tools: [],
  warnings: ["Never go above 2 bar.", "Turn the valve slowly; don't force it."],
  riskLevel: "medium",
  steps: [
    { order: 1, instruction: "Open the lower panel.", detail: "Pull it from the bottom edge. It clips off.", sourceStart: 5, sourceEnd: 11, sourceTranscript: "First open the lower panel, pull it from the bottom edge, it just clips off.", keyFrameReference: "f1", warning: null, confidence: 0.92, provenance: "observed" },
    { order: 2, instruction: "Find the blue filling valve.", detail: "It's the one on the left.", sourceStart: 12.4, sourceEnd: 18.9, sourceTranscript: "Find the blue filling valve, it's the one on the left here.", keyFrameReference: "f2", warning: null, confidence: 0.9, provenance: "observed" },
    { order: 3, instruction: "Turn the blue valve slowly.", detail: "Stop when the gauge reaches 1.5 bar.", sourceStart: 19.8, sourceEnd: 33.5, sourceTranscript: "Turn it slowly. It gets stiff near the end, don't force it. Keep an eye on the gauge and stop when it reaches 1.5 bar.", keyFrameReference: "f3", warning: "Never go above 2 bar.", confidence: 0.95, provenance: "observed" },
    { order: 4, instruction: "Close the valve fully.", detail: null, sourceStart: 34.5, sourceEnd: 40.2, sourceTranscript: "Close the valve fully.", keyFrameReference: null, warning: null, confidence: 0.85, provenance: "observed" },
    { order: 5, instruction: "Press reset once.", detail: "It fires back up in about a minute.", sourceStart: 41, sourceEnd: 47.5, sourceTranscript: "Then press reset once and it'll fire back up in about a minute.", keyFrameReference: null, warning: null, confidence: 0.6, provenance: "observed" },
  ],
  uncertainties: ["The reset button was not clearly in frame."],
};
