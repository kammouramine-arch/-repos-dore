#!/usr/bin/env node
// Visual review harness. Loads every screen of the prototype in light and dark, waits for its
// entrance animation, screenshots the phone (2×, JPEG), and writes review/shots/*.jpg + a contact sheet.
//   node doonce/prototype/review/shoot.mjs [screen ...]
// Requires: npm i playwright (Chromium). Console errors fail the run.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const index = 'file://' + path.resolve(here, '..', 'index.html');
const out = path.join(here, 'shots');
fs.mkdirSync(out, { recursive: true });

// [id, settle ms, optional action script run in page before capture]
const SCREENS = [
  ['launch', 700], ['onboarding', 900], ['onboarding-2', 2200, 'ob2'], ['onboarding-3', 2600, 'ob3'], ['onboarding-4', 1400, 'ob4'], ['auth', 500], ['firstrun', 500],
  ['memory', 600], ['memory-empty', 500], ['memory-offline', 500], ['bloom', 900, 'bloom'], ['search', 600], ['results', 1600],
  ['look', 600], ['look-recognised', 2600], ['look-uncertain', 2200], ['look-unknown', 1200], ['look-error', 1200],
  ['teach', 600], ['teach-recording', 6200], ['processing', 5200], ['review', 700], ['review-edit', 700], ['objectCreate', 600], ['save', 3600],
  ['object', 700], ['procedure', 700], ['do', 2900], ['do-handsfree', 900], ['ask', 1200], ['complete', 1900], ['see-original', 1200, 'orig'],
  ['spaces', 600], ['space', 700], ['people', 600], ['people-empty', 500], ['person', 600], ['household', 600], ['share', 600], ['qr', 600],
  ['notifications', 600], ['you', 600], ['settings', 600], ['privacy', 600], ['haptics', 600], ['subscription', 600], ['paywall', 600],
  ['offline', 600], ['error-upload', 600], ['error-generic', 600], ['permission-camera', 600], ['permission-mic', 600], ['permission-notifications', 600],
];
const ACTIONS = {
  ob2: async p => { await p.click('[data-next]'); },
  ob3: async p => { await p.click('[data-next]'); await p.waitForTimeout(300); await p.click('[data-next]'); },
  ob4: async p => { for (let i = 0; i < 3; i++) { await p.click('[data-next]'); await p.waitForTimeout(200); } },
  bloom: async p => { await p.click('[data-center]'); },
  orig: async p => { await p.click('[data-see]'); },
};
const jumpFor = id => ({ 'onboarding-2': 'onboarding', 'onboarding-3': 'onboarding', 'onboarding-4': 'onboarding', bloom: 'memory', 'see-original': 'procedure' }[id] || id);

const only = process.argv.slice(2);
const themes = ['light', 'dark'];
const browser = await chromium.launch();
const errors = [];
const shots = [];
for (const [id, settle, action] of SCREENS) {
  if (only.length && !only.includes(id)) continue;
  for (const theme of themes) {
    const page = await browser.newPage({ viewport: { width: 700, height: 900 }, deviceScaleFactor: 2, colorScheme: theme });
    page.on('console', m => { if (m.type() === 'error') errors.push(`${id}/${theme}: ${m.text()}`); });
    page.on('pageerror', e => errors.push(`${id}/${theme}: ${e.message}`));
    await page.goto(`${index}#screen=${jumpFor(id)}&theme=${theme}`);
    await page.waitForTimeout(250);
    if (action) await ACTIONS[action](page);
    await page.waitForTimeout(settle);
    const file = path.join(out, `${id}--${theme}.jpg`);
    await page.locator('[data-phone]').screenshot({ path: file, type: 'jpeg', quality: 88 });
    shots.push([id, theme, path.basename(file)]);
    await page.close();
  }
  process.stdout.write(`${id} `);
}
await browser.close();
console.log('\n');

// Contact sheet (HTML) for quick scanning.
const cells = shots.map(([id, theme, f]) => `<figure><img src="shots/${f}" loading="lazy"><figcaption>${id} · ${theme}</figcaption></figure>`).join('');
fs.writeFileSync(path.join(here, 'contact-sheet.html'), `<!doctype html><meta charset="utf-8"><title>DoOnce review</title><style>body{margin:0;background:#1B1C1A;color:#ddd;font:13px Inter,system-ui;padding:24px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:18px}figure{margin:0}img{width:100%;border-radius:12px}figcaption{margin-top:6px;opacity:.7}</style><main>${cells}</main>`);
if (errors.length) { console.error('Console errors:\n' + errors.join('\n')); process.exit(1); }
console.log(`ok: ${shots.length} screenshots → ${out}`);
