// Frames reach the model: labelled image blocks, capped and evenly spread.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildUserContent, selectFrames, frameClock, MAX_FRAMES, SYSTEM_PROMPT } from "../../supabase/functions/_shared/prompt.ts";
import { boilerRequest } from "./fixtures.ts";

const JPEG = "/9j/4AAQSkZJRgABAQ";

test("each frame with pixels is a label followed by a base64 JPEG image block", () => {
  const content = buildUserContent({
    ...boilerRequest,
    keyFrames: [
      { id: "f3", time: 24.6, jpegBase64: JPEG, url: null },
      { id: "f1", time: 6, jpegBase64: `data:image/jpeg;base64,${JPEG.slice(0, 8)}\n${JPEG.slice(8)}`, url: null },
      { id: "f2", time: 13, jpegBase64: null, url: null },
    ],
  });
  const labels = content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).slice(1);
  assert.deepEqual(labels, ["Frame f1 at 0:06", "Frame f3 at 0:24"], "time order; the frame without pixels is not offered");
  const f1 = content.findIndex((b) => b.type === "text" && b.text === "Frame f1 at 0:06");
  assert.deepEqual(content[f1 + 1], { type: "image", source: { type: "base64", media_type: "image/jpeg", data: JPEG } }, "prefix and line breaks stripped");
  assert.equal(content.filter((b) => b.type === "image").length, 2);
  assert.ok((content[0] as { text: string }).text.includes("2 frames from the video follow"));
});

test("more than twelve frames are thinned to twelve evenly spread ones, first and last kept", () => {
  const frames = Array.from({ length: 24 }, (_, i) => ({ id: `f${i}`, time: i * 2, jpegBase64: JPEG, url: null }));
  const picked = selectFrames(frames);
  assert.equal(MAX_FRAMES, 12);
  assert.equal(picked.length, 12);
  assert.equal(picked[0].id, "f0");
  assert.equal(picked[11].id, "f23");
  const gaps = picked.slice(1).map((f, i) => f.time - picked[i].time);
  assert.ok(Math.max(...gaps) - Math.min(...gaps) <= 2, `even spread: ${gaps}`);
  const content = buildUserContent({ ...boilerRequest, keyFrames: frames });
  assert.equal(content.filter((b) => b.type === "image").length, 12);
});

test("frame clock reads m:ss", () => {
  assert.equal(frameClock(0), "0:00");
  assert.equal(frameClock(24.9), "0:24");
  assert.equal(frameClock(65), "1:05");
});

test("the system prompt carries the verbatim, frame and no-invention rules", () => {
  assert.match(SYSTEM_PROMPT, /Copy it character for character/);
  assert.match(SYSTEM_PROMPT, /Never paraphrase/);
  assert.match(SYSTEM_PROMPT, /keyFrameReference/);
  assert.match(SYSTEM_PROMPT, /This part wasn't clearly captured\./);
  assert.match(SYSTEM_PROMPT, /goes in detail/);
});
