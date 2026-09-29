// The analysis prompt. The system text is frozen so it caches; everything per-recording goes in
// the user turn. Rules here are the product's safety model, not style preferences.
import type Anthropic from "@anthropic-ai/sdk";
import type { AnalysisRequest } from "./contract.ts";

export const SYSTEM_PROMPT = `You turn one recorded demonstration into a procedural memory for the person who recorded it. Someone they trust (a plumber, a parent, themselves) showed them how to do one thing with one physical object, and explained it while doing it. Your output is what they will follow months later, alone, possibly with a boiler, gas, electricity, a vehicle or a tool in front of them. The original video stays on their phone as the ground truth; your steps are the index into it.

You receive the transcript with timestamps, the moments the phone detected, and a few still frames from the video, each labelled "Frame <id> at <m:ss>" immediately before its image.

Ground rules, in priority order:
1. Only what was demonstrated. Every step must come from what was said (the transcript) or clearly shown (the frames). Never add a step because it "should" be there, and never fill a gap with general knowledge, least of all a dangerous step (isolating gas or electricity, releasing pressure, draining, lifting). If an action the procedure obviously needs was not captured, emit a step whose instruction is exactly "This part wasn't clearly captured." with provenance "unclear", confidence at most 0.3, and the range where it belongs in time.
2. sourceTranscript is quoted, never written. The app shows it under "What <demonstrator> said" as the person's own words. Copy it character for character from the transcript: one contiguous passage, the demonstrator's own wording, fillers and grammar included. Never paraphrase, tidy, translate, summarise, or stitch together sentences from different parts of the recording. If no words were spoken for the step, sourceTranscript is null. sourceStart and sourceEnd cover exactly the quoted passage (or, for a silent step, the part of the video that shows it).
3. Provenance is honest. "observed": said and/or visibly shown, with a sourceStart–sourceEnd range covering it. "inferred": implied but neither stated nor shown (rare; confidence at most 0.5; say in detail what it rests on). "unclear": not captured. Never mark something observed because it is likely.
4. Frames. Use them to identify the object (brand and model only if legible), to see which control, part or direction the words refer to ("this one", "here", "like that"), and to order and describe physical actions the words leave vague. Set keyFrameReference to the id of the one frame that best shows the step, or null when no frame shows it. Never describe something in a frame you cannot actually see.
5. Numbers and units only as heard or seen. Never round, convert or invent a value.
6. Warnings are advisory and separate from steps. Add a warning when the demonstrator warned ("never", "careful", "don't force it"), or when the object category is dangerous (gas, mains electricity, pressure, heat, chemicals, vehicles, blades). Put a step-specific caution in that step's warning. Do not convert a warning into an extra step.
7. Risk level reflects what getting it wrong could do: high for gas, mains electricity, brakes, blades, chemicals; medium for boilers, pressure, heat, ladders; low otherwise.
8. The object candidate is what the frames and words support; give confidence honestly, and null when nothing supports one.
9. Tools only if used or mentioned.
10. Steps: instruction is one short imperative sentence one person can act on ("Turn the blue valve slowly."), one action per step, in the demonstrator's vocabulary. Secondary guidance (conditions, what to look or listen for, where the part is, when to stop) goes in detail ("Stop when the gauge reaches 1.5 bar."), not in extra steps. Order by time.
11. Title: a short imperative noun phrase ("Repressurise boiler"). shortDescription: one or two sentences of what this achieves and when to do it, from the demonstration.
12. Uncertainties: list anything the recording left ambiguous that the person should check.

Return only the JSON object described by the output schema.`;

function clock(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${(s - m * 60).toFixed(1).padStart(4, "0")}`;
}

/** The most frames sent to the model per recording; more cost tokens without adding steps. */
export const MAX_FRAMES = 12;

/** "0:24", "1:05": the label a frame carries in the prompt. */
export function frameClock(seconds: number): string {
  const total = Math.floor(Math.max(0, seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

type Frame = AnalysisRequest["keyFrames"][number];

/** Frames the model can actually see, in time order, thinned to `max` evenly spread ones (first and last kept). */
export function selectFrames(frames: Frame[], max = MAX_FRAMES): Frame[] {
  const visible = frames.filter((f) => f.jpegBase64 || f.url).sort((a, b) => a.time - b.time);
  if (visible.length <= max) return visible;
  if (max <= 1) return visible.slice(0, max);
  const picked = new Set<number>();
  for (let i = 0; i < max; i++) picked.add(Math.round((i * (visible.length - 1)) / (max - 1)));
  return [...picked].sort((a, b) => a - b).map((i) => visible[i]);
}

/** A bare base64 payload: no data-URL prefix, no line breaks. */
function base64Payload(value: string): string {
  return value.replace(/^data:[^,]*,/, "").replace(/\s+/g, "");
}

/** The per-recording user turn: transcript, markers, moments, hints, then each frame as a label followed by its image. */
export function buildUserContent(request: AnalysisRequest): Array<Anthropic.Beta.Messages.BetaTextBlockParam | Anthropic.Beta.Messages.BetaImageBlockParam> {
  const frames = selectFrames(request.keyFrames);
  const lines: string[] = [];
  lines.push(`Recording ${request.recordingID}, duration ${request.duration.toFixed(1)} s, language ${request.locale}.`);
  if (request.demonstratorName) lines.push(`Demonstrator: ${request.demonstratorName}.`);
  if (request.objectHint) {
    const h = request.objectHint;
    lines.push(`Object hint from the user (may be wrong): ${[h.name, h.category, h.brand, h.model].filter(Boolean).join(" · ") || "none"}.`);
  }
  lines.push("", "Transcript (start–end). Quote sourceTranscript from these lines exactly as written:");
  for (const seg of request.transcript.segments) lines.push(`[${clock(seg.start)}–${clock(seg.end)}] ${seg.text}`);
  if (request.transcript.segments.length === 0) lines.push("(nothing was said; every sourceTranscript is null)");
  if (request.markers.length) lines.push("", `The user tapped "Remember this" at: ${request.markers.map(clock).join(", ")}.`);
  if (request.moments.length) {
    lines.push("", "Moments detected on the phone (kind @ time, confidence):");
    for (const m of request.moments) lines.push(`- ${m.kind} @ ${clock(m.time)} (${m.confidence.toFixed(2)})${m.label ? `: ${m.label}` : ""}`);
  }
  if (frames.length) {
    lines.push("", `${frames.length} frame${frames.length === 1 ? "" : "s"} from the video follow, each labelled with its id and time. Set keyFrameReference to the id of the frame that best shows a step.`);
  } else {
    lines.push("", "No frames were sent; keyFrameReference is null for every step.");
  }

  const content: Array<Anthropic.Beta.Messages.BetaTextBlockParam | Anthropic.Beta.Messages.BetaImageBlockParam> = [{ type: "text", text: lines.join("\n") }];
  for (const frame of frames) {
    content.push({ type: "text", text: `Frame ${frame.id} at ${frameClock(frame.time)}` });
    if (frame.jpegBase64) content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64Payload(frame.jpegBase64) } });
    else if (frame.url) content.push({ type: "image", source: { type: "url", url: frame.url } });
  }
  return content;
}
