// The analysis prompt. The system text is frozen so it caches; everything per-recording goes in
// the user turn. Rules here are the product's safety model, not style preferences.
import type { AnalysisRequest } from "./contract.ts";

export const SYSTEM_PROMPT = `You turn one recorded demonstration into a procedural memory for the person who recorded it. Someone they trust (a plumber, a parent, themselves) showed them how to do one thing with one physical object, and explained it while doing it. Your output is what they will follow months later, alone, possibly with a boiler, gas, electricity, a vehicle or a tool in front of them.

Ground rules, in priority order:
1. Only what was demonstrated. Every step must come from what was said (the transcript, with timestamps) or clearly shown (the frames). Never add a step because it "should" be there. If an action the procedure obviously needs was not captured, emit a step whose instruction is exactly "This part wasn't clearly captured." with provenance "unclear" and low confidence, placed where it belongs in time.
2. Provenance is honest. "observed": said and/or shown, with a sourceStart–sourceEnd range covering it. "inferred": implied but not stated or shown (rare; confidence ≤ 0.5). "unclear": not captured.
3. Numbers and units only as heard or seen. Never round, convert or invent a value. Quote the demonstrator's words verbatim in sourceTranscript.
4. Warnings are advisory and separate from steps. Add a warning when the demonstrator warned ("never", "careful", "don't force it"), or when the object category is dangerous (gas, mains electricity, pressure, heat, chemicals, vehicles, blades). Do not convert a warning into an extra step.
5. Risk level reflects what getting it wrong could do: high for gas, mains electricity, brakes, blades, chemicals; medium for boilers, pressure, heat, ladders; low otherwise.
6. The object candidate is what the frames and words support (brand and model only if legible or spoken); give confidence honestly, and null when nothing supports one.
7. Tools only if used or mentioned.
8. Steps are short imperative sentences one person can act on ("Turn the blue valve slowly."), with detail carrying the condition ("Stop when the gauge reaches 1.5 bar."). One action per step. Order by time. Keep the demonstrator's vocabulary.
9. Title: a short imperative noun phrase ("Repressurise boiler"). shortDescription: one or two sentences of what this achieves and when to do it, from the demonstration.
10. Uncertainties: list anything the recording left ambiguous that the person should check.

Return only the JSON object described by the output schema.`;

function clock(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${(s - m * 60).toFixed(1).padStart(4, "0")}`;
}

/** The per-recording user turn: transcript, markers, moments, hints, then one image block per frame. */
export function buildUserContent(request: AnalysisRequest) {
  const lines: string[] = [];
  lines.push(`Recording ${request.recordingID}, duration ${request.duration.toFixed(1)} s, language ${request.locale}.`);
  if (request.demonstratorName) lines.push(`Demonstrator: ${request.demonstratorName}.`);
  if (request.objectHint) {
    const h = request.objectHint;
    lines.push(`Object hint from the user (may be wrong): ${[h.name, h.category, h.brand, h.model].filter(Boolean).join(" · ") || "none"}.`);
  }
  lines.push("", "Transcript (start–end):");
  for (const seg of request.transcript.segments) lines.push(`[${clock(seg.start)}–${clock(seg.end)}] ${seg.text}`);
  if (request.markers.length) lines.push("", `The user tapped "Remember this" at: ${request.markers.map(clock).join(", ")}.`);
  if (request.moments.length) {
    lines.push("", "Moments detected on the phone (kind @ time, confidence):");
    for (const m of request.moments) lines.push(`- ${m.kind} @ ${clock(m.time)} (${m.confidence.toFixed(2)})${m.label ? `: ${m.label}` : ""}`);
  }
  if (request.keyFrames.length) lines.push("", `Frames follow, each labelled with its id and time. Reference a frame by id in keyFrameReference when it shows the step.`);

  const content: Array<
    | { type: "text"; text: string }
    | { type: "image"; source: { type: "base64"; media_type: "image/jpeg"; data: string } | { type: "url"; url: string } }
  > = [{ type: "text", text: lines.join("\n") }];

  for (const frame of request.keyFrames) {
    content.push({ type: "text", text: `Frame ${frame.id} at ${clock(frame.time)}:` });
    if (frame.jpegBase64) content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: frame.jpegBase64 } });
    else if (frame.url) content.push({ type: "image", source: { type: "url", url: frame.url } });
  }
  return content;
}
