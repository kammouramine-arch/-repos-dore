// Render QC stills of a composition at given seconds: node stills.mjs N1 1.0 3.5 ...
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "path"; import fs from "fs";
const [comp, ...secs] = process.argv.slice(2);
const out = path.resolve("../renders/qc"); fs.mkdirSync(out, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const composition = await selectComposition({ serveUrl, id: comp, inputProps: { audio: false }, browserExecutable });
for (const s of secs) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(parseFloat(s) * 30));
  await renderStill({ composition, serveUrl, frame, output: path.join(out, `${comp}_${s}.jpg`), inputProps: { audio: false }, browserExecutable, imageFormat: "jpeg", jpegQuality: 85 });
  console.log("still", comp, s);
}
fs.rmSync(serveUrl, { recursive: true, force: true });
