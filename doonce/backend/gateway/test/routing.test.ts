// Routing: the same handler serves the bare local routes and Supabase's prefixed paths.
import { test } from "node:test";
import assert from "node:assert/strict";
import Anthropic from "@anthropic-ai/sdk";
import { makeHandler, routeOf } from "../../supabase/functions/_shared/http.ts";
import { DevTokenVerifier } from "../../supabase/functions/_shared/auth.ts";
import { boilerRequest, goodModelOutput } from "./fixtures.ts";

const client = {
  beta: { messages: { stream: () => ({ finalMessage: async () => ({ model: "claude-opus-5", stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(goodModelOutput) }], usage: { input_tokens: 1, output_tokens: 1 } }) }) } },
} as unknown as Anthropic;

const PREFIXES = ["", "/doonce-analyze", "/functions/v1/doonce-analyze"];

test("routeOf strips the function name and the /functions/v1 prefix", () => {
  for (const prefix of PREFIXES) {
    assert.equal(routeOf(`${prefix}/v1/analyze`), "/v1/analyze", prefix);
    assert.equal(routeOf(`${prefix}/health/`), "/health", prefix);
    assert.equal(routeOf(`${prefix}/v1/account`), "/v1/account", prefix);
  }
  assert.equal(routeOf("/doonce-analyze"), "/");
  assert.equal(routeOf("/"), "/");
  assert.equal(routeOf("/other-function/v1/analyze"), "/other-function/v1/analyze", "only our own name is stripped");
  assert.equal(routeOf("/x/v1/analyze", "x"), "/v1/analyze");
});

test("health, analyze and account answer with and without the Supabase prefixes", async () => {
  const handler = makeHandler({ anthropic: client, verifier: new DevTokenVerifier(), analyzePerMinute: 100 });
  const auth = { authorization: "Bearer dev-user", "content-type": "application/json" };
  for (const prefix of PREFIXES) {
    const base = `https://ref.supabase.co${prefix}`;
    assert.equal((await handler(new Request(`${base}/health`))).status, 200, `${prefix}/health`);
    const analyzed = await handler(new Request(`${base}/v1/analyze`, { method: "POST", headers: auth, body: JSON.stringify(boilerRequest) }));
    assert.equal(analyzed.status, 200, `${prefix}/v1/analyze`);
    assert.equal((await analyzed.json()).title, "Repressurise boiler");
    assert.equal((await handler(new Request(`${base}/v1/account`, { method: "DELETE", headers: auth }))).status, 202, `${prefix}/v1/account`);
    assert.equal((await handler(new Request(`${base}/v1/analyze`, { method: "POST", body: "{}" }))).status, 401, "still needs a bearer");
  }
});

test("paths that merely end like a route are not routes", async () => {
  const handler = makeHandler({ anthropic: client, verifier: new DevTokenVerifier() });
  const auth = { authorization: "Bearer dev-user" };
  assert.equal((await handler(new Request("https://x/elsewhere/v1/analyze", { method: "POST", headers: auth, body: "{}" }))).status, 404);
  assert.equal((await handler(new Request("https://x/not/health", { headers: auth }))).status, 404);
});
