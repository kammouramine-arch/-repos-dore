// Optional offline utility. Install Playwright without saving it to package.json.
// Start AMYN first. Requires FFmpeg on PATH and Edge on Windows.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
(async () => {
  const browser = await chromium.launch({ channel: process.platform === 'win32' ? 'msedge' : undefined, headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 3840, height: 2160 }, deviceScaleFactor: 1 });
    await page.goto(process.env.AMYN_RENDER_URL || 'http://127.0.0.1:3008/3d/tour.html?render=1');
    await page.waitForFunction(() => window.amynScene);
    const font = process.platform === 'win32' ? 'C\\:/Windows/Fonts/arial.ttf' : '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
    const filter = `scale=1920:1080:flags=lanczos,drawbox=x=0:y=1000:w=iw:h=80:color=0x16271c@0.65:t=fill,drawtext=fontfile='${font}':text='AMYN 3D   /   ATELIER LUMIERE   /   FICTIONAL CONCEPT':fontcolor=0xeee9dc:fontsize=19:x=54:y=1032`;
    const file = path.resolve(scriptDirectory, '../public/3d/walkthrough.mp4');
    const encoder = spawn('ffmpeg', ['-y','-f','image2pipe','-vcodec','mjpeg','-framerate','24','-i','pipe:0','-vf',filter,'-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart','-an',file], { stdio: ['pipe','ignore','pipe'] });
    let log = '';
    encoder.stderr.on('data', d => { log += d; });
    const done = new Promise((resolve,reject) => { encoder.on('error', reject); encoder.on('exit', code => code === 0 ? resolve() : reject(new Error(log))); });
    for (let frame = 0; frame < 576; frame++) {
      await page.evaluate(t => window.amynScene.film(t), frame / 24);
      const jpeg = await page.screenshot({ type: 'jpeg', quality: 94 });
      if (!encoder.stdin.write(jpeg)) await new Promise(resolve => encoder.stdin.once('drain', resolve));
      if (frame % 96 === 0) console.log(`Rendered ${frame}/576`);
    }
    encoder.stdin.end();
    await done;
    console.log('1920 x 1080 / 24 fps / 24 seconds complete');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
