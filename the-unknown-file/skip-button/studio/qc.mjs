// Rig QC: evaluates every frame of a composition with QC on (no screenshots) and reports IK faults.
// node qc.mjs <Composition> [everyNth]
import { bundle } from "@remotion/bundler";
import { renderFrames, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
const [id, nth = "1"] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const chromiumOptions = { gl: "angle" };
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const inputProps = { qc: true };
const comp = await selectComposition({ serveUrl, id, chromiumOptions, browserExecutable, inputProps });
const faults = [];
await renderFrames({
  composition: comp, serveUrl, inputProps, chromiumOptions, browserExecutable, imageFormat: "none", concurrency: 4,
  everyNthFrame: Number(nth), outputDir: null, onStart: () => {}, onFrameUpdate: () => {},
  onBrowserLog: (log) => { if (log.text.includes("[QC]")) faults.push(`${log.stackTrace?.[0]?.lineNumber ?? ""} ${log.text}`); },
});
fs.rmSync(serveUrl, { recursive: true, force: true });
console.log(`QC ${id}: ${faults.length} fault reports`);
fs.writeFileSync(`/tmp/claude-0/-home-user--repos-dore/6b76b049-7736-58b3-b2c8-4d7d90c68fc3/scratchpad/sb/qc_${id}.txt`, faults.join("\n"));
