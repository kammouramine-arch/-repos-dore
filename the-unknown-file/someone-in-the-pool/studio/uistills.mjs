// Renders every UI still (src/ui/states.tsx) to ../renders/ui/<id>.png for the 3D phone screen.
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "path"; import fs from "fs";
const ids = process.argv.slice(2);
const out = path.resolve("../renders/ui"); fs.mkdirSync(out, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
for (const id of ids) {
  const composition = await selectComposition({ serveUrl, id: "UI", inputProps: { id }, browserExecutable });
  await renderStill({ composition, serveUrl, output: path.join(out, id + ".png"), inputProps: { id }, browserExecutable, imageFormat: "png" });
  console.log("ui", id);
}
