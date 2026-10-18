// QC helper: node labs.mjs <outSheet.jpg> <cols> <scale> Comp@sec Comp@sec ...
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const [out, cols, scale, ...items] = process.argv.slice(2);
const tmp = fs.mkdtempSync("/tmp/claude-0/-home-user--repos-dore/6b76b049-7736-58b3-b2c8-4d7d90c68fc3/scratchpad/labs-");
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const chromiumOptions = { gl: "angle" };
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const files = [];
for (const [i, it] of items.entries()) {
  const [id, sec] = it.split("@");
  const comp = await selectComposition({ serveUrl, id, chromiumOptions, browserExecutable });
  const frame = Math.min(comp.durationInFrames - 1, Math.round(Number(sec) * comp.fps));
  const f = path.join(tmp, `${String(i).padStart(3, "0")}.jpg`);
  await renderStill({ composition: comp, serveUrl, frame, output: f, imageFormat: "jpeg", jpegQuality: 85, chromiumOptions, browserExecutable, scale: Number(scale), timeoutInMilliseconds: 120000 });
  files.push([f, it]);
}
fs.writeFileSync(path.join(tmp, "list.json"), JSON.stringify(files));
execFileSync("python3", ["-c", `
import json,sys
from PIL import Image, ImageDraw
fs=json.load(open(sys.argv[1])); cols=int(sys.argv[2])
ims=[]
for f,lab in fs:
    im=Image.open(f).convert('RGB'); ImageDraw.Draw(im).text((8,8),lab,fill=(255,40,40)); ims.append(im)
w=max(i.size[0] for i in ims); h=max(i.size[1] for i in ims); rows=(len(ims)+cols-1)//cols
S=Image.new('RGB',(w*cols,h*rows),'white')
for k,im in enumerate(ims): S.paste(im,((k%cols)*w,(k//cols)*h))
S.save(sys.argv[3],quality=88); print(sys.argv[3],S.size)
`, path.join(tmp, "list.json"), cols, out], { stdio: "inherit" });
fs.rmSync(serveUrl, { recursive: true, force: true });
fs.rmSync(tmp, { recursive: true, force: true });
