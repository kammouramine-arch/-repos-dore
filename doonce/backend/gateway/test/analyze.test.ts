import { test } from "node:test";
import assert from "node:assert/strict";
import Anthropic from "@anthropic-ai/sdk";
import { analyze, AnalyzeError } from "../../supabase/functions/_shared/analyze.ts";
import { validate } from "../../supabase/functions/_shared/validate.ts";
import { makeHandler } from "../../supabase/functions/_shared/http.ts";
import { DevTokenVerifier } from "../../supabase/functions/_shared/auth.ts";
import { boilerRequest, goodModelOutput } from "./fixtures.ts";

/** A client whose beta.messages.stream returns a scripted message; records the request it was given. */
function stubClient(script: { text?: string; stop_reason?: string; throws?: Error }) {
  const seen: { params?: Record<string, unknown> } = {};
  const client = {
    beta: {
      messages: {
        stream(params: Record<string, unknown>) {
          seen.params = params;
          return {
            async finalMessage() {
              if (script.throws) throw script.throws;
              return {
                id: "msg_test",
                model: "claude-opus-5",
                stop_reason: script.stop_reason ?? "end_turn",
                content: script.text === undefined ? [] : [{ type: "text", text: script.text }],
                usage: { input_tokens: 1200, output_tokens: 800 },
              };
            },
          };
        },
      },
    },
  } as unknown as Anthropic;
  return { client, seen };
}

test("a good model output passes through validation with the contract shape", async () => {
  const { client, seen } = stubClient({ text: JSON.stringify(goodModelOutput) });
  const result = await analyze(boilerRequest, { client });
  assert.equal(result.response.title, "Repressurise boiler");
  assert.equal(result.response.steps.length, 5);
  assert.equal(result.response.steps[2].provenance, "observed");
  assert.equal(result.usage.model, "claude-opus-5");
  // Request shape: adaptive thinking, structured output, cached system prompt, fallbacks, frames as labelled blocks.
  const p = seen.params!;
  assert.deepEqual(p.thinking, { type: "adaptive" });
  assert.equal((p.output_config as { format: { type: string } }).format.type, "json_schema");
  assert.equal(p.fallbacks, "default");
  assert.deepEqual(p.betas, ["server-side-fallback-2026-07-01"]);
  const system = p.system as Array<{ cache_control?: unknown }>;
  assert.ok(system[0].cache_control);
  const content = (p.messages as Array<{ content: Array<{ type: string; text?: string }> }>)[0].content;
  assert.ok(content[0].text?.includes("[00:27.0–00:33.5] Keep an eye on the gauge"));
  assert.ok(content.some((b) => b.text?.startsWith("Frame f3 at")));
});

test("frames with base64 become image blocks", async () => {
  const { client, seen } = stubClient({ text: JSON.stringify(goodModelOutput) });
  await analyze({ ...boilerRequest, keyFrames: [{ id: "f1", time: 6, jpegBase64: "/9j/4AAQ", url: null }] }, { client });
  const content = (seen.params!.messages as Array<{ content: Array<{ type: string }> }>)[0].content;
  assert.ok(content.some((b) => b.type === "image"));
});

test("an invalid request is rejected before any model call", async () => {
  const { client, seen } = stubClient({ text: "{}" });
  await assert.rejects(analyze({ recordingID: "nope" }, { client }), (e: unknown) => e instanceof AnalyzeError && e.code === "invalid_request" && e.status === 400);
  assert.equal(seen.params, undefined);
});

test("a refusal, a truncation and malformed output map to distinct errors", async () => {
  await assert.rejects(analyze(boilerRequest, { client: stubClient({ text: "{}", stop_reason: "refusal" }).client }), (e: unknown) => e instanceof AnalyzeError && e.code === "refused");
  await assert.rejects(analyze(boilerRequest, { client: stubClient({ text: "{", stop_reason: "max_tokens" }).client }), (e: unknown) => e instanceof AnalyzeError && e.code === "truncated");
  await assert.rejects(analyze(boilerRequest, { client: stubClient({ text: "not json" }).client }), (e: unknown) => e instanceof AnalyzeError && e.code === "malformed_model_output");
  await assert.rejects(analyze(boilerRequest, { client: stubClient({ text: JSON.stringify({ title: "x" }) }).client }), (e: unknown) => e instanceof AnalyzeError && e.code === "malformed_model_output");
});

test("connection failures surface as unavailable, not as a 500", async () => {
  const { client } = stubClient({ throws: new Anthropic.APIConnectionError({ message: "down" }) });
  await assert.rejects(analyze(boilerRequest, { client }), (e: unknown) => e instanceof AnalyzeError && e.code === "model_unavailable" && e.status === 503);
});

test("validator: invented values, ungrounded steps, reversed ranges, risk floor, step cap", () => {
  const tampered = structuredClone(goodModelOutput);
  tampered.steps[2].detail = "Stop when the gauge reaches 2.5 bar."; // never said
  tampered.steps[4].sourceStart = 47.5; tampered.steps[4].sourceEnd = 41; // reversed
  tampered.steps.push({ order: 6, instruction: "Bleed the radiators.", detail: null, sourceStart: null, sourceEnd: null, sourceTranscript: null, keyFrameReference: null, warning: null, confidence: 0.9, provenance: "observed" }); // never demonstrated
  tampered.steps.push({ order: 7, instruction: "", detail: null, sourceStart: 47.6, sourceEnd: 48, sourceTranscript: null, keyFrameReference: null, warning: null, confidence: 0.2, provenance: "observed" });
  tampered.riskLevel = "low";
  tampered.warnings = ["Never go above 2 bar.", "Never go above 2 bar."];
  const { response, adjustments } = validate(tampered, boilerRequest);
  assert.equal(response.steps[2].provenance, "inferred");
  assert.ok(response.uncertainties.some((u) => u.includes("2.5 bar")));
  assert.ok(response.steps[4].sourceStart! <= response.steps[4].sourceEnd!);
  const bleed = response.steps.find((s) => s.instruction.startsWith("Bleed"))!;
  assert.equal(bleed.provenance, "inferred");
  assert.ok(bleed.confidence <= 0.5);
  const unclear = response.steps.find((s) => s.provenance === "unclear")!;
  assert.equal(unclear.instruction, "This part wasn't clearly captured.");
  assert.equal(response.riskLevel, "medium"); // "boiler", "pressure" in the words
  assert.equal(response.warnings.length, 1);
  assert.deepEqual(response.steps.map((s) => s.order), [1, 2, 3, 4, 5, 6, 7]);
  assert.ok(adjustments.length >= 5);
});

test("validator caps steps at what the recording can support", () => {
  const many = structuredClone(goodModelOutput);
  for (let i = 0; i < 20; i++) many.steps.push({ ...goodModelOutput.steps[0], order: 10 + i, sourceStart: 1 + i, sourceEnd: 2 + i });
  const { response } = validate(many, boilerRequest);
  assert.ok(response.steps.length <= boilerRequest.moments.length + boilerRequest.transcript.segments.length);
});

test("http: health is open, analyze needs a bearer, rate limit and routes behave", async () => {
  const { client } = stubClient({ text: JSON.stringify(goodModelOutput) });
  const handler = makeHandler({ anthropic: client, verifier: new DevTokenVerifier(), analyzePerMinute: 2 });
  assert.equal((await handler(new Request("http://x/health"))).status, 200);
  assert.equal((await handler(new Request("http://x/v1/analyze", { method: "POST", body: "{}" }))).status, 401);
  const auth = { authorization: "Bearer dev-user", "content-type": "application/json" };
  const ok = await handler(new Request("http://x/v1/analyze", { method: "POST", headers: auth, body: JSON.stringify(boilerRequest) }));
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).title, "Repressurise boiler");
  assert.equal(ok.headers.get("x-doonce-model"), "claude-opus-5");
  await handler(new Request("http://x/v1/analyze", { method: "POST", headers: auth, body: JSON.stringify(boilerRequest) }));
  const limited = await handler(new Request("http://x/v1/analyze", { method: "POST", headers: auth, body: JSON.stringify(boilerRequest) }));
  assert.equal(limited.status, 429);
  const bad = await handler(new Request("http://x/v1/analyze", { method: "POST", headers: { authorization: "Bearer other" }, body: "nope" }));
  assert.equal(bad.status, 400);
  const del = await handler(new Request("http://x/v1/account", { method: "DELETE", headers: auth }));
  assert.equal(del.status, 202);
  assert.equal((await handler(new Request("http://x/v1/nothing", { headers: auth }))).status, 404);
});
