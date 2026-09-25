// Safety validation of a model response, applied server-side before anything reaches the phone.
// The app runs the same rules again (DoOnceCore.AnalysisValidator): defence in depth, because a
// procedure about a boiler must never gain a step nobody demonstrated.
import { AnalysisRequest, AnalysisResponse, UNCLEAR_INSTRUCTION, type AnalyzedStep } from "./contract.ts";

export type Adjustment = { step?: number; rule: string; note: string };

const RISK_HIGH = ["gas", "electric", "electrical", "mains", "brake", "blade", "chemical", "bleach", "acid", "fuse box", "breaker"];
const RISK_MEDIUM = ["boiler", "hot", "pressure", "steam", "ladder", "sharp", "engine"];
const NUMBER = /(\d+(?:[.,]\d+)?)\s*(bar|psi|°c|°f|degrees?|volts?|v|amps?|a|litres?|liters?|ml|minutes?|min|seconds?|s|%|grams?|g|turns?|clicks?|mm|cm|m)\b/gi;

function numbersIn(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.toLowerCase().replace(",", ".").matchAll(NUMBER)) out.add(`${parseFloat(m[1])} ${normaliseUnit(m[2])}`);
  return out;
}

function normaliseUnit(u: string): string {
  const x = u.toLowerCase();
  if (x.startsWith("degree")) return "°";
  if (x === "°c" || x === "°f") return "°";
  if (x.startsWith("minute")) return "min";
  if (x.startsWith("second")) return "s";
  if (x.startsWith("litre") || x.startsWith("liter")) return "l";
  if (x.startsWith("volt")) return "v";
  if (x.startsWith("amp")) return "a";
  if (x.startsWith("gram")) return "g";
  if (x.startsWith("turn")) return "turns";
  if (x.startsWith("click")) return "clicks";
  return x;
}

function riskFrom(text: string): "low" | "medium" | "high" {
  const t = ` ${text.toLowerCase()} `;
  if (RISK_HIGH.some((w) => t.includes(` ${w} `) || t.includes(` ${w}.`) || t.includes(` ${w},`))) return "high";
  if (RISK_MEDIUM.some((w) => t.includes(` ${w} `) || t.includes(` ${w}.`) || t.includes(` ${w},`))) return "medium";
  return "low";
}

const RANK = { low: 0, medium: 1, high: 2 } as const;

export function validate(response: AnalysisResponse, request: AnalysisRequest): { response: AnalysisResponse; adjustments: Adjustment[] } {
  const adjustments: Adjustment[] = [];
  const segments = request.transcript.segments;
  const transcriptText = segments.map((s) => s.text).join(" ");
  const heard = numbersIn(transcriptText);
  const maxSteps = Math.max(1, request.moments.length + segments.length);

  let steps: AnalyzedStep[] = response.steps.slice(0, maxSteps);
  if (response.steps.length > maxSteps) adjustments.push({ rule: "stepCount", note: `Dropped ${response.steps.length - maxSteps} steps beyond what the recording supports` });

  steps = steps.map((step) => {
    let s = { ...step };
    // 1. Clamp ranges into the recording.
    if (s.sourceStart != null) s.sourceStart = Math.min(Math.max(0, s.sourceStart), request.duration);
    if (s.sourceEnd != null) s.sourceEnd = Math.min(Math.max(0, s.sourceEnd), request.duration);
    if (s.sourceStart != null && s.sourceEnd != null && s.sourceEnd < s.sourceStart) {
      [s.sourceStart, s.sourceEnd] = [s.sourceEnd, s.sourceStart];
      adjustments.push({ step: s.order, rule: "range", note: "Swapped a reversed source range" });
    }
    // 2. Grounding: no transcript for this step and no overlap with any segment → inferred.
    const overlaps = s.sourceStart != null && s.sourceEnd != null && segments.some((seg) => seg.end > s.sourceStart! && seg.start < s.sourceEnd!);
    if (!s.sourceTranscript && !overlaps && s.provenance === "observed") {
      s.provenance = "inferred";
      s.confidence = Math.min(s.confidence, 0.5);
      adjustments.push({ step: s.order, rule: "grounding", note: "No speech or range supports this step" });
    }
    // 3. Numbers the demonstrator never said cannot be presented as observed.
    for (const value of numbersIn(`${s.instruction} ${s.detail ?? ""}`)) {
      if (!heard.has(value)) {
        s.provenance = s.provenance === "observed" ? "inferred" : s.provenance;
        response.uncertainties.push(`Value ${value} was not heard in the demonstration.`);
        adjustments.push({ step: s.order, rule: "unheardValue", note: value });
      }
    }
    // 4. Low confidence or empty instruction → unclear, with the standard sentence.
    if (!s.instruction.trim() || s.confidence < 0.35) {
      s = { ...s, instruction: UNCLEAR_INSTRUCTION, provenance: "unclear" };
      adjustments.push({ step: s.order, rule: "unclear", note: "Low confidence" });
    }
    return s;
  });

  // 5. Time order and renumbering.
  steps.sort((a, b) => (a.sourceStart ?? Number.MAX_SAFE_INTEGER) - (b.sourceStart ?? Number.MAX_SAFE_INTEGER) || a.order - b.order);
  steps = steps.map((s, i) => ({ ...s, order: i + 1 }));

  // 6. Risk never below what the words imply.
  const impliedRisk = riskFrom(`${transcriptText} ${steps.map((s) => s.instruction).join(" ")}`);
  let riskLevel = response.riskLevel;
  if (RANK[impliedRisk] > RANK[riskLevel]) {
    riskLevel = impliedRisk;
    adjustments.push({ rule: "risk", note: `Raised risk to ${impliedRisk}` });
  }

  const warnings = Array.from(new Set(response.warnings.map((w) => w.trim()).filter(Boolean)));
  const uncertainties = Array.from(new Set(response.uncertainties.map((w) => w.trim()).filter(Boolean)));
  const title = response.title.trim() || "Untitled memory";

  return { response: { ...response, title, steps, riskLevel, warnings, uncertainties }, adjustments };
}
