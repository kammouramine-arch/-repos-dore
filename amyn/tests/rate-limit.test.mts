import assert from "node:assert/strict";
import { test } from "node:test";
import { createRateLimiter } from "../src/lib/server/rate-limit.ts";

test("limitation : cinq demandes, puis refus, puis fenêtre renouvelée", () => {
  const limited = createRateLimiter({ max: 5, windowMs: 1000 });
  for (let i = 0; i < 5; i++) assert.equal(limited("ip", 0), false);
  assert.equal(limited("ip", 10), true);
  assert.equal(limited("autre", 10), false);
  assert.equal(limited("ip", 5000), false);
});
