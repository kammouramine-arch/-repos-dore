/**
 * Photographie les écrans de démonstration en images (public/visuals).
 *
 *   npm run dev                                   # dans un premier terminal
 *   npm i --no-save playwright-core               # une fois
 *   node scripts/capture-visuals.mjs [id…]        # tous, ou seulement certains
 *
 * Variables : BASE (défaut http://localhost:3000), CHROME (chemin d'un
 * Chromium si Playwright ne le trouve pas).
 */
import { mkdirSync } from "node:fs";

let chromium;
try {
  ({ chromium } = await import("playwright-core"));
} catch {
  console.error("playwright-core est requis : npm i --no-save playwright-core");
  process.exit(1);
}

const BASE = process.env.BASE || "http://localhost:3000";
const wanted = process.argv.slice(2);

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1600, height: 1100 } });
mkdirSync(new URL("../public/visuals/", import.meta.url), { recursive: true });

/* Le catalogue (src/lib/visuals.ts) est la source de vérité. */
const ids = await (await fetch(`${BASE}/capture/list`)).json();
const targets = ids.filter((id) => !wanted.length || wanted.includes(id));

for (const id of targets) {
  const res = await page.goto(`${BASE}/capture/${id}`, { waitUntil: "load" });
  if (!res || res.status() !== 200) {
    console.warn(`✗ ${id} (${res?.status()})`);
    continue;
  }
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const el = page.locator("#capture");
  const out = new URL(`../public/visuals/${id}.jpg`, import.meta.url).pathname;
  await el.screenshot({ path: out, type: "jpeg", quality: 86 });
  console.log(`✓ ${id}`);
}
await browser.close();
