// QC helper: node stills.mjs <CompositionId> <outDir> <sec,sec,...> [scale]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
const [id, outDir, secs, scale = "1", props = "{}"] = process.argv.slice(2);
const inputProps = JSON.parse(props);
fs.mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const chromiumOptions = { gl: "angle" };
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const comp = await selectComposition({ serveUrl, id, chromiumOptions, browserExecutable, inputProps });
for (const s of secs.split(",").map(Number)) {
  const frame = Math.min(comp.durationInFrames - 1, Math.round(s * comp.fps));
  const out = path.join(outDir, `${id}_${String(s.toFixed(1)).padStart(6, "0")}.jpg`);
  const t0 = Date.now();
  await renderStill({ composition: comp, serveUrl, frame, output: out, imageFormat: "jpeg", jpegQuality: 85, chromiumOptions, browserExecutable, scale: Number(scale), timeoutInMilliseconds: 120000, inputProps });
  console.log(out, ((Date.now() - t0) / 1000).toFixed(1) + "s");
}
fs.rmSync(serveUrl, { recursive: true, force: true }); // bundles copy public/ (footage) into /tmp: clean up
