// Verbatim provenance: a step's sourceTranscript is shown as the demonstrator's own words, so the
// validator never lets a paraphrase through. Mirrors DoOnceCore AnalysisValidatorTests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { validate, normaliseForQuoting, isVerbatimQuote } from "../../supabase/functions/_shared/validate.ts";
import type { AnalyzedStep } from "../../supabase/functions/_shared/contract.ts";
import { boilerRequest, goodModelOutput } from "./fixtures.ts";

function withStep(patch: Partial<AnalyzedStep>) {
  const output = structuredClone(goodModelOutput);
  output.steps = [{ ...goodModelOutput.steps[1], ...patch }];
  return validate(output, boilerRequest);
}

test("normalisation: case, curly quotes and apostrophes, punctuation, whitespace", () => {
  assert.equal(normaliseForQuoting("  It’s the ONE on the “left”,   here! "), "its the one on the left here");
  assert.equal(normaliseForQuoting("don't"), normaliseForQuoting("don’t"));
  assert.equal(normaliseForQuoting("1.5 bar"), "1 5 bar");
  assert.equal(normaliseForQuoting("...!"), "");
  assert.equal(normaliseForQuoting("Cafe\u0301 ΟΔΟΣ"), "café οδοσ", "composed, lower case, final sigma folded (same as DoOnceCore)");
});

test("a verbatim quote passes whatever its casing, quotes or punctuation", () => {
  const transcript = normaliseForQuoting(boilerRequest.transcript.segments.map((s) => s.text).join(" "));
  assert.ok(isVerbatimQuote("find the blue filling valve, it’s the one on the left", transcript));
  assert.ok(isVerbatimQuote("don't force it. Keep an eye on the gauge", transcript), "a quote may run across segments when contiguous");
  assert.ok(!isVerbatimQuote("Find the blue valve on the left", transcript), "paraphrase");
  assert.ok(!isVerbatimQuote("ind the blu", transcript), "cut through words");
  assert.ok(!isVerbatimQuote("Turn it slowly. Close the valve fully.", transcript), "distant sentences merged");
  assert.ok(!isVerbatimQuote("  ", transcript));
});

test("the good fixture needs no provenance correction", () => {
  const { response, adjustments } = validate(structuredClone(goodModelOutput), boilerRequest);
  assert.ok(!adjustments.some((a) => a.rule === "sourceTranscriptNotVerbatim"), JSON.stringify(adjustments));
  assert.equal(response.steps[2].sourceTranscript, goodModelOutput.steps[2].sourceTranscript, "original text kept as the model quoted it");
});

test("a paraphrase is replaced by the words spoken in the step's range, original casing", () => {
  const { response, adjustments } = withStep({ sourceStart: 12.4, sourceEnd: 26, sourceTranscript: "Locate the blue valve, which is on the left, and turn it gently." });
  assert.equal(response.steps[0].sourceTranscript, "Find the blue filling valve, it's the one on the left here. Important, turn it slowly. It gets stiff near the end, don't force it.");
  assert.deepEqual(adjustments.filter((a) => a.rule === "sourceTranscriptNotVerbatim").map((a) => a.step), [2]);
  assert.equal(response.steps[0].provenance, "observed", "still grounded in speech");
});

test("a paraphrase with no usable range is removed, and the step is no longer grounded", () => {
  const { response, adjustments } = withStep({ sourceStart: null, sourceEnd: null, sourceTranscript: "Find the blue valve on the left." });
  assert.equal(response.steps[0].sourceTranscript, null);
  assert.equal(response.steps[0].provenance, "inferred");
  assert.ok(adjustments.some((a) => a.rule === "sourceTranscriptNotVerbatim"));
});

test("a paraphrase whose range covers no speech is removed", () => {
  const { response } = withStep({ sourceStart: 11.2, sourceEnd: 12.2, sourceTranscript: "Pop the panel off." });
  assert.equal(response.steps[0].sourceTranscript, null);
});

test("a one-ended range is a point: the segment around it is quoted", () => {
  const { response } = withStep({ sourceStart: 15, sourceEnd: null, sourceTranscript: "Locate the valve." });
  assert.equal(response.steps[0].sourceTranscript, "Find the blue filling valve, it's the one on the left here.");
});

test("null and blank quotes stay null without an adjustment", () => {
  for (const quote of [null, "", "   "]) {
    const { response, adjustments } = withStep({ sourceTranscript: quote });
    assert.equal(response.steps[0].sourceTranscript, null);
    assert.ok(!adjustments.some((a) => a.rule === "sourceTranscriptNotVerbatim"));
  }
});
